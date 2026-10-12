import {shareMessage} from '../src/share';
import type {FlatStation} from '../src/types';

const st = {id: 'super-fm', name: 'Süper FM'} as FlatStation;

test('paylaşım metni şarkı varsa şarkıyı, yoksa sadece radyoyu içerir', () => {
  expect(shareMessage(st, {title: 'Firuze', artist: 'Sezen Aksu'})).toBe(
    'Şu an Süper FM dinliyorum: Sezen Aksu — Firuze\nSen de dinle: https://mahsundemir.github.io/frekans-radyolar/?r=super-fm',
  );
  expect(shareMessage(st, null)).toBe(
    'Şu an Süper FM dinliyorum.\nSen de dinle: https://mahsundemir.github.io/frekans-radyolar/?r=super-fm',
  );
});
