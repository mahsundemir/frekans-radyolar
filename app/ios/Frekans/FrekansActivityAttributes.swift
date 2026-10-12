import ActivityKit

// Uygulama ve Dynamic Island eklentisi bu dosyayı birlikte derler.
struct FrekansActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var stationId: String
    var name: String
    var short: String
    var colorHex: String
    var title: String
    var artist: String
    var playing: Bool
  }
}
