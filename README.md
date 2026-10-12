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
- **Arkadaşa paylaşım:** Paylaş düğmesi, çalan radyoyu ve şarkıyı bir bağlantıyla gönderir (`https://mahsundemir.github.io/frekans-radyolar/?r=<radyo>`). Bağlantı açılınca bir web sayfası gelir: uygulaması olmayan arkadaşın radyoyu tarayıcıda dinler, uygulaması olan "Frekans uygulamasında aç" ile radyoyu uygulamada başlatır (`frekans://radyo/...`). Sayfa yayın adresini yalnızca `stations.json` içindeki kayıttan alır.
- **Dynamic Island (v1, yalnızca gösterim):** Radyo çalarken iPhone'un Dynamic Island'ında ve kilit ekranında canlı etkinlik görünür: kompakt (kısaltma + dalga simgesi), minimal ve genişletilmiş hal (radyo adı, şarkı, sanatçı). Dokununca uygulama açılır. Düğmeler (oynat/duraklat, sonraki) henüz yok. Gerekli: iOS 17 ve Dynamic Island'lı iPhone (14 Pro ve sonrası), kilit ekranı kartı diğer iPhone'larda da çıkar.
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
index.html               Paylaşım sayfası (GitHub Pages): tarayıcıda dinleme + uygulamada aç
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
│  └─ FrekansIsland/     Dynamic Island / kilit ekranı eklentisi (SwiftUI, WidgetKit)
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
- Dynamic Island eklentisi için iPhone uygulamasının en düşük sürümü iOS 17 yapıldı.
- Pod hedefleri iOS 15.1 ve macOS 12'ye yükseltildi (Xcode 27 daha düşüğünü kabul etmiyor).
- iOS 27 UIScene yaşam döngüsünü zorunlu kılıyor, uygulama buna geçirildi.
- Mac uygulaması `LSUIElement` ile yalnızca menü çubuğunda çalışır.
- macOS'ta ses dalgası yüksekliği JS sürücüsüyle animasyonlanır (native sürücülü transform macOS'ta güvenilir değil).
- Depo adı `frekans-radyolar` olarak kaldı. Raw adres bozulmasın diye değiştirilmedi.

## Henüz yapılmayanlar

- **Mac menü çubuğu panelinin açılması gerçek menü çubuğunda doğrulanmadı.** Panelin içeriği (oynatma, şarkı bilgisi, favoriler, arama, paylaşım, bağlantıyla açma) normal pencerede doğrulandı. Menü çubuğu simgesine tıklayınca açıldığını sen de kontrol et. Panel hover'da değil tıklamada açılır.
- **Dynamic Island'ın görünüşü doğrulanmadı.** Eklenti derleniyor, uygulamaya gömülüyor ve canlı etkinlik başarıyla başlıyor (günlükten doğrulandı). Ancak simülatör ekran görüntüsü Dynamic Island'ı çizmediği için tasarımın nasıl göründüğünü görmedik. Genişletilmiş hal uzun basarak açılır, o da denenmedi.
- **Dynamic Island düğmeleri:** Oynat/duraklat, sonraki ve hızlı radyo seçimi (tasarımdaki 5 radyo) yok. Bunlar iOS 17 `LiveActivityIntent` ile yapılabilir, sonraki adım.
- **Otomatik açılan paylaşım bağlantısı:** Şu an bağlantı bir web sayfası açıyor, uygulamada açmak için sayfadaki düğmeye dokunmak gerekiyor. iMessage ve benzerlerinde bağlantıya dokununca doğrudan uygulamanın açılması (universal link) için gerçek bir Apple Developer ekip kimliği ve alan adı dosyası lazım. Paket kimliğiyle birlikte yapılacak.
- **Paylaşım sayfası gerçek tarayıcıda denenmedi.** Sayfa yayında ve komut dizisi sözdizimi doğrulandı. Çalma, tarayıcıya ve yayının CORS ayarına bağlı: HLS yayınları Safari dışında hls.js ile açılır, bazı yayınlar tarayıcıda açılmayabilir (sayfa o durumda uygulamayı öneriyor).
- **Uyku zamanlayıcı** düğmeleri tasarımda var, henüz çalışmıyor.
- **Yazı tipi:** Tasarımdaki Bricolage Grotesque yazı tipi henüz uygulamaya eklenmedi, sistem yazı tipi kullanılıyor.
- **Kimlik ve imzalama:** Paket kimliği şablondaki `org.reactjs.native.example.Frekans` (eklenti: `...Frekans.FrekansIsland`). Yayına çıkmadan önce kendi kimliğinle ve Apple Developer hesabınla değiştirilmeli. Gerçek cihazda Live Activity için imzalama gerekir. Mac uygulaması Debug derlemesi, imzalı/noter onaylı sürüm yok.
- **Test kapsamı:** Jest testleri filtre, paylaşım metni ve liste şemasını kapsıyor. Ses çalma gerçek yayınla elle doğrulandı (iOS simülatörü ve Mac'te canlı şarkı bilgisi göründü). Diğer radyoların dinlenebilirliği tek tek elle doğrulanmadı.
