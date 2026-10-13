import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

extension Color {
  init(hex: String) {
    let n = UInt32(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0xFF5B4A
    self.init(
      red: Double((n >> 16) & 255) / 255, green: Double((n >> 8) & 255) / 255,
      blue: Double(n & 255) / 255)
  }

  // Zemin rengine göre okunaklı yazı rengi (uygulamadaki inkFor ile aynı mantık)
  static func ink(onHex hex: String) -> Color {
    let n = UInt32(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0xFF5B4A
    func lin(_ v: UInt32) -> Double {
      let c = Double(v) / 255
      return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
    }
    let lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
    return lum > 0.2 ? Color(hex: "#17141F") : .white
  }
}

// Radyo kutusu: logo varsa beyaz zeminde logo, yoksa baş harfler.
// Logo, uygulamanın canlı etkinlik durumuna koyduğu küçük JPEG'dir (eklenti ağdan görsel yükleyemez).
// Hızlı radyo düğmeleri logo taşımaz, baş harfli gri daire olarak görünür.
struct LogoTile: View {
  var logoData: Data? = nil
  let short: String
  let colorHex: String
  var size: CGFloat = 40
  var active: Bool = true
  var circle: Bool = false

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: circle ? size / 2 : size * 0.3)
    if let data = logoData, let img = UIImage(data: data) {
      Image(uiImage: img)
        .resizable()
        .scaledToFit()
        .frame(width: size, height: size)
        .clipShape(shape)
    } else {
      Text(short)
        .font(.system(size: size * 0.36, weight: .heavy))
        .foregroundStyle(active ? Color.ink(onHex: colorHex) : Color(hex: "#A29EB5"))
        .frame(width: size, height: size)
        .background(active ? Color(hex: colorHex) : Color(hex: "#2B2836"), in: shape)
    }
  }
}

// Oynarken kare kare değişen ses dalgası (durum güncellemeleriyle ilerler); duraklatılınca düz.
struct WaveGlyph: View {
  let state: FrekansActivityAttributes.ContentState
  var color: Color? = nil

  private static let frames: [[CGFloat]] = [
    [5, 12, 8, 14], [11, 6, 14, 7], [7, 14, 5, 11], [13, 8, 12, 5],
  ]

  var body: some View {
    let heights = state.playing ? Self.frames[state.eq % 4] : [3, 3, 3, 3]
    HStack(alignment: .center, spacing: 2) {
      ForEach(0..<4, id: \.self) { i in
        Capsule()
          .fill(color ?? Color(hex: state.colorHex))
          .frame(width: 3, height: heights[i])
      }
    }
    .frame(width: 20, height: 16)
  }
}

private func songLine(_ s: FrekansActivityAttributes.ContentState) -> String {
  let song = [s.artist, s.title].filter { !$0.isEmpty }.joined(separator: " — ")
  return song.isEmpty ? "Canlı yayın" : song
}

// Önceki / oynat-duraklat / sonraki
struct TransportControls: View {
  let state: FrekansActivityAttributes.ContentState
  var ink: Color? = nil
  var accent: Color? = nil
  var iconColor: Color = .white

  var body: some View {
    let accentColor = accent ?? Color(hex: state.colorHex)
    let inkColor = ink ?? Color.ink(onHex: state.colorHex)
    HStack(spacing: 22) {
      Button(intent: PreviousStationIntent()) {
        Image(systemName: "backward.fill").font(.system(size: 17, weight: .bold))
          .frame(width: 34, height: 36)
      }
      Button(intent: TogglePlaybackIntent()) {
        Image(systemName: state.playing ? "pause.fill" : "play.fill")
          .font(.system(size: 19, weight: .bold))
          .foregroundStyle(inkColor)
          .frame(width: 52, height: 36)
          .background(accentColor, in: Capsule())
      }
      Button(intent: NextStationIntent()) {
        Image(systemName: "forward.fill").font(.system(size: 17, weight: .bold))
          .frame(width: 34, height: 36)
      }
    }
    .buttonStyle(.plain)
    .foregroundStyle(iconColor)
  }
}

