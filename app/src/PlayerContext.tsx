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
import {inkFor} from './theme';
import {bundledStations, fetchStations, flatten} from './stations';
import {detectLanguage, localeOf, translate} from './i18n';
import type {Key, Vars} from './i18n';
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
  saver?: boolean;
  colors?: Record<string, string>;
  language?: string;
};

type Ctx = {
  file: StationsFile;
  language: string; // yayın dili (stations.json dil kodu); arayüz dili de buna göre
  setLanguage: (code: string) => void;
  t: (key: Key, vars?: Vars) => string;
  stations: FlatStation[]; // seçili yayın dilindeki etkin radyolar
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
  quick: FlatStation[]; // adadaki hızlı seçim: favoriler önce, en çok 5
  colorOf: Record<string, string>; // radyo başına seçilen renkler
  colorTarget: {id: string; fresh: boolean} | null; // renk seçici açık olan radyo
  pickColor: (id: string) => void;
  closeColorPicker: () => void;
  setStationColor: (id: string, hex: string | null) => void;
  saver: boolean; // pil tasarrufu: animasyonlar ve canlı etkinlik güncellemeleri kapalı
  setSaver: (on: boolean) => void;
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
  const [currentRaw, setCurrent] = useState<FlatStation | null>(null);
  const [colorOf, setColorOf] = useState<Record<string, string>>({});
  const [colorTarget, setColorTarget] = useState<{id: string; fresh: boolean} | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NowPlaying | null>(null);
  const [history, setHistory] = useState<NowPlaying[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sleepEnd, setSleepEnd] = useState<number | null>(null);
  const [saver, setSaverState] = useState(false);
  const [language, setLanguageState] = useState<string>(detectLanguage());
  const languageRef = useRef(language);
  languageRef.current = language;
  const metaRef = useRef<NowPlaying | null>(null);
  const lastRefresh = useRef(0);
  const fileRef = useRef(file);
  fileRef.current = file;

  // Kullanıcının seçtiği renkler kategori renginin yerine geçer
  const all = useMemo(
    () =>
      flatten(file).map(s =>
        colorOf[s.id] ? {...s, color: colorOf[s.id], ink: inkFor(colorOf[s.id])} : s,
      ),
    [file, colorOf],
  );
  const current = useMemo(
    () => (currentRaw ? all.find(s => s.id === currentRaw.id) ?? currentRaw : null),
    [currentRaw, all],
  );
  const allRef = useRef(all);
  allRef.current = all;
  // Listede yalnızca seçili yayın dilinin radyoları gezilir (önceki/sonraki, hızlı seçim, ana ekran)
  const stations = useMemo(
    () => all.filter(s => s.languageCode === language && enabled[s.id] !== false),
    [all, enabled, language],
  );
  const t = useCallback(
    (key: Key, vars?: Vars) => translate(language, key, vars),
    [language],
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
        setSaverState(!!prefs.saver);
        setColorOf(prefs.colors ?? {});
        Native?.setEnergySaver?.(!!prefs.saver);
        if (typeof prefs.volume === 'number') {
          setVolumeState(prefs.volume);
        }
        if (prefs.lastId) {
          const last = flatten(list).find(s => s.id === prefs.lastId);
          if (last) {
            setCurrent(last);
            // Dil seçimi kaydedilmemişse (eski sürümden gelen), son dinlenen radyonun dili
            if (!prefs.language) {
              setLanguageState(last.languageCode);
            }
          }
        }
        if (prefs.language && list.languages.some(l => l.code === prefs.language)) {
          setLanguageState(prefs.language);
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
      saver,
      colors: colorOf,
      language,
    } satisfies Prefs);
  }, [hydrated, enabled, favorites, volume, current, saver, colorOf, language]);

  const select = useCallback((s: FlatStation) => {
    setLanguageState(s.languageCode); // başka dilden bir radyo (ör. paylaşılan bağlantı) dili de getirir
    setCurrent(s);
    setMeta(null);
    metaRef.current = null;
    setHistory([]);
    setError(null);
    setStatus('buffering');
    Native?.play(s.streamUrl, s.name, s.id, s.color, s.short, s.logo ?? '');
  }, []);

  // Native tarafta zaten çalan (paylaşılan bağlantıyla açılan) radyoyu arayüze yansıt; yeniden çalmaz
  const adopt = useCallback((req: {id: string; name: string; url: string}) => {
    const known = allRef.current.find(s => s.id === req.id);
    const station: FlatStation = known ?? {
      id: req.id,
      name: req.name,
      short: req.name.slice(0, 2).toLocaleUpperCase(localeOf(languageRef.current)),
      streamUrl: req.url,
      metadata: 'none',
      color: '#FF5B4A',
      ink: '#17141F',
      categoryId: 'shared',
      categoryName: translate(languageRef.current, 'sharedCategory'),
      languageCode: languageRef.current,
    };
    Native?.setStyle?.(station.color, station.short, station.logo ?? '');
    setLanguageState(station.languageCode);
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
      // Çalan radyo seçili dilde değilse (dil değişti) yeni dilin başından/sonundan başla
      const n = i < 0 ? (dir > 0 ? 0 : stations.length - 1) : (i + dir + stations.length) % stations.length;
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

  const setSaver = useCallback((on: boolean) => {
    setSaverState(on);
    Native?.setEnergySaver?.(on);
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

  const favRef = useRef(favorites);
  favRef.current = favorites;
  const toggleFavorite = useCallback((id: string) => {
    const adding = !favRef.current.includes(id);
    setFavorites(f => (f.includes(id) ? f.filter(x => x !== id) : [...f, id]));
    if (adding) {
      setColorTarget({id, fresh: true}); // favoriye eklerken renk seçilebilir
    }
  }, []);

  const pickColor = useCallback((id: string) => setColorTarget({id, fresh: false}), []);
  const closeColorPicker = useCallback(() => setColorTarget(null), []);
  const setStationColor = useCallback((id: string, hex: string | null) => {
    setColorOf(m => {
      const next = {...m};
      if (hex) {
        next[id] = hex;
      } else {
        delete next[id];
      }
      return next;
    });
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

  // Dynamic Island / Mac adasındaki hızlı radyo seçimi: favoriler önce, kalanı listeden, en çok 5
  const quick = useMemo(() => {
    const favs = favorites
      .map(id => stations.find(s => s.id === id))
      .filter((s): s is FlatStation => !!s);
    const rest = stations.filter(s => !favorites.includes(s.id));
    return [...favs, ...rest].slice(0, 5);
  }, [favorites, stations]);
  useEffect(() => {
    Native?.setQuick?.(
      quick.map(s => ({id: s.id, short: s.short, color: s.color, logo: s.logo ?? ''})),
    );
  }, [quick]);

  // Araç ekranları (CarPlay / Android Auto) uygulama çalışmasa da radyoları listeleyebilsin diye
  // liste ve favoriler native tarafa da yazılır; orada kalıcı saklanır.
  useEffect(() => {
    Native?.setCatalog?.(
      JSON.stringify({
        favorites,
        stations: stations.map(s => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
          category: s.categoryName,
          logo: s.logo ?? '',
          url: s.streamUrl,
        })),
      }),
    );
  }, [stations, favorites]);

  // Çalan radyonun rengi değişirse canlı etkinlik de güncellensin
  useEffect(() => {
    if (current) {
      Native?.setStyle?.(current.color, current.short, current.logo ?? '');
    }
  }, [current?.color]); // eslint-disable-line react-hooks/exhaustive-deps

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
    quick,
    colorOf,
    colorTarget,
    pickColor,
    closeColorPicker,
    setStationColor,
    saver,
    setSaver,
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
