// Frekans uygulama simgesi: tasarım tuvalindeki "Uygulama simgesi" panosunun birebir çizimi.
// Kullanım: swiftc make-icon.swift -o make-icon && ./make-icon <çıktı klasörü>
// iOS: tam kare opak 1024 (köşeleri sistem keser). macOS: kendi şekliyle (süper elips) ve boşlukla.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let accent = CGColor(red: 1.0, green: 0x5B / 255.0, blue: 0x4A / 255.0, alpha: 1)
let rgb = CGColorSpaceCreateDeviceRGB()

func col(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
  CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
          blue: CGFloat(hex & 255) / 255, alpha: a)
}

func grad(_ stops: [(CGColor, CGFloat)]) -> CGGradient {
  CGGradient(colorsSpace: rgb, colors: stops.map { $0.0 } as CFArray, locations: stops.map { $0.1 })!
}

func squircle() -> CGPath {
  let n = 240, e = 2.0 / 5.0
  let p = CGMutablePath()
  for i in 0..<n {
    let t = Double(i) / Double(n) * 2 * Double.pi
    let c = cos(t), s = sin(t)
    let x = 512 + 512 * (c < 0 ? -1.0 : 1.0) * pow(abs(c), e)
    let y = 512 + 512 * (s < 0 ? -1.0 : 1.0) * pow(abs(s), e)
    i == 0 ? p.move(to: CGPoint(x: x, y: y)) : p.addLine(to: CGPoint(x: x, y: y))
  }
  p.closeSubpath()
  return p
}

func render(mac: Bool) -> CGImage {
  let ctx = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0,
                      space: rgb, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  // SVG gibi y aşağı
  ctx.translateBy(x: 0, y: 1024)
  ctx.scaleBy(x: 1, y: -1)
  if mac {
    let s: CGFloat = 824.0 / 1024.0
    ctx.translateBy(x: 100, y: 100)
    ctx.scaleBy(x: s, y: s)
  }
  ctx.saveGState()
  if mac { ctx.addPath(squircle()); ctx.clip() }

  // zemin
  ctx.drawLinearGradient(grad([(col(0x282434), 0), (col(0x0D0B13), 1)]),
                         start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: 1024), options: [])
  // üstten parıltı
  ctx.drawRadialGradient(grad([(col(0xFFFFFF, 0.13), 0), (col(0xFFFFFF, 0), 1)]),
                         startCenter: CGPoint(x: 512, y: 0), startRadius: 0,
                         endCenter: CGPoint(x: 512, y: 0), endRadius: 780, options: [])
  // vurgu rengi hale
  ctx.saveGState()
  ctx.translateBy(x: 512, y: 512)
  ctx.scaleBy(x: 340, y: 440)
  ctx.drawRadialGradient(grad([(accent.copy(alpha: 0.34)!, 0), (accent.copy(alpha: 0)!, 1)]),
                         startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: 1, options: [])
  ctx.restoreGState()

  // çubuklar
  let bars: [(CGFloat, CGFloat, CGFloat, Bool)] = [
    (160, 388, 248, false), (312, 292, 440, false), (464, 192, 640, true),
    (616, 316, 392, false), (768, 418, 188, false),
  ]
  for (x, y, h, isAccent) in bars {
    let r = CGRect(x: x, y: y, width: 96, height: h)
    ctx.saveGState()
    ctx.addPath(CGPath(roundedRect: r, cornerWidth: 48, cornerHeight: 48, transform: nil))
    ctx.clip()
    if isAccent {
      ctx.setFillColor(accent)
      ctx.fill(r)
      ctx.drawLinearGradient(grad([(col(0xFFFFFF, 0.34), 0), (col(0xFFFFFF, 0), 0.6)]),
                             start: CGPoint(x: 0, y: r.minY), end: CGPoint(x: 0, y: r.maxY), options: [])
    } else {
      ctx.drawLinearGradient(grad([(col(0xFFFFFF), 0), (col(0xD6D1E6), 1)]),
                             start: CGPoint(x: 0, y: r.minY), end: CGPoint(x: 0, y: r.maxY), options: [])
    }
    ctx.restoreGState()
  }
  ctx.restoreGState()

  if mac {
    // ince kenar çizgisi
    ctx.addPath(squircle())
    ctx.setLineWidth(3)
    ctx.replacePathWithStrokedPath()
    ctx.clip()
    ctx.drawLinearGradient(grad([(col(0xFFFFFF, 0.26), 0), (col(0xFFFFFF, 0.03), 0.45), (col(0xFFFFFF, 0.08), 1)]),
                           start: CGPoint(x: 0, y: 0), end: CGPoint(x: 0, y: 1024), options: [])
  }
  return ctx.makeImage()!
}

func save(_ img: CGImage, _ path: String) {
  let url = URL(fileURLWithPath: path) as CFURL
  let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
}

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
save(render(mac: false), out + "/icon-ios-1024.png")
save(render(mac: true), out + "/icon-mac-1024.png")
print("tamam")
