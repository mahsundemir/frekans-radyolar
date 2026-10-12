import ActivityKit
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

struct Monogram: View {
  let state: FrekansActivityAttributes.ContentState
  var size: CGFloat = 40

  var body: some View {
    Text(state.short)
      .font(.system(size: size * 0.36, weight: .heavy))
      .foregroundStyle(Color.ink(onHex: state.colorHex))
      .frame(width: size, height: size)
      .background(Color(hex: state.colorHex), in: RoundedRectangle(cornerRadius: size * 0.3))
  }
}

struct WaveGlyph: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    Image(systemName: state.playing ? "waveform" : "pause.fill")
      .font(.system(size: 14, weight: .bold))
      .foregroundStyle(Color(hex: state.colorHex))
  }
}

struct NowPlayingText: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(state.name)
        .font(.system(size: 16, weight: .bold))
        .lineLimit(1)
      Text(subtitle)
        .font(.system(size: 13))
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }

  private var subtitle: String {
    let song = [state.artist, state.title].filter { !$0.isEmpty }.joined(separator: " — ")
    return song.isEmpty ? "Canlı yayın" : song
  }
}

// Kilit ekranı kartı: radyonun rengiyle dolu
struct LockScreenView: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    let ink = Color.ink(onHex: state.colorHex)
    let song = [state.artist, state.title].filter { !$0.isEmpty }.joined(separator: " — ")
    HStack(spacing: 12) {
      Text(state.short)
        .font(.system(size: 16, weight: .heavy))
        .foregroundStyle(Color(hex: state.colorHex))
        .frame(width: 44, height: 44)
        .background(ink, in: RoundedRectangle(cornerRadius: 13))
      VStack(alignment: .leading, spacing: 2) {
        Text(state.name).font(.system(size: 17, weight: .heavy)).lineLimit(1)
        Text(song.isEmpty ? "Canlı yayın" : song)
          .font(.system(size: 14)).lineLimit(1).opacity(0.85)
      }
      Spacer()
      Image(systemName: state.playing ? "waveform" : "pause.fill")
        .font(.system(size: 18, weight: .bold))
    }
    .foregroundStyle(ink)
    .padding(16)
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
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Monogram(state: c, size: 44)
        }
        DynamicIslandExpandedRegion(.center) {
          NowPlayingText(state: c)
        }
        DynamicIslandExpandedRegion(.trailing) {
          WaveGlyph(state: c)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text("Frekans'ı açmak için dokun")
            .font(.system(size: 12))
            .foregroundStyle(.secondary)
        }
      } compactLeading: {
        Monogram(state: c, size: 22)
      } compactTrailing: {
        WaveGlyph(state: c)
      } minimal: {
        WaveGlyph(state: c)
      }
      .widgetURL(URL(string: "frekans://radyo/\(c.stationId)"))
      .keylineTint(Color(hex: c.colorHex))
    }
  }
}
