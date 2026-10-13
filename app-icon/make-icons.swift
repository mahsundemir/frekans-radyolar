// Frekans uygulama ikonu üreticisi.
// Kullanım: swift make-icons.swift   (app-icon/ klasöründe çalıştır)
// Tasarım kaynağı: tasarım tuvalindeki "Uygulama simgesi" artboard'ı.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
func col(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: cs, components: [CGFloat((hex >> 16) & 255) / 255, CGFloat((hex >> 8) & 255) / 255, CGFloat(hex & 255) / 255, a])!
}
func grad(_ stops: [(CGFloat, CGColor)]) -> CGGradient {
    CGGradient(colorsSpace: cs, colors: stops.map { $0.1 } as CFArray, locations: stops.map { $0.0 })!
}

let accent: UInt32 = 0xFF5B4A
// [x, y, yükseklik] — 1024'lük tuvalde, genişlik 96, tam yuvarlak uçlar.
let bars: [(x: CGFloat, h: CGFloat)] = [(160, 248), (312, 440), (464, 640), (616, 392), (768, 188)]
let peak = 2

func squirclePath() -> CGPath {
    let p = CGMutablePath()
    let n = 240, e = 2.0 / 5.0
    for i in 0..<n {
        let t = Double(i) / Double(n) * 2 * .pi
        let c = cos(t), s = sin(t)
        let x = 512 + 512 * (c < 0 ? -1.0 : 1.0) * pow(abs(c), e)
        let y = 512 + 512 * (s < 0 ? -1.0 : 1.0) * pow(abs(s), e)
        i == 0 ? p.move(to: CGPoint(x: x, y: y)) : p.addLine(to: CGPoint(x: x, y: y))
    }
    p.closeSubpath()
    return p
}

func makeContext(_ px: Int, alpha: Bool) -> CGContext {
    let info = alpha ? CGImageAlphaInfo.premultipliedLast.rawValue : CGImageAlphaInfo.noneSkipLast.rawValue
    let ctx = CGContext(data: nil, width: px, height: px, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: info)!
    ctx.interpolationQuality = .high
    return ctx
}

func save(_ ctx: CGContext, _ path: String) {
    let img = ctx.makeImage()!
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil)
    precondition(CGImageDestinationFinalize(dest), "PNG yazılamadı: \(path)")
}

// 1024'lük, y'si aşağı doğru artan koordinat sisteminde ikonun içeriği.
func drawArt(_ ctx: CGContext) {
    // zemin
    ctx.drawLinearGradient(grad([(0, col(0x282434)), (1, col(0x0D0B13))]), start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: 1024), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    // üstten ışık
    ctx.drawRadialGradient(grad([(0, col(0xFFFFFF, 0.13)), (1, col(0xFFFFFF, 0))]), startCenter: CGPoint(x: 512, y: 0), startRadius: 0, endCenter: CGPoint(x: 512, y: 0), endRadius: 780, options: [])
    // vurgu rengi ışıması
    ctx.saveGState()
    ctx.translateBy(x: 512, y: 512)
    ctx.scaleBy(x: 340, y: 440)
    ctx.drawRadialGradient(grad([(0, col(accent, 0.34)), (1, col(accent, 0))]), startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: 1, options: [])
    ctx.restoreGState()
    // çubuklar
    for (i, b) in bars.enumerated() {
        let rect = CGRect(x: b.x, y: 512 - b.h / 2, width: 96, height: b.h)
        ctx.saveGState()
        ctx.addPath(CGPath(roundedRect: rect, cornerWidth: 48, cornerHeight: 48, transform: nil))
        ctx.clip()
        let top = CGPoint(x: 0, y: rect.minY), bottom = CGPoint(x: 0, y: rect.maxY)
        if i == peak {
            ctx.setFillColor(col(accent))
            ctx.fill(rect)
            ctx.drawLinearGradient(grad([(0, col(0xFFFFFF, 0.34)), (0.6, col(0xFFFFFF, 0))]), start: top, end: bottom, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        } else {
            ctx.drawLinearGradient(grad([(0, col(0xFFFFFF)), (1, col(0xD6D1E6))]), start: top, end: bottom, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        }
        ctx.restoreGState()
    }
}

// iPhone: tam kare, saydamlık yok. Köşeleri iOS kendisi keser.
func renderIOS(_ px: Int, to path: String) {
    let ctx = makeContext(px, alpha: false)
    ctx.translateBy(x: 0, y: CGFloat(px))
    ctx.scaleBy(x: CGFloat(px) / 1024, y: -CGFloat(px) / 1024)
    drawArt(ctx)
    save(ctx, path)
}

// Mac: squircle kesilmiş, 1024'lük tuvalde 824'lük gövde + yumuşak gölge.
func renderMac(_ px: Int, to path: String) {
    let ctx = makeContext(px, alpha: true)
    let k = CGFloat(px) / 1024
    ctx.translateBy(x: 0, y: CGFloat(px))
    ctx.scaleBy(x: k, y: -k)
    let inner: CGFloat = 824.0 / 1024.0
    ctx.translateBy(x: 512 * (1 - inner), y: 512 * (1 - inner))
    ctx.scaleBy(x: inner, y: inner)
    let shape = squirclePath()
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -14 * k), blur: 28 * k, color: col(0x000000, 0.38))
    ctx.addPath(shape); ctx.setFillColor(col(0x0D0B13)); ctx.fillPath()
    ctx.restoreGState()
    ctx.saveGState()
    ctx.addPath(shape); ctx.clip()
    drawArt(ctx)
    ctx.restoreGState()
    // ince kenar çizgisi
    ctx.saveGState()
    ctx.addPath(shape)
    ctx.setLineWidth(3)
    ctx.replacePathWithStrokedPath()
    ctx.clip()
    ctx.drawLinearGradient(grad([(0, col(0xFFFFFF, 0.26)), (0.45, col(0xFFFFFF, 0.03)), (1, col(0xFFFFFF, 0.08))]), start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: 1024), options: [])
    ctx.restoreGState()
    save(ctx, path)
}