// Hızlı radyo düğmesi (logo ya da baş harfler)
struct QuickChip: View {
  let quick: FrekansActivityAttributes.Quick

  var body: some View {
    Button(intent: PlayStationIntent(stationId: quick.id)) {
      LogoTile(short: quick.short, colorHex: quick.colorHex, size: 28, active: false, circle: true)
    }
    .buttonStyle(.plain)
  }
}

// Kilit ekranı kartı: radyonun rengiyle dolu; logo, ad, kayan şarkı, dalga ve kontroller
struct LockScreenView: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    let ink = Color.ink(onHex: state.colorHex)
    VStack(spacing: 10) {
      HStack(spacing: 12) {
        Group {
          if state.logoData != nil {
            LogoTile(logoData: state.logoData, short: state.short, colorHex: state.colorHex, size: 52)
          } else {
            Text(state.short)
              .font(.system(size: 18, weight: .heavy))
              .foregroundStyle(Color(hex: state.colorHex))
              .frame(width: 52, height: 52)
              .background(ink, in: RoundedRectangle(cornerRadius: 15))
          }
        }
        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: 6) {
            Circle().fill(ink).frame(width: 7, height: 7)
            Text("CANLI").font(.system(size: 10, weight: .bold)).tracking(1.4).opacity(0.85)
          }
          Text(state.name).font(.system(size: 22, weight: .heavy)).lineLimit(1)
          Text(state.ticker.isEmpty ? songLine(state) : state.ticker)
            .font(.system(size: 12, weight: .medium, design: .monospaced)).lineLimit(1).opacity(0.85)
        }
        Spacer(minLength: 0)
        WaveGlyph(state: state, color: ink)
      }
      TransportControls(
        state: state, ink: Color(hex: state.colorHex), accent: ink, iconColor: ink)
    }
    .foregroundStyle(ink)
    .padding(.horizontal, 16)
    .padding(.top, 14)
    .padding(.bottom, 10)
    .activityBackgroundTint(Color(hex: state.colorHex))
    .widgetURL(URL(string: "frekans://radyo/\(state.stationId)"))
  }
}

struct FrekansLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FrekansActivityAttributes.self) { context in
      LockScreenView(state: context.state)
    } dynamicIsland: { context in
      let c = context.state
      // Hızlı radyolar: çalan hariç ilk 4; ikisi solda, ikisi sağda
      let others = c.quick.filter { $0.id != c.stationId }
      let left = Array(others.prefix(2))
      let right = Array(others.dropFirst(2).prefix(2))
      return DynamicIsland {
        // Genişletilmiş ada en çok ~160 pt: kamera satırı + ad/şarkı + tek satırlık kontroller (≈140 pt)
        DynamicIslandExpandedRegion(.leading) {
          LogoTile(logoData: c.logoData, short: c.short, colorHex: c.colorHex, size: 40)
        }
        DynamicIslandExpandedRegion(.trailing) {
          WaveGlyph(state: c)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 1) {
            Text(c.name)
              .font(.system(size: 15, weight: .bold))
              .lineLimit(1)
            Text(c.ticker.isEmpty ? songLine(c) : c.ticker)
              .font(.system(size: 12, weight: .medium, design: .monospaced))
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack(spacing: 10) {
            HStack(spacing: 8) { ForEach(left, id: \.id) { QuickChip(quick: $0) } }
            TransportControls(state: c)
            HStack(spacing: 8) { ForEach(right, id: \.id) { QuickChip(quick: $0) } }
          }
          .frame(maxWidth: .infinity)
        }
      } compactLeading: {
        LogoTile(logoData: c.logoData, short: c.short, colorHex: c.colorHex, size: 24)
      } compactTrailing: {
        HStack(spacing: 4) {
          WaveGlyph(state: c)
          Text(c.tickerShort)
            .font(.system(size: 10, weight: .semibold, design: .monospaced))
            .lineLimit(1)
            .frame(width: 44, alignment: .leading)
        }
      } minimal: {
        WaveGlyph(state: c)
      }
      .widgetURL(URL(string: "frekans://radyo/\(c.stationId)"))
      .keylineTint(Color(hex: c.colorHex))
    }
  }
}
