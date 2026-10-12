import AppIntents
import Foundation

// Dynamic Island / kilit ekranı düğmeleri. Uygulama ve eklenti bu dosyayı birlikte derler.
// LiveActivityIntent'in perform() işlevi uygulama sürecinde çalışır; komutu native oynatıcıya iletir.
private func sendRemote(_ command: String, id: String? = nil) {
  var info: [String: Any] = ["command": command]
  if let id { info["id"] = id }
  NotificationCenter.default.post(
    name: Notification.Name("FrekansRemote"), object: nil, userInfo: info)
}

struct TogglePlaybackIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Oynat / Duraklat"
  func perform() async throws -> some IntentResult {
    sendRemote("toggle")
    return .result()
  }
}

struct NextStationIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Sonraki radyo"
  func perform() async throws -> some IntentResult {
    sendRemote("next")
    return .result()
  }
}

struct PreviousStationIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Önceki radyo"
  func perform() async throws -> some IntentResult {
    sendRemote("previous")
    return .result()
  }
}

struct PlayStationIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Radyoyu çal"

  @Parameter(title: "Radyo")
  var stationId: String

  init() { stationId = "" }
  init(stationId: String) { self.stationId = stationId }

  func perform() async throws -> some IntentResult {
    sendRemote("station", id: stationId)
    return .result()
  }
}
