# Frekans

Türkiye'deki popüler online radyoları dinleten, minimal ve renkli bir radyo uygulaması. Mac'te menü çubuğundan açılan bir panel, iPhone'da tam ekran bir oynatıcı olarak çalışır. Radyo listesi bu depodaki [`stations.json`](stations.json) dosyasından gelir. Dosya güncellenince uygulama güncellenmeden liste değişir.

Bu proje Claude (yapay zekâ ajanı) ile birlikte geliştirildi. Tasarım, radyo araştırması ve kod aynı çalışmanın parçası. Aşağıda ne yapıldığı ve ne yapılmadığı açıkça yazıyor.

## Neler var

- **Oynatıcı:** Radyonun canlı yayını, arka planda çalma, uzaktan kontrol (kulaklık ve kilit ekranı tuşları: sonraki, önceki, oynat/duraklat).
- **Şu an çalan şarkı:** Yayının kendi bilgisinden (ICY ve HLS ID3) okunur ve ekranda gösterilir. Bilgi vermeyen radyolarda radyo adı görünür.
- **Ses dalgaları:** Çalarken hareket eden, duraklatınca düzleşen dalga. Gerçek ses analizi değil, çalma durumuna bağlı animasyon.
- **Renkli tasarım:** Her kategorinin kendi rengi var. Radyo değişince ekran o rengin tonuna geçer.
- **Arama:** Radyo listesinin üzerinde arama. Türkçe harflere duyarsız ("nagme" yazınca "Nağme" bulunur).
- **Favoriler:** Kalp simgesiyle favori ekleme, "Favoriler" filtresi ve ayarlarda favori grubu. Favoriler, ses seviyesi, kapattığın radyolar ve son dinlenen radyo cihazda saklanır.
- **Arkadaşa paylaşım:** Paylaş düğmesi, çalan radyoyu ve şarkıyı doğrudan yayın adresiyle gönderir. Arkadaşın uygulamaya sahip olmadan da herhangi bir oynatıcıda açabilir.
- **Liste güncelleme:** Açılışta, uygulama öne gelince (30 dakikadan eskiyse) ve 6 saatte bir `stations.json` çekilir. İnternet yoksa önbellekteki ya da uygulamayla gelen kopya kullanılır.
- **Dil > Kategori > Radyolar:** Ayarlar ekranı listeyi bu hiyerarşiyle gösterir. Her radyo ayrı ayrı açılıp kapatılabilir.

## Radyo listesi

[`stations.json`](stations.json) şu an 68 radyo içeriyor: Türkçe (12 kategori) ve Kürtçe (2 kategori).

```
version, updatedAt
└─ languages[]   code, name
   └─ categories[]   id, name, color
      └─ stations[]   id, name, short, streamUrl, metadata
```

- `version`: Listeyi değiştirdiğinde artır. Uygulama eski sürümü yeni sürümün üzerine yazmaz.
- `streamUrl`: Doğrudan yayın adresi. Hepsi `https` (iOS güvenlik kuralı yüzünden).
- `metadata`: `icy`, `hls` veya `none`.
- `color`: Kategori rengi. Yazı rengi (koyu ya da beyaz) renge göre otomatik seçilir.

**Radyo eklemek için** `stations.json` dosyasına ilgili kategorinin altına bir kayıt ekle ve `version` değerini artır. Önce adresin açıldığını kontrol et:

```sh
curl -sIL -m 10 -H "Icy-MetaData: 1" "<streamUrl>" | head
```

Listedeki adreslerin hepsi eklenirken test edildi (bağlantı kuruluyor ve ses verisi geliyor). Bu, yayının gerçekten o radyo olduğunu doğrulamaz. Bazı yayınlar (özellikle TRT) Türkiye dışından açılmayabilir. Radyo yayın adresleri değişebilir, bozulanlar zamanla elenmeli.

Uygulamanın çektiği adres:
`https://raw.githubusercontent.com/mahsundemir/frekans-radyolar/main/stations.json`

GitHub'ın ham dosya servisi dosyayı birkaç dakika önbellekte tutar, değişiklik hemen görünmeyebilir.

## Kod yapısı

```
stations.json            Radyo listesi (uygulamaya da gömülür)
app/                     React Native 0.83 projesi (iOS + macOS)
├─ App.tsx               Platforma göre ekran seçimi
├─ src/
│  ├─ PlayerContext.tsx  Durum: oynatıcı, favoriler, ayarlar, liste güncelleme
│  ├─ stations.ts        Listeyi çekme, doğrulama, düzleştirme
│  ├─ filter.ts          Arama ve kategori/favori filtresi
│  ├─ share.ts           Paylaşım metni
│  ├─ storage.ts         Küçük JSON deposu (native)
│  └─ ui/                MacPanel, PhoneScreen, StationsScreen, Waveform, ...
├─ native/FrekansAudio/  Ortak native modül (Objective-C): AVPlayer, ICY/ID3
│                        bilgisi, uzaktan kontrol, kalıcı depo
├─ ios/                  iPhone uygulaması
├─ macos/                Mac menü çubuğu uygulaması (SwiftUI MenuBarExtra)
└─ patches/              react-native-svg macOS düzeltmesi (patch-package)
```

