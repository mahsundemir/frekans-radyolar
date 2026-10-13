import ActivityKit
import Foundation

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
    var logoData: Data? = nil  // küçük JPEG logo (≈1,8 KB); yoksa baş harfler gösterilir
    var quick: [Quick]
    // Kayan yazı ve ses dalgası animasyonu için uygulama tarafından periyodik güncellenir
    var eq: Int = 0
    var ticker: String = ""
    var tickerShort: String = ""
  }
}
