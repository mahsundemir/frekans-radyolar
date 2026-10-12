import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct FrekansApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  var body: some Scene {
    // Menü çubuğu uygulaması: Dock simgesi yok (Info.plist: LSUIElement), panel menü çubuğundan açılır.
    MenuBarExtra {
      ReactNativeView(rootView: appDelegate.rootView)
        .frame(width: 372, height: 700)
    } label: {
      Image(systemName: "waveform")
    }
    .menuBarExtraStyle(.window)
  }
}

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  // Panel her açıldığında yeniden oluşmasın: aynı React görünümü kullanılır, durum korunur.
  var debugWindow: NSWindow?

  lazy var rootView: NSView = reactNativeFactory.rootViewFactory.view(withModuleName: "Frekans")

  override init() {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    super.init()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
#if DEBUG
    startDebugProbe()
#endif
  }
}

// MARK: - React Native Delegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - React Native SwiftUI View

struct ReactNativeView: NSViewRepresentable {
  let rootView: NSView

  func makeNSView(context: Context) -> NSView {
    rootView
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}

#if DEBUG
// Geliştirme yardımcısı
extension AppDelegate {
  func startDebugProbe() {
    // FREKANS_DEBUG_WINDOW=1 ile panel yerine normal pencere açılır (ekran görüntüsü alınamayan ortamlar için).
    if ProcessInfo.processInfo.environment["FREKANS_DEBUG_WINDOW"] == "1" {
      let win = NSWindow(
        contentRect: NSRect(x: 200, y: 200, width: 372, height: 700),
        styleMask: [.titled, .closable],
        backing: .buffered,
        defer: false)
      win.contentView = rootView
      win.title = "Frekans (debug)"
      win.makeKeyAndOrderFront(nil)
      NSApp.activate(ignoringOtherApps: true)
      debugWindow = win
    }
    // FREKANS_SNAPSHOT_AFTER=<sn>: pencerenin görüntüsünü yerel dinleyiciye gönderir.
    if let after = ProcessInfo.processInfo.environment["FREKANS_SNAPSHOT_AFTER"], let secs = Double(after) {
      Timer.scheduledTimer(withTimeInterval: secs, repeats: false) { _ in
        guard let v = self.debugWindow?.contentView,
          let rep = v.bitmapImageRepForCachingDisplay(in: v.bounds) else { return }
        v.cacheDisplay(in: v.bounds, to: rep)
        if let png = rep.representation(using: .png, properties: [:]) {
          // Kum havuzlu uygulama dosya yazamaz; görüntü yerel dinleyiciye (localhost:9099/snap) gönderilir.
          var req = URLRequest(url: URL(string: "http://localhost:9099/snap")!)
          req.httpMethod = "POST"
          req.httpBody = png
          URLSession.shared.dataTask(with: req).resume()
        }
      }
    }
  }
}
#endif
