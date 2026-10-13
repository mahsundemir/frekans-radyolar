# Mağaza ekran görüntüleri

Frekans'ın App Store ekran görüntüleri. Gerçek uygulamanın simülatör çekimleri, markaya uygun zemin ve Türkçe başlıklarla.

## Hazır dosyalar

| Klasör | Boyut | Ne için |
| --- | --- | --- |
| `ios/6.9/` | 1320 × 2868 | iPhone 6,9" (App Store Connect'te ana boyut) |
| `ios/6.5/` | 1284 × 2778 | iPhone 6,5" (isteğe bağlı) |

RGB, saydamlık yok. Uygulama yalnızca iPhone'a hedefli (`TARGETED_DEVICE_FAMILY = 1`), iPad ekran görüntüsü gerekmez.

Yükleme sırası (ilk üçü aramada görünür, bu yüzden en çekici olanlar başta):

1. `01-canli-radyo`: "Türkiye'nin radyoları tek dokunuşta"
2. `02-calan-sarki`: "Şu an çalan şarkıyı gör"
3. `03-renkli`: "Her tür kendi renginde"
4. `04-liste`: "Tüm radyolar tek listede"
5. `05-favoriler`: "Favorilerin hep elinin altında"
6. `06-uyku`: "Müzikle uykuya dal"

## Android

**Yok.** Projede Android uygulaması yok (`app/android` bulunmuyor), yalnızca iOS ve macOS var. Google Play, ekran görüntülerinin gerçek uygulamayı göstermesini ister. iPhone görüntülerini Android çerçevesine koymak bunu ihlal eder, o yüzden yapılmadı. Android sürümü derlenince:

- Play telefon ekran görüntüsü: en az 2 adet, JPEG ya da 24 bit PNG, kısa kenar en az 320 px, kenar oranı 2:1'i geçmemeli (örn. 1080 × 1920).
- Öne çıkan grafik: 1024 × 500 (zorunlu).

`compose.py` boyutları ve slaytları tek yerden tanımlıyor; Android çekimleri `raw/android/` altına konunca aynı düzenle üretilebilir. Güncel ölçüleri Play Console'dan doğrula.

## Yeniden üretmek

Ham görüntüler `raw/ios/` içinde. Yalnızca görünümü değiştirmek (başlık, renk, sıra) için:

```sh
python3 compose.py            # tümü
python3 compose.py 03 uyku    # adında geçenler
```

Çekimi yenilemek için (uygulama değişince): `capture.sh` Release derlemesini simülatöre kurar, durum çubuğunu 9:41'e sabitler, radyoyu `frekans://` bağlantısıyla başlatır ve görüntü alır.

```sh
cd app/ios && xcodebuild -workspace Frekans.xcworkspace -scheme Frekans -configuration Release \
  -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath build build
cd ../../store && ./capture.sh <UDID>      # çekim listesi: capture-list.sh
```

Simülatörde dokunma otomasyonu olmadığı için ekran durumu (liste, uyku sayacı, favoriler) geçici bir yardımcıyla ayarlanıyor: `harness/shotHarness.ts.txt` dosyasını `app/src/shotHarness.ts` olarak kopyala, `App.tsx`'te `PhoneApp` içine `useShot` / `useShotFavs`, `PhoneScreen` ve `StationsScreen`'e ilgili durum kancalarını ekle (dosyanın başındaki tipe bak). Çekimden sonra sil, uygulamaya kalıcı eklenmemeli.

Notlar:
- `simctl openurl` bir "Açılsın mı?" penceresi çıkarır ve görüntüye girer, bu yüzden bağlantı `frekans.pendingURL` ile açılışta verilir.
- Şarkı adları canlı yayından geliyor, her çekimde farklı olur.
- Dynamic Island simülatör görüntüsünde her zaman çizilmiyor; `compose.py` hepsine aynısını ekler.
