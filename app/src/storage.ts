import {NativeModules} from 'react-native';

const Native = NativeModules.FrekansAudio;

// Küçük JSON deposu (iOS ve macOS'ta NSUserDefaults). Hata olursa uygulama çalışmaya devam eder.
export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw: string | null = (await Native?.storageGet(key)) ?? null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    Native?.storageSet(key, JSON.stringify(value));
  } catch {
    // kaydedilemezse sessizce geç
  }
}
