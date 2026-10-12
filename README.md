# Frekans radyo listesi

Frekans uygulamasının radyo listesi. Uygulama `stations.json` dosyasını çeker; dosya güncellenince liste uygulamayı güncellemeden değişir.

Yapı: `languages[]` (dil) > `categories[]` (kategori) > `stations[]` (radyo).

- `version`: listeyi değiştirmek için her güncellemede artırılır.
- `streamUrl`: radyonun doğrudan yayın adresi.
- `metadata`: `icy` (yayının kendi "şu an çalıyor" bilgisi) veya `none`.

Ham dosya adresi: https://raw.githubusercontent.com/mahsundemir/frekans-radyolar/main/stations.json
