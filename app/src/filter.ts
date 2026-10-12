import type {FlatStation} from './types';

// Türkçe harflere duyarsız arama: "nagme" → "Nağme", "super" → "Süper"
export function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export const FAVORITES = 'fav';
export const ALL = 'all';

export function filterStations(
  list: FlatStation[],
  opts: {category: string; query: string; favorites: string[]},
): FlatStation[] {
  const q = norm(opts.query.trim());
  return list.filter(s => {
    if (opts.category === FAVORITES && !opts.favorites.includes(s.id)) {
      return false;
    }
    if (
      opts.category !== ALL &&
      opts.category !== FAVORITES &&
      s.categoryId !== opts.category
    ) {
      return false;
    }
    return !q || norm(s.name).includes(q) || norm(s.categoryName).includes(q);
  });
}
