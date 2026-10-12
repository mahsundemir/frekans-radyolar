import {ALL, FAVORITES, filterStations, norm} from '../src/filter';
import type {FlatStation} from '../src/types';

const mk = (id: string, name: string, categoryId: string, categoryName: string) =>
  ({id, name, categoryId, categoryName} as FlatStation);

const list = [
  mk('super-fm', 'Süper FM', 'pop', 'Pop'),
  mk('trt-nagme', 'TRT Nağme', 'halk', 'Halk & Sanat'),
  mk('ntv-radyo', 'NTV Radyo', 'haber', 'Haber'),
];

test('arama Türkçe harflere duyarsız', () => {
  expect(norm('IŞIK')).toBe('isik');
  const r = filterStations(list, {category: ALL, query: 'nagme', favorites: []});
  expect(r.map(s => s.id)).toEqual(['trt-nagme']);
  expect(
    filterStations(list, {category: ALL, query: 'SUPER', favorites: []}).length,
  ).toBe(1);
});

test('kategori ve favori filtresi', () => {
  expect(
    filterStations(list, {category: 'haber', query: '', favorites: []}).length,
  ).toBe(1);
  const fav = filterStations(list, {
    category: FAVORITES,
    query: '',
    favorites: ['super-fm', 'ntv-radyo'],
  });
  expect(fav.map(s => s.id)).toEqual(['super-fm', 'ntv-radyo']);
});
