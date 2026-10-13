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

// Oynarken kare kare değişen ses dalgası (durum güncellemeleriyle ilerler); duraklatılınca düz.
struct WaveGlyph: View {
  let state: FrekansActivityAttributes.ContentState

  private static let frames: [[CGFloat]] = [
    [5, 12, 8, 14], [11, 6, 14, 7], [7, 14, 5, 11], [13, 8, 12, 5],
  ]

  var body: some View {
    let heights = state.playing ? Self.frames[state.eq % 4] : [3, 3, 3, 3]
    HStack(alignment: .center, spacing: 2) {
      ForEach(0..<4, id: \.self) { i in
        Capsule()
          .fill(Color(hex: state.colorHex))
          .frame(width: 3, height: heights[i])
      }
    }
    .frame(width: 20, height: 16)
  }
}

struct NowPlayingText: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(state.name)
        .font(.system(size: 16, weight: .bold))
        .lineLimit(1)
      Text(state.ticker.isEmpty ? subtitle : state.ticker)
        .font(.system(size: 13, weight: .medium, design: .monospaced))
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }

  private var subtitle: String {
    let song = [state.artist, state.title].filter { !$0.isEmpty }.joined(separator: " — ")
    return song.isEmpty ? "Canlı yayın" : song
  }
}

// Oynat/duraklat, önceki, sonraki düğmeleri
struct TransportControls: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    let accent = Color(hex: state.colorHex)
    HStack(spacing: 28) {
      Button(intent: PreviousStationIntent()) {
        Image(systemName: "backward.fill").font(.system(size: 18, weight: .bold))
          .frame(width: 44, height: 40)
      }
      Button(intent: TogglePlaybackIntent()) {
        Image(systemName: state.playing ? "pause.fill" : "play.fill")
          .font(.system(size: 20, weight: .bold))
          .foregroundStyle(Color.ink(onHex: state.colorHex))
          .frame(width: 56, height: 40)
          .background(accent, in: Capsule())
      }
      Button(intent: NextStationIntent()) {
        Image(systemName: "forward.fill").font(.system(size: 18, weight: .bold))
          .frame(width: 44, height: 40)
      }
    }
    .buttonStyle(.plain)
    .foregroundStyle(.white)
  }
}

// Hızlı radyo seçimi (favoriler önce)
struct QuickStations: View {
  let state: FrekansActivityAttributes.ContentState

  var body: some View {
    HStack(spacing: 12) {
      ForEach(state.quick, id: \.id) { q in
        Button(intent: PlayStationIntent(stationId: q.id)) {
          Text(q.short)
            .font(.system(size: 12, weight: .heavy))
            .foregroundStyle(Color.ink(onHex: q.colorHex))
            .frame(width: 34, height: 34)
            .background(Color(hex: q.colorHex), in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: q.id == state.stationId ? 2.5 : 0).padding(-3))
        }
        .buttonStyle(.plain)
      }
    }
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
        Text(state.ticker.isEmpty ? (song.isEmpty ? "Canlı yayın" : song) : state.ticker)
          .font(.system(size: 13, weight: .medium, design: .monospaced)).lineLimit(1).opacity(0.85)
      }
      Spacer()
      WaveGlyph(state: state)
        .colorMultiply(ink)
      Button(intent: TogglePlaybackIntent()) {
        Image(systemName: state.playing ? "pause.fill" : "play.fill")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(Color(hex: state.colorHex))
          .frame(width: 44, height: 44)
          .background(ink, in: Circle())
      }
      .buttonStyle(.plain)
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
          VStack(spacing: 10) {
            TransportControls(state: c)
            if !c.quick.isEmpty {
              QuickStations(state: c)
            }
          }
        }
      } compactLeading: {
        Monogram(state: c, size: 22)
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
