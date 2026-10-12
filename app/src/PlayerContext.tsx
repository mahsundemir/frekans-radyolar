import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';
import {bundledStations, fetchStations, flatten} from './stations';
import type {
  FlatStation,
  NowPlaying,
  PlayerStatus,
  StationsFile,
} from './types';

const Native = NativeModules.FrekansAudio;
const emitter = Native ? new NativeEventEmitter(Native) : null;

type Ctx = {
  file: StationsFile;
  stations: FlatStation[]; // etkin radyolar
  all: FlatStation[];
  enabled: Record<string, boolean>;
  current: FlatStation | null;
  status: PlayerStatus;
  error: string | null;
  meta: NowPlaying | null;
  history: NowPlaying[];
  volume: number;
  refreshing: boolean;
  select: (s: FlatStation) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setEnabled: (id: string, on: boolean) => void;
  refresh: () => Promise<void>;
};

const PlayerCtx = createContext<Ctx>(null as unknown as Ctx);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({children}: {children: React.ReactNode}) {
  const [file, setFile] = useState<StationsFile>(bundledStations());
  const [enabled, setEnabledMap] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<FlatStation | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NowPlaying | null>(null);
  const [history, setHistory] = useState<NowPlaying[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  const [refreshing, setRefreshing] = useState(false);
  const metaRef = useRef<NowPlaying | null>(null);

  const all = useMemo(() => flatten(file), [file]);
  const stations = useMemo(
    () => all.filter(s => enabled[s.id] !== false),
    [all, enabled],
  );

  const select = useCallback((s: FlatStation) => {
    setCurrent(s);
    setMeta(null);
    metaRef.current = null;
    setHistory([]);
    setError(null);
    setStatus('buffering');
    Native?.play(s.streamUrl, s.name);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!stations.length) {
        return;
      }
      const i = current ? stations.findIndex(s => s.id === current.id) : -1;
      const n = (i + dir + stations.length) % stations.length;
      select(stations[n]);
    },
    [stations, current, select],
  );

  const toggle = useCallback(() => {
    if (!current) {
      if (stations[0]) {
        select(stations[0]);
      }
      return;
    }
    if (status === 'playing' || status === 'buffering') {
      Native?.pause();
    } else if (status === 'error') {
      select(current);
    } else {
      Native?.resume();
    }
  }, [current, status, stations, select]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    Native?.setVolume(v);
  }, []);

  const setEnabled = useCallback((id: string, on: boolean) => {
    setEnabledMap(m => ({...m, [id]: on}));
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setFile(await fetchStations(file));
    } catch {
      // internet yoksa mevcut liste kalır
    } finally {
      setRefreshing(false);
    }
  }, [file]);

  // Açılışta bir kez listeyi güncelle
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native olaylar
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!emitter) {
      return;
    }
    Native?.setVolume(0.8);
    const subs = [
      emitter.addListener('onState', (e: any) => {
        if (e.state === 'stopped') {
          setStatus('idle');
          return;
        }
        setStatus(e.state);
        setError(e.state === 'error' ? e.message ?? 'Yayın açılamadı' : null);
      }),
      emitter.addListener('onMetadata', (e: any) => {
        const prev = metaRef.current;
        const next = {title: e.title ?? '', artist: e.artist ?? ''};
        if (prev && prev.title === next.title && prev.artist === next.artist) {
          return;
        }
        if (prev) {
          setHistory(h => [prev, ...h].slice(0, 2));
        }
        metaRef.current = next;
        setMeta(next);
      }),
      emitter.addListener('onRemote', (e: any) => {
        stepRef.current(e.command === 'previous' ? -1 : 1);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  const value: Ctx = {
    file,
    stations,
    all,
    enabled,
    current,
    status,
    error,
    meta,
    history,
    volume,
    refreshing,
    select,
    toggle,
    next: () => step(1),
    prev: () => step(-1),
    setVolume,
    setEnabled,
    refresh,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
