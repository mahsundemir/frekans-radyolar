import ActivityKit
import Foundation

// Çalan radyoyu Dynamic Island / kilit ekranı canlı etkinliğine yansıtır.
// Native oynatıcı (FrekansAudio) "FrekansNowPlaying" bildirimi gönderir.
final class LiveActivityManager {
  static let shared = LiveActivityManager()
  private var activity: Activity<FrekansActivityAttributes>?
  private var started = false

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
      playing: info["playing"] as? Bool ?? true
    )
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
    guard let current = activity else { return }
    activity = nil
    Task { await current.end(nil, dismissalPolicy: .immediate) }
  }
}