**Neden kendi ses modülümüz var?** `react-native-track-player` yalnızca iOS ve Android destekliyor, macOS desteği yok. İki platformda aynı davranış için AVPlayer üzerine küçük bir modül yazıldı (iOS ve macOS ortak).

## Çalıştırma

Gereken: Node 20+, Xcode, CocoaPods.

```sh
cd app
npm install                 # patch-package da otomatik çalışır
npx react-native start      # Metro (ayrı bir terminalde açık kalmalı)
```

**iPhone (simülatör):**

```sh
cd ios && pod install
xcodebuild -workspace Frekans.xcworkspace -scheme Frekans -configuration Debug \
  -destination 'platform=iOS Simulator,name=<cihaz adı>' -derivedDataPath build build
```

Sonra uygulamayı simülatöre yükle (`xcrun simctl install booted <Frekans.app>`) ya da `ios/Frekans.xcworkspace` dosyasını Xcode'da açıp çalıştır. Xcode 27'de `npx react-native run-ios` çalışmıyor, çünkü komut Simulator.app'i eski yolda arıyor.

**Mac:**

```sh
pod install --project-directory=macos
xcodebuild -workspace macos/Frekans.xcworkspace -scheme Frekans-macOS -configuration Debug \
  -destination 'platform=macOS' -derivedDataPath macos/build build
open macos/build/Build/Products/Debug/Frekans.app
```

Uygulama Dock'ta görünmez. Menü çubuğundaki dalga simgesine tıklayınca panel açılır. Çıkmak için panelin altındaki "Çık" düğmesi.

Testler: `npm test` (Jest).

**Geliştirme notu (Mac):** Hata ayıklarken panel yerine normal pencere açmak için uygulamayı `FREKANS_DEBUG_WINDOW=1` ile çalıştır (yalnızca Debug derlemesinde).

## Alınan kararlar

- React Native 0.83.10: `react-native-macos` en güncel sürümü (0.83) bu sürüme bağlı.
- Expo kullanılmadı, Community CLI kullanıldı. (`react-native-cli` paketi artık kullanılmıyor, yerini `@react-native-community/cli` aldı.)
- Pod hedefleri iOS 15.1 ve macOS 12'ye yükseltildi (Xcode 27 daha düşüğünü kabul etmiyor).
- iOS 27 UIScene yaşam döngüsünü zorunlu kılıyor, uygulama buna geçirildi.
- Mac uygulaması `LSUIElement` ile yalnızca menü çubuğunda çalışır.
- macOS'ta ses dalgası yüksekliği JS sürücüsüyle animasyonlanır (native sürücülü transform macOS'ta güvenilir değil).
- Depo adı `frekans-radyolar` olarak kaldı. Raw adres bozulmasın diye değiştirilmedi.

## Henüz yapılmayanlar

- **Mac menü çubuğu panelinin açılması gerçek menü çubuğunda doğrulanmadı.** Panelin içeriği (oynatma, şarkı bilgisi, favoriler, arama, paylaşım) normal pencerede doğrulandı. Menü çubuğu simgesine tıklayınca açıldığını sen de kontrol et. Panel, açılış davranışı olarak hover'da değil tıklamada açılır.
- **Dynamic Island başlatılmadı.** Bunun için ayrı bir Swift eklentisi (ActivityKit / Live Activity) gerekiyor. Tasarımı hazır.
- **Uyku zamanlayıcı** düğmeleri tasarımda var, henüz çalışmıyor.
- **Linkle paylaşım:** Şu an yayın adresi paylaşılıyor. Arkadaşın uygulamasında doğrudan o radyoyu açan bir bağlantı (derin bağlantı) yok.
- **Yazı tipi:** Tasarımdaki Bricolage Grotesque yazı tipi henüz uygulamaya eklenmedi, sistem yazı tipi kullanılıyor.
- **Kimlik ve imzalama:** Paket kimliği şablondaki `org.reactjs.native.example.Frekans`. Yayına çıkmadan önce kendi kimliğinle ve Apple Developer hesabınla değiştirilmeli. Mac uygulaması Debug derlemesi, imzalı/noter onaylı sürüm yok.
- **Test kapsamı:** Jest testleri filtre, paylaşım metni ve liste şemasını kapsıyor. Ses çalma gerçek yayınla elle doğrulandı (Süper FM'de canlı şarkı bilgisi iOS simülatöründe ve Mac'te göründü). Diğer radyoların dinlenebilirliği tek tek elle doğrulanmadı.
