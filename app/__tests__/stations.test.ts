import {bundledStations, flatten} from '../src/stations';
import {inkFor} from '../src/theme';

test('stations.json: her radyonun https adresi ve benzersiz kimliği var', () => {
  const all = flatten(bundledStations());
  expect(all.length).toBeGreaterThan(0);
  const ids = new Set(all.map(s => s.id));
  expect(ids.size).toBe(all.length);
  for (const s of all) {
    expect(s.streamUrl.startsWith('https://')).toBe(true);
  }
});

test('zemin rengine göre yazı rengi seçilir', () => {
  expect(inkFor('#FF5B4A')).toBe('#17141F'); // mercan: koyu yazı
  expect(inkFor('#6A47FF')).toBe('#FFFFFF'); // mor: beyaz yazı
});
