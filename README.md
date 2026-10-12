# Frekans radyo listesi

Frekans uygulamasının radyo listesi. Uygulama `stations.json` dosyasını çeker; dosya güncellenince liste uygulamayı güncellemeden değişir.

Yapı: `languages[]` (dil) > `categories[]` (kategori) > `stations[]` (radyo).

- `version`: listeyi değiştirmek için her güncellemede artırılır.
- `streamUrl`: radyonun doğrudan yayın adresi.
- `metadata`: `icy` (yayın akışının kendi "şu an çalıyor" bilgisi), `hls` (HLS yayını; bilgi varsa ID3 etiketinden okunur) veya `none` (bilgi yok, radyo adı gösterilir).
- Tüm adresler `https`. Her adres eklenirken test edilir; bağlantı kurulup ses verisi geliyor mu diye bakılır. Bazı yayınlar (özellikle TRT) Türkiye dışından açılmayabilir.

Ham dosya adresi: https://raw.githubusercontent.com/mahsundemir/frekans-radyolar/main/stations.json
