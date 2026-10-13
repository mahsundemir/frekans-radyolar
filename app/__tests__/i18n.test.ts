import {translate, uiLang, UI_LANGS} from '../src/i18n';
import {bundledStations} from '../src/stations';
import {shareMessage} from '../src/share';
import {norm} from '../src/filter';
import type {FlatStation} from '../src/types';

const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

test('her dilde aynı değişkenler (örn. {name}) kullanılır ve metin boş değildir', () => {
  const sample: Record<string, string> = {};
  for (const lang of UI_LANGS) {
    expect(translate(lang, 'share').length).toBeGreaterThan(0);
    for (const k of ['favAddNamed', 'colorPick', 'sleepRemaining', 'shareSong', 'shareCta', 'minutesShort'] as const) {
      expect(vars(translate(lang, k))).toBe(vars(translate('tr', k)));
    }
    sample[lang] = translate(lang, 'liveBadge');
  }
  expect(sample.en).toBe('LIVE');
  expect(sample.ru).toBe('ЭФИР');
});

test('çevirisi olmayan yayın dili (Kürtçe) Türkçe arayüze düşer', () => {
  expect(uiLang('ku')).toBe('tr');
  expect(translate('ku', 'back')).toBe('Geri');
  expect(translate('de', 'back')).toBe('Zurück');
});

test('stations.json: her dilin kategorisi var, kategori kimlikleri benzersiz, diller arayüzde karşılığı olan dillerdir', () => {
  const file = bundledStations();
  const codes = file.languages.map(l => l.code);
  for (const c of ['tr', 'en', 'es', 'ar', 'de', 'fr', 'ru']) {
    expect(codes).toContain(c);
  }
  const catIds = file.languages.flatMap(l => l.categories.map(c => c.id));
  expect(new Set(catIds).size).toBe(catIds.length);
  for (const l of file.languages) {
    expect(l.name.length).toBeGreaterThan(0);
    expect(l.categories.length).toBeGreaterThan(0);
    for (const cat of l.categories) {
      expect(cat.stations.length).toBeGreaterThan(0);
    }
  }
});

test('paylaşım metni radyonun diliyle yazılır', () => {
  const st = {id: 'en-bbc', name: 'BBC World Service', languageCode: 'en'} as FlatStation;
  expect(shareMessage(st, null)).toContain("I'm listening to BBC World Service.");
  expect(shareMessage(st, null, 'de')).toContain('Ich höre gerade BBC World Service.');
});

test('arama aksan ve Arapça harekelere duyarsız', () => {
  expect(norm('Café del Mar')).toBe('cafe del mar');
  expect(norm('Münchën')).toBe('munchen');
  expect(norm('نَجوم')).toBe(norm('نجوم'));
});
