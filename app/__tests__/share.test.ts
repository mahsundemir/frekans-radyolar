import {shareMessage} from '../src/share';
import type {FlatStation} from '../src/types';

const st = {name: 'Süper FM', streamUrl: 'https://example.com/s'} as FlatStation;

test('paylaşım metni şarkı varsa şarkıyı, yoksa sadece radyoyu içerir', () => {
  expect(shareMessage(st, {title: 'Firuze', artist: 'Sezen Aksu'})).toBe(
    'Şu an Süper FM dinliyorum: Sezen Aksu — Firuze\nSen de dinle: https://example.com/s',
  );
  expect(shareMessage(st, null)).toBe(
    'Şu an Süper FM dinliyorum.\nSen de dinle: https://example.com/s',
  );
});
