import ActivityKit

// Uygulama ve Dynamic Island eklentisi bu dosyayı birlikte derler.
struct FrekansActivityAttributes: ActivityAttributes {
  // Genişletilmiş adadaki hızlı radyo seçimi
  struct Quick: Codable, Hashable {
    var id: String
    var short: String
    var colorHex: String
  }

  struct ContentState: Codable, Hashable {
    var stationId: String
    var name: String
    var short: String
    var colorHex: String
    var title: String
    var artist: String
    var playing: Bool
    var quick: [Quick]
  }
}
