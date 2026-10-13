import ActivityKit
import Foundation

// Çalan radyoyu Dynamic Island / kilit ekranı canlı etkinliğine yansıtır.
// Native oynatıcı (FrekansAudio) "FrekansNowPlaying" bildirimi gönderir.
final class LiveActivityManager {
  static let shared = LiveActivityManager()
  private var activity: Activity<FrekansActivityAttributes>?
  private var started = false
  private var base: FrekansActivityAttributes.ContentState?
  private var step = 0
  private var lastSong = ""
  private var timer: Timer?

  func start() {
    guard !started else { return }
    started = true
    // Önceki oturumdan kalan etkinlikleri kapat
    for old in Activity<FrekansActivityAttributes>.activities {
      Task { await old.end(nil, dismissalPolicy: .immediate) }
    }
    NotificationCenter.default.addObserver(
      forName: Notification.Name("FrekansNowPlaying"), object: nil, queue: .main
    ) { [weak self] note in
      self?.handle(note.userInfo ?? [:])
    }
  }

  private func handle(_ info: [AnyHashable: Any]) {
    if info["ended"] as? Bool == true {
      end()
      return
    }
    let state = FrekansActivityAttributes.ContentState(
      stationId: info["stationId"] as? String ?? "",
      name: info["name"] as? String ?? "",
      short: info["short"] as? String ?? "",
      colorHex: info["color"] as? String ?? "#FF5B4A",
      title: info["title"] as? String ?? "",
      artist: info["artist"] as? String ?? "",
      playing: info["playing"] as? Bool ?? true,
      quick: (info["quick"] as? [[String: Any]] ?? []).map {
        FrekansActivityAttributes.Quick(
          id: $0["id"] as? String ?? "", short: $0["short"] as? String ?? "",
          colorHex: $0["color"] as? String ?? "#FF5B4A")
      }
    )
    base = state
    let song = songText(state)
    if song != lastSong {
      lastSong = song
      step = 0
    }
    updateTicker(playing: state.playing)
    push()
  }

  // Kayan yazı ve dalga animasyonu: oynarken yaklaşık her 0,8 sn'de bir kare ilerler
  private func updateTicker(playing: Bool) {
    if playing {
      guard timer == nil else { return }
      let t = Timer(timeInterval: 0.8, repeats: true) { [weak self] _ in
        guard let self else { return }
        self.step += 1
        self.push()
      }
      RunLoop.main.add(t, forMode: .common)
      timer = t
    } else {
      timer?.invalidate()
      timer = nil
    }
  }

  private func songText(_ s: FrekansActivityAttributes.ContentState) -> String {
    let song = [s.artist, s.title].filter { !$0.isEmpty }.joined(separator: " — ")
    return song.isEmpty ? "Canlı yayın" : song
  }

  // Metni belirli genişlikte pencereleyip her adımda bir karakter kaydırır
  private func windowed(_ text: String, width: Int, step: Int) -> String {
    let chars = Array(text)
    if chars.count <= width { return text }
    let padded = chars + Array("   •   ")
    return String((0..<width).map { padded[(step + $0) % padded.count] })
  }

  private func push() {
    guard var state = base else { return }
    let song = songText(state)
    state.eq = step % 4
    state.ticker = windowed(song, width: 24, step: step)
    state.tickerShort = windowed(song, width: 7, step: step)
    let content = ActivityContent(state: state, staleDate: nil)
    if let activity {
      Task { await activity.update(content) }
    } else if ActivityAuthorizationInfo().areActivitiesEnabled {
      do {
        activity = try Activity.request(
          attributes: FrekansActivityAttributes(), content: content, pushType: nil)
      } catch {
        NSLog("[FrekansLA] canlı etkinlik başlatılamadı: \(error)")
      }
    } else {
      NSLog("[FrekansLA] canlı etkinlikler kapalı")
    }
  }

  private func end() {
    timer?.invalidate()
    timer = nil
    base = nil
    guard let current = activity else { return }
    activity = nil
    Task { await current.end(nil, dismissalPolicy: .immediate) }
  }
}