// Menü çubuğu şablon simgesi: siyah, saydam zemin (macOS rengi kendisi verir).
func renderTemplate(_ px: Int, to path: String) {
    let ctx = makeContext(px, alpha: true)
    let k = CGFloat(px) / 24
    ctx.translateBy(x: 0, y: CGFloat(px))
    ctx.scaleBy(x: k, y: -k)
    ctx.setFillColor(col(0x000000))
    let hs: [CGFloat] = [8, 14, 20, 12, 6]
    for (i, h) in hs.enumerated() {
        let r = CGRect(x: 1.5 + CGFloat(i) * 4.5, y: 12 - h / 2, width: 3, height: h)
        ctx.addPath(CGPath(roundedRect: r, cornerWidth: 1.5, cornerHeight: 1.5, transform: nil))
        ctx.fillPath()
    }
    save(ctx, path)
}

func writeJSON(_ obj: Any, _ path: String) {
    let d = try! JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted, .sortedKeys])
    try! d.write(to: URL(fileURLWithPath: path))
}

let fm = FileManager.default
let root = fm.currentDirectoryPath
func dir(_ p: String) -> String { let f = root + "/" + p; try! fm.createDirectory(atPath: f, withIntermediateDirectories: true); return f }
let info = ["author": "xcode", "version": 1] as [String: Any]

// iPhone
let ios = dir("ios/AppIcon.appiconset")
var iosImages: [[String: Any]] = []
for (pt, scale) in [(20, 2), (20, 3), (29, 2), (29, 3), (40, 2), (40, 3), (60, 2), (60, 3)] {
    let px = pt * scale, name = "icon-\(px).png"
    renderIOS(px, to: ios + "/" + name)
    iosImages.append(["filename": name, "idiom": "iphone", "scale": "\(scale)x", "size": "\(pt)x\(pt)"])
}
renderIOS(1024, to: ios + "/icon-1024.png")
iosImages.append(["filename": "icon-1024.png", "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024"])
writeJSON(["images": iosImages, "info": info], ios + "/Contents.json")

// Mac
let mac = dir("macos/AppIcon.appiconset")
var macImages: [[String: Any]] = []
for pt in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let px = pt * scale, name = "icon-\(px).png"
        renderMac(px, to: mac + "/" + name)
        macImages.append(["filename": name, "idiom": "mac", "scale": "\(scale)x", "size": "\(pt)x\(pt)"])
    }
}
writeJSON(["images": macImages, "info": info], mac + "/Contents.json")

// Menü çubuğu şablonu
let mb = dir("macos/MenuBarGlyph.imageset")
renderTemplate(18, to: mb + "/glyph-18.png")
renderTemplate(36, to: mb + "/glyph-36.png")
renderTemplate(54, to: mb + "/glyph-54.png")
writeJSON([
    "images": [
        ["filename": "glyph-18.png", "idiom": "universal", "scale": "1x"],
        ["filename": "glyph-36.png", "idiom": "universal", "scale": "2x"],
        ["filename": "glyph-54.png", "idiom": "universal", "scale": "3x"],
    ],
    "info": info,
    "properties": ["template-rendering-intent": "template"],
], mb + "/Contents.json")

// Önizleme / ana dosyalar
renderIOS(1024, to: root + "/Frekans-icon-1024.png")
renderMac(1024, to: root + "/Frekans-icon-mac-1024.png")
print("tamam")
