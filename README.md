# Frekans radyolar

[Frekans](https://mahsundemir.github.io/frekans-radyolar/) uygulamasının radyo listesi, paylaşım sayfası ve gizlilik politikası. Uygulamanın kaynak kodu başka (özel) bir depoda tutulur; bu depo yalnızca herkese açık veriyi içerir.

| Dosya | Ne işe yarar |
|---|---|
| [`stations.json`](stations.json) | Radyo listesi. Uygulama bunu `https://raw.githubusercontent.com/mahsundemir/frekans-radyolar/main/stations.json` adresinden çeker. |
| [`index.html`](index.html) | Paylaşım sayfası (GitHub Pages): tarayıcıda dinleme ve uygulamada aç. |
| [`privacy.html`](privacy.html) | Gizlilik politikası. |

## stations.json

Yedi dilde radyo içerir: Türkçe, İngilizce, İspanyolca, Arapça, Almanca, Fransızca, Rusça (ve 2 Kürtçe radyo). Yayın dili seçilince uygulamanın dili de değişir.

```
version, updatedAt
└─ languages[]   code, name
   └─ categories[]   id, name, color
      └─ stations[]   id, name, short, logo (isteğe bağlı), streamUrl, metadata
```

- `version`: Listeyi değiştirdiğinde artır. Uygulama eski sürümü yeni sürümün üzerine yazmaz.
- `id`: Dosya genelinde benzersiz. Kategori kimlikleri de benzersiz (Türkçe dışındakiler dil koduyla başlar: `en-pop`).
- `streamUrl`: Doğrudan yayın adresi, hepsi `https`.
- `metadata`: `icy`, `hls` veya `none`.
- `logo`: İsteğe bağlı `https` adresi. Yoksa ya da açılmazsa `short` (baş harfler) görünür.

Radyo eklerken adresin açıldığını kontrol et:

```sh
curl -sIL -m 10 -H "Icy-MetaData: 1" "<streamUrl>" | head
```

Adresler eklenirken test edildi (bağlantı kuruluyor ve ses verisi geliyor). Bu, yayının o radyo olduğunu ya da her ülkeden açılacağını doğrulamaz; yayın adresleri zamanla değişebilir.
