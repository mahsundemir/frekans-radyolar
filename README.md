# Frekans

Online radyoları dinleten, minimal ve renkli bir radyo uygulaması: Türkçe, İngilizce, İspanyolca, Arapça, Almanca, Fransızca ve Rusça yayın yapan radyolar. Yayın dilini seçince uygulamanın dili de değişir. Mac'te menü çubuğundan açılan bir panel, iPhone'da tam ekran bir oynatıcı olarak çalışır. Radyo listesi bu depodaki [`stations.json`](stations.json) dosyasından gelir. Dosya güncellenince uygulama güncellenmeden liste değişir.

Bu proje Claude (yapay zekâ ajanı) ile birlikte geliştirildi. Tasarım, radyo araştırması ve kod aynı çalışmanın parçası. Aşağıda ne yapıldığı ve ne yapılmadığı açıkça yazıyor.

## Neler var

- **Oynatıcı:** Radyonun canlı yayını, arka planda çalma, uzaktan kontrol (kulaklık ve kilit ekranı tuşları: sonraki, önceki, oynat/duraklat).
- **Şu an çalan şarkı:** Yayının kendi bilgisinden (ICY ve HLS ID3) okunur ve ekranda gösterilir. Bilgi vermeyen radyolarda radyo adı görünür.
- **Mac çentik adası:** Mac'te uygulama ekranın üst ortasında, çentiğin bulunduğu yerde bir "ada" olarak durur. Daralmışken çentiğin solunda çalan radyo ve kayan şarkı adı, sağında ses dalgası görünür. Üzerine gelince tasarımdaki kart açılır: büyük radyo kutusu (logo ya da baş harfler), canlı etiketi, ad, kayan şarkı, kart genişliğinde ses dalgası, ses çubuğu, oynat/önceki/sonraki ve 5 radyoluk hızlı seçim (çalan radyo başta). Sağdaki ok/liste düğmesi aynı kartın altına arama, kategoriler, radyo listesi ve alt çubuğu açar (400 × 568 pt); aynı düğme listeyi kapatır. Menü çubuğundaki simgeye tıklayınca ada açık kalır (sabitlenir), sağ tık menüsünde "Çık" var. Çentiksiz Mac'lerde üst ortada küçük bir hap olarak görünür.
- **Kilit ekranı (iPhone):** Sistemin kendi "Şu an çalıyor" oynatıcısı gösterilmez, yalnızca uygulamanın canlı etkinliği çıkar. Bunun bedeli: kulaklık/kilit ekranı sistem tuşları çalışmaz, kontroller canlı etkinlikteki düğmelerdir.
- **Radyo rengi:** Bir radyoya basılı tutunca (iPhone listesi, Mac listesi ve hızlı seçim, ayarlar) renk seçici açılır; favoriye eklerken de aynı seçici çıkar ("Atla" ile geçilebilir). Seçilen renk radyonun her yerinde kullanılır: rozet, oynatıcı arka planı, ada, canlı etkinlik. "Varsayılana dön" kategori rengini geri getirir. Renkler cihazda saklanır.
- **iPhone ana ekranı:** Tasarımdaki gibi tam renkli oynatıcı. Alttaki küçük daireler favorileri gösterir (favori yoksa radyoları); dokununca o radyo çalar. Sondaki liste dairesine dokununca ya da bu satırı yukarı kaydırınca radyo listesi aşağıdan yukarı kayarak açılır; üstteki seçiciyle Favoriler ve Tümü arasında geçilir, aşağı çekince ya da boşluğa dokununca kapanır.
- **Çalan radyo göstergesi:** Çalan radyonun yanında listelerde (iPhone, Mac, ayarlar) ses dalgası görünür.
- **Uygulama simgesi:** Tasarım tuvalindeki simgeden üretildi ([assets/icon](app/assets/icon), `make-icon.swift`).
- **Ses dalgaları:** Çalarken hareket eden, duraklatınca düzleşen dalga. Gerçek ses analizi değil, çalma durumuna bağlı animasyon.
- **Renkli tasarım:** Her kategorinin kendi rengi var. Radyo değişince ekran o rengin tonuna geçer.
- **Arama:** Radyo listesinin üzerinde arama. Türkçe harflere duyarsız ("nagme" yazınca "Nağme" bulunur).
- **Favoriler:** Kalp simgesiyle favori ekleme, "Favoriler" filtresi ve ayarlarda favori grubu. Favoriler, ses seviyesi, kapattığın radyolar ve son dinlenen radyo cihazda saklanır.
- **Arkadaşa paylaşım:** Paylaş düğmesi, çalan radyoyu ve şarkıyı bir bağlantıyla gönderir (`https://mahsundemir.github.io/frekans-radyolar/?r=<radyo>`). Bağlantı açılınca bir web sayfası gelir: uygulaması olmayan arkadaşın radyoyu tarayıcıda dinler, uygulaması olan "Frekans uygulamasında aç" ile radyoyu uygulamada başlatır (`frekans://radyo/...`). Sayfa yayın adresini yalnızca `stations.json` içindeki kayıttan alır.
- **Dynamic Island:** Radyo çalarken iPhone'un Dynamic Island'ında ve kilit ekranında canlı etkinlik görünür: kompakt (kısaltma, hareketli ses dalgası ve kayan şarkı adı), minimal ve genişletilmiş hal. Genişletilmiş hal 140 pt yüksekliğinde (sınır ~160 pt): kamera satırında logo ve dalga, altında radyo adı ve kayan şarkı, en altta tek satır: önceki/oynat/sonraki ve iki yanında 2 + 2 hızlı radyo. Hızlı radyolar favoriler önce gelir. Kilit ekranı kartında radyo logosu, kayan şarkı adı, dalga ve önceki/oynat/sonraki düğmeleri var. Çalan radyonun logosu (varsa) kompakt adada, genişletilmiş adada ve kilit ekranında görünür; logosu olmayanlarda baş harfler çıkar. ActivityKit durumu en çok ~4 KB olabildiği için logo, beyaz zeminde 56 px'lik ~1,8 KB'lık JPEG olarak durumun içinde taşınır; bu yüzden hızlı radyo düğmeleri logo değil baş harf gösterir. Kayan yazı ve hareketli dalga, uygulama canlı etkinliği oynarken yaklaşık her 0,8 saniyede bir güncelleyerek yapılıyor (Live Activity'de sürekli animasyon yok). iOS bu sıklığı sınırlarsa kayma takılabilir; gerçek iPhone'da denenmeli. Gerekli: iOS 17 ve Dynamic Island'lı iPhone (14 Pro ve sonrası), kilit ekranı kartı diğer iPhone'larda da çıkar.
- **Uyku zamanlayıcı:** 15, 30, 45, 60 ve 90 dakika. Süre dolunca ses 5 saniyede kısılır ve yayın durur. Zamanlayıcı native tarafta çalışır, panel ya da ekran kapalıyken de işler.
- **Yazı tipi:** Başlıklarda Bricolage Grotesque ExtraBold (SIL Open Font License, [assets/fonts](app/assets/fonts)).
- **Liste güncelleme:** Açılışta, uygulama öne gelince (30 dakikadan eskiyse) ve 6 saatte bir `stations.json` çekilir. İnternet yoksa önbellekteki ya da uygulamayla gelen kopya kullanılır.
- **Yayın dili:** Ayarlar > Radyolar ekranındaki açılır listeden (Türkçe, English, Español, العربية, Deutsch, Français, Русский) yayın dili seçilir. Seçim hem gezilen radyoları (ana ekran, önceki/sonraki, hızlı seçim, adadaki liste) hem uygulamanın dilini belirler. İlk açılışta cihaz dili desteklenen bir dilse o seçilir, değilse Türkçe. Çalan yayın dil değişince kesilmez; başka dilden bir radyo (paylaşılan bağlantı) açılırsa dil de o radyonun diline geçer. Seçim cihazda saklanır. Arapça metinler sağdan sola yazılır ama ekran düzeni (düğme yerleri) sağdan sola çevrilmez.
- **Dil > Kategori > Radyolar:** Ayarlar ekranı seçili dilin radyolarını kategori hiyerarşisiyle gösterir. Her radyo ayrı ayrı açılıp kapatılabilir.

## Radyo listesi

[`stations.json`](stations.json) şu an 247 radyo içeriyor (98'inin logosu var). Dil başına sayılar:

| Dil | Kod | Radyo | Kategori |
|---|---|---|---|
| Türkçe | `tr` | 66 | 12 |
| English | `en` | 33 | 7 |
| Español | `es` | 30 | 6 |
| العربية | `ar` | 24 | 5 |
| Deutsch | `de` | 33 | 6 |
| Français | `fr` | 32 | 7 |
| Русский | `ru` | 27 | 6 |
| Kürtçe | `ku` | 2 | 2 |

Her dilin kategorileri o dilde adlandırılır. Kategori kimlikleri dosya genelinde benzersizdir (Türkçe dışındakiler dil koduyla başlar: `en-pop`), radyo kimlikleri de öyle (`en-capital`). Kürtçe (`ku`) arayüz çevirisi olmadığı için Türkçe arayüzle gösterilir.

**Yeni dil/radyo kaynağı:** Radyolar topluluk dizini [radio-browser.info](https://www.radio-browser.info) ile resmî yayın adreslerinden derlendi. Her adres eklenirken `https` olarak açıldığı, ses verisi (ya da HLS parçası) geldiği ve HTML sayfası olmadığı denetlendi. Bu, yayının gerçekten o radyo olduğunu ya da her ülkeden açılacağını doğrulamaz: BBC'nin Birleşik Krallık dışına kapalı yayınları listeye alınmadı, bazı Alman ARD kenar sunucuları ise Türkiye'den bağlanırken zaman zaman kopuyor.

```
version, updatedAt
└─ languages[]   code, name
   └─ categories[]   id, name, color
      └─ stations[]   id, name, short, logo (isteğe bağlı), streamUrl, metadata
```

- `version`: Listeyi değiştirdiğinde artır. Uygulama eski sürümü yeni sürümün üzerine yazmaz.
- `streamUrl`: Doğrudan yayın adresi. Hepsi `https` (iOS güvenlik kuralı yüzünden).
- `logo`: İsteğe bağlı logo adresi (`https`). Logo varsa listelerde pasifken siyah-beyaz, çalan radyoda renkli görünür. Logo yoksa ya da açılmazsa baş harfler (`short`) görünür. Logolar radyoların kendi sitelerinden alındı, depoda kopyası tutulmuyor.
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
│  ├─ i18n.ts            Arayüz çevirileri (7 dil) ve cihaz dili algılama
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

## Gerçek iPhone'da deneme

1. `app` klasöründe `npm install` ve `cd ios && pod install` çalıştır.
2. `app/ios/Frekans.xcworkspace` dosyasını Xcode'da aç.
3. **Frekans** ve **FrekansIsland** hedeflerinin ikisinde de *Signing & Capabilities* bölümünde kendi ekibini (ücretsiz Apple Kimliği yeterli) seç ve paket kimliğini benzersiz yap. Eklentinin kimliği uygulamanınkiyle başlamalı. Projedeki kimlikler `com.mahsundemir.frekans` ve `com.mahsundemir.frekans.FrekansIsland`; başka bir hesapla derleyeceksen bunları değiştir.
4. iPhone'u bağla, hedef olarak seç.
   - *Debug* ile çalışırsa uygulama Metro'dan (`npx react-native start`) JS alır, telefon ve Mac aynı ağda olmalı.
   - Metro'suz denemek için *Product > Scheme > Edit Scheme > Run > Build Configuration* değerini **Release** yap. JS uygulamanın içine gömülür.
5. iPhone'da *Ayarlar > Canlı Etkinlikler* açık olmalı. Radyoyu çalıp ana ekrana çıkınca Dynamic Island'da görünür, uzun basınca genişler.

Release derlemesi imzasız cihaz hedefi için derlendi ve JS paketi, eklenti ve yazı tipi içinde. Gerçek cihazda denenmedi.

## Pil tüketimi: ölçme ve kontrol

**Ölçmek için**
- **iPhone:** Ayarlar > Pil'de uygulamanın ekran ve arka plan kullanımına bak. Cihaz bağlıyken Xcode'da Debug gezgininde *Energy* göstergesi, ayrıntı için Instruments'ta *Energy Log* / *Power Profiler* ve CPU için *Time Profiler* kullanılır. Enerji ölçümü için Release derlemesini (README'deki "Gerçek iPhone'da deneme") kullan, Debug sonuçları yanıltır.
- **Mac:** Etkinlik Monitörü > *Enerji* sekmesinde "Energy Impact" ve "12 saatlik güç". Terminalde `sudo powermetrics --samplers cpu_power -i 5000`. Ayrıntı için Instruments'ta *Energy Efficiency*.
- **Karşılaştırma:** Aynı radyoyu ekran kapalı 30 dakika çal, pil yüzdesini ve Ayarlar > Pil'i not et; sonra Pil tasarrufu açıkken tekrarla.
- Henüz uygulamaya otomatik ölçüm (MetricKit) eklenmedi ve gerçek tüketim ölçülmedi.

**Uygulamadaki kontroller**
- **Pil tasarrufu** (Ayarlar > Radyolar): ses dalgaları ve kayan yazı durur, iPhone canlı etkinliğinin saniyede ~1 güncellemesi durur (yalnızca şarkı değişince güncellenir). iOS Düşük Güç Modu açıkken canlı etkinlik güncellemeleri aynı şekilde durur.
- **Enerji açısından pahalı parçalar:** (1) canlı yayının kendisi (ağ ve ses çözme, kaçınılmaz); (2) canlı etkinliğin yaklaşık her 0,8 saniyede bir güncellenmesi (kayan yazı ve dalga için); (3) Mac'te adanın her zaman ekranda olması, dalga ve kayan yazı animasyonları. Mac animasyonları 60 kare/sn yerine saniyede ~9-15 adımla çalışacak şekilde azaltıldı.
- Daha da azaltmak için: canlı etkinlik güncelleme aralığını uzat (`LiveActivityManager.swift`, 0,8 sn), dalga/kayan yazıyı yalnızca genişlemiş adada göster ya da düşük bit hızlı yayınları tercih et.

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

- **Dil değişimi yalnızca React Native arayüzünü çevirir.** iPhone canlı etkinliğindeki ("Canlı yayın") ve Mac menü çubuğu menüsündeki ("Adayı sabitle", "Frekans'tan çık") native metinler Türkçe kaldı. Paylaşım sayfası (`index.html`) ve gizlilik sayfası da Türkçe/İngilizce. Yeni dillerdeki arayüz çevirileri ve yeni radyolar simülatörde/cihazda gözle denenmedi; yalnızca tip denetimi, Jest ve yayın adreslerinin ses verdiği doğrulandı.

- **Mac çentik adasında fare ile üzerine gelme denenmedi.** Daralmış ve genişlemiş hal görüntüleri alındı (genişleme kodla tetiklendi). Gerçek fare ile üzerine gelince açılıp kapanması, çentiğin hizası ve menü çubuğu simgesi gerçek ekranda gözle kontrol edilmeli.
- **Dynamic Island'ın görünüşü ve düğmeleri adadan denenmedi.** Eklenti derleniyor, uygulamaya gömülüyor, canlı etkinlik başarıyla başlıyor. Düğmelerin komutları (oynat/duraklat, önceki, sonraki, radyo seç) native oynatıcıya iletilince çalışıyor (simülatörde komut göndererek doğrulandı). Ancak simülatör ekran görüntüsü Dynamic Island'ı çizmediği ve uzun basılamadığı için adanın görünüşü ve gerçek dokunuşla tetiklenmesi gerçek iPhone'da denenmeli.
- **Otomatik açılan paylaşım bağlantısı:** Şu an bağlantı bir web sayfası açıyor, uygulamada açmak için sayfadaki düğmeye dokunmak gerekiyor. iMessage ve benzerlerinde bağlantıya dokununca doğrudan uygulamanın açılması (universal link) için gerçek bir Apple Developer ekip kimliği ve alan adı dosyası lazım. Paket kimliğiyle birlikte yapılacak.
- **Paylaşım sayfası gerçek tarayıcıda denenmedi.** Sayfa yayında ve komut dizisi sözdizimi doğrulandı. Çalma, tarayıcıya ve yayının CORS ayarına bağlı: HLS yayınları Safari dışında hls.js ile açılır, bazı yayınlar tarayıcıda açılmayabilir (sayfa o durumda uygulamayı öneriyor).
- **Kimlik ve imzalama:** Paket kimliği `com.mahsundemir.frekans` (eklenti: `com.mahsundemir.frekans.FrekansIsland`), Mac uygulaması hâlâ şablondaki `org.reactjs.native.Frekans`. Yayına çıkmadan önce kalıcı kimlikle ve Apple Developer hesabıyla değiştirilmeli. Gerçek cihazda Live Activity için imzalama gerekir. Mac uygulaması Debug derlemesi, imzalı/noter onaylı sürüm yok.
- **Test kapsamı:** Jest testleri filtre, paylaşım metni ve liste şemasını kapsıyor. Ses çalma gerçek yayınla elle doğrulandı (iOS simülatörü ve Mac'te canlı şarkı bilgisi göründü). Diğer radyoların dinlenebilirliği tek tek elle doğrulanmadı.
