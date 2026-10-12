import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppState, NativeEventEmitter, NativeModules} from 'react-native';
import {loadJson, saveJson} from './storage';
import {bundledStations, fetchStations, flatten} from './stations';
import type {
  FlatStation,
  NowPlaying,
  PlayerStatus,
  StationsFile,
} from './types';

const Native = NativeModules.FrekansAudio;
const emitter = Native ? new NativeEventEmitter(Native) : null;

const PREFS_KEY = 'frekans.prefs';
const STATIONS_KEY = 'frekans.stations';
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

type Prefs = {
  enabled: Record<string, boolean>;
  favorites: string[];
  volume: number;
  lastId: string | null;
};

type Ctx = {
  file: StationsFile;
  stations: FlatStation[]; // etkin radyolar
  all: FlatStation[];
  enabled: Record<string, boolean>;
  favorites: string[];
  current: FlatStation | null;
  status: PlayerStatus;
  error: string | null;
  meta: NowPlaying | null;
  history: NowPlaying[];
  volume: number;
  refreshing: boolean;
  sleepEnd: number | null;
  setSleep: (minutes: number) => void;
  select: (s: FlatStation) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setEnabled: (id: string, on: boolean) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  refresh: () => Promise<void>;
};

const PlayerCtx = createContext<Ctx>(null as unknown as Ctx);
export const usePlayer = () => useContext(PlayerCtx);

export function PlayerProvider({children}: {children: React.ReactNode}) {
  const [file, setFile] = useState<StationsFile>(bundledStations());
  const [enabled, setEnabledMap] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [current, setCurrent] = useState<FlatStation | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NowPlaying | null>(null);
  const [history, setHistory] = useState<NowPlaying[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sleepEnd, setSleepEnd] = useState<number | null>(null);
  const metaRef = useRef<NowPlaying | null>(null);
  const lastRefresh = useRef(0);
  const fileRef = useRef(file);
  fileRef.current = file;

  const all = useMemo(() => flatten(file), [file]);
  const allRef = useRef(all);
  allRef.current = all;
  const stations = useMemo(
    () => all.filter(s => enabled[s.id] !== false),
    [all, enabled],
  );

  // Açılışta kayıtlı ayarları ve önbellekteki listeyi yükle
  useEffect(() => {
    (async () => {
      const [prefs, cached] = await Promise.all([
        loadJson<Prefs>(PREFS_KEY),
        loadJson<StationsFile>(STATIONS_KEY),
      ]);
      let list = fileRef.current;
      if (cached && cached.version > list.version) {
        list = cached;
        setFile(cached);
      }
      Native?.setVolume(
        typeof prefs?.volume === 'number' ? prefs.volume : 0.8,
      );
      if (prefs) {
        setEnabledMap(prefs.enabled ?? {});
        setFavorites(prefs.favorites ?? []);
        if (typeof prefs.volume === 'number') {
          setVolumeState(prefs.volume);
        }
        if (prefs.lastId) {
          const last = flatten(list).find(s => s.id === prefs.lastId);
          if (last) {
            setCurrent(last);
          }
        }
      }
      setHydrated(true);

      // Uygulama paylaşılan bir bağlantıyla açıldıysa native taraf çalmaya başlamış olabilir
      const playing = await Native?.getCurrent?.();
      if (playing?.id) {
        adopt({id: playing.id, name: playing.name, url: playing.url ?? ''});
      }
    })();
  }, []);

  // Ayarlar değişince kaydet
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveJson(PREFS_KEY, {
      enabled,
      favorites,
      volume,
      lastId: current?.id ?? null,
    } satisfies Prefs);
  }, [hydrated, enabled, favorites, volume, current]);

  const select = useCallback((s: FlatStation) => {
    setCurrent(s);
    setMeta(null);
    metaRef.current = null;
    setHistory([]);
    setError(null);
    setStatus('buffering');
    Native?.play(s.streamUrl, s.name, s.id, s.color, s.short);
  }, []);

  // Native tarafta zaten çalan (paylaşılan bağlantıyla açılan) radyoyu arayüze yansıt; yeniden çalmaz
  const adopt = useCallback((req: {id: string; name: string; url: string}) => {
    const known = allRef.current.find(s => s.id === req.id);
    const station: FlatStation = known ?? {
      id: req.id,
      name: req.name,
      short: req.name.slice(0, 2).toLocaleUpperCase('tr'),
      streamUrl: req.url,
      metadata: 'none',
      color: '#FF5B4A',
      ink: '#17141F',
      categoryId: 'shared',
      categoryName: 'Paylaşılan',
      languageCode: 'tr',
    };
    Native?.setStyle?.(station.color, station.short);
    setCurrent(station);
    setMeta(null);
    metaRef.current = null;
    setHistory([]);
    setError(null);
    setStatus('buffering');
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
    } else if (status === 'idle' || status === 'error') {
      select(current); // kayıtlı son radyo ya da hata sonrası yeniden dene
    } else {
      Native?.resume();
    }
  }, [current, status, stations, select]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    Native?.setVolume(v);
  }, []);

  const setSleep = useCallback((minutes: number) => {
    Native?.startSleepTimer(minutes);
    setSleepEnd(minutes > 0 ? Date.now() + minutes * 60000 : null);
  }, []);

  const setEnabled = useCallback((id: string, on: boolean) => {
    setEnabledMap(m => ({...m, [id]: on}));
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(f => (f.includes(id) ? f.filter(x => x !== id) : [...f, id]));
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchStations(fileRef.current);
      lastRefresh.current = Date.now();
      if (JSON.stringify(next) !== JSON.stringify(fileRef.current)) {
        setFile(next);
        saveJson(STATIONS_KEY, next);
      }
    } catch {
      // internet yoksa mevcut liste kalır
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Açılışta, uygulama öne gelince (en az 30 dk sonra) ve 6 saatte bir listeyi güncelle
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_EVERY_MS);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && Date.now() - lastRefresh.current > 30 * 60 * 1000) {
        refresh();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  // Dynamic Island'daki hızlı radyo seçimi: favoriler önce, kalanı listeden, en çok 5
  useEffect(() => {
    const favs = favorites
      .map(id => stations.find(s => s.id === id))
      .filter((s): s is FlatStation => !!s);
    const rest = stations.filter(s => !favorites.includes(s.id));
    Native?.setQuick?.(
      [...favs, ...rest].slice(0, 5).map(s => ({
        id: s.id,
        short: s.short,
        color: s.color,
      })),
    );
  }, [favorites, stations]);

  // Native olaylar
  const stepRef = useRef(step);
  stepRef.current = step;
  const adoptRef = useRef(adopt);
  adoptRef.current = adopt;
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    if (!emitter) {
      return;
    }
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
      emitter.addListener('onSleep', (e: any) => {
        setSleepEnd(e.endsAt > 0 ? e.endsAt : null);
      }),
      emitter.addListener('onPlayRequest', (e: any) => {
        adoptRef.current({id: e.id, name: e.name, url: e.url});
      }),
      emitter.addListener('onRemote', (e: any) => {
        if (e.command === 'station') {
          const s = allRef.current.find(x => x.id === e.id);
          if (s) {
            selectRef.current(s);
          }
          return;
        }
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
    favorites,
    current,
    status,
    error,
    meta,
    history,
    volume,
    refreshing,
    sleepEnd,
    setSleep,
    select,
    toggle,
    next: () => step(1),
    prev: () => step(-1),
    setVolume,
    setEnabled,
    isFavorite,
    toggleFavorite,
    refresh,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
