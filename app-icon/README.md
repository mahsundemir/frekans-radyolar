# Frekans uygulama ikonu

Hazır ikon dosyaları. Tasarım kaynağı: tasarım tuvalindeki **"Uygulama simgesi"** artboard'ı
(https://claude.ai/artifact/PmdxreDgHYZMX7MA2gyJdL, `Icon.dc.html`).

**Tasarım:** Koyu zemin (#0D0B13 → #282434) üzerinde 5 yuvarlak ses çubuğu. Ortadaki en uzun çubuk
vurgu rengi coral `#FF5B4A`, diğer dördü fildişi beyaz (#FFFFFF → #D6D1E6). Çubukların arkasında coral'dan
çok hafif bir ışıma var. Başka renk yok, kategori renkleri ikonda kullanılmaz.

## Bu klasörde ne var

| Yol | Ne |
|---|---|
| `ios/AppIcon.appiconset/` | iPhone ikon seti. Tam kare, **saydamlık yok** (iOS köşeleri kendisi keser). `Contents.json` dosya adlarıyla dolu. |
| `macos/AppIcon.appiconset/` | Mac ikon seti. Squircle kesilmiş, 1024'lük tuvalde 824'lük gövde, yumuşak gölge, saydam kenar boşluğu. |
| `macos/MenuBarGlyph.imageset/` | Menü çubuğu için tek renkli (şablon) simge, 18/36/54 px. `template-rendering-intent: template` ayarlı, macOS açık/koyu menü çubuğuna göre kendisi boyar. |
| `Frekans-icon-1024.png` | iPhone ana dosya (App Store için de bu). |
| `Frekans-icon-mac-1024.png` | Mac ana dosya. |
| `frekans-icon.svg` | Kare, kesilmemiş vektör ana dosya. |
| `make-icons.swift` | Tüm PNG'leri yeniden üretir: `cd app-icon && swift make-icons.swift`. Renk ya da çubuk boyu değişirse buradan değiştir. |

## Projeye kurma

`app/` projesindeki asset katalogları şu an boş (`Contents.json` var, PNG yok) ve proje
`ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon` ile zaten bu ada bakıyor. Bu klasördeki dosyalar
**henüz projeye kopyalanmadı**. Kopyalamak için, bu klasörün olduğu dizinden:

```sh
cp ios/AppIcon.appiconset/* ../app/ios/Frekans/Images.xcassets/AppIcon.appiconset/
cp macos/AppIcon.appiconset/* ../app/macos/Frekans-macOS/Assets.xcassets/AppIcon.appiconset/
cp -R macos/MenuBarGlyph.imageset ../app/macos/Frekans-macOS/Assets.xcassets/
```

(`Contents.json` hedefte üzerine yazılır. Hedefteki hali yalnızca boyut listesiydi, dosya adı yoktu.)

Menü çubuğu simgesini SwiftUI tarafında kullanmak için: `MenuBarExtra { ... } label: { Image("MenuBarGlyph") }`.
Şu an menü çubuğunda ne gösterildiği ayrıca kontrol edilmedi.

## Notlar

- İkon iOS 26 ve macOS 26'da aynı şekli paylaşır, tek tasarım iki platforma yeter. Koyu / açık / tonlu iOS 18 varyantları çizilmedi.
- iPad ikonu için bu sette giriş yok (projedeki katalog yalnızca `iphone` idiom'u içeriyor).
- Mac setindeki gölge ve kenar boşluğu eski (Tahoe öncesi) stil. macOS 26'da Icon Composer ile ayrı bir `.icon` dosyası istenirse çubuklar ve zemin katman olarak ayrılabilir.
