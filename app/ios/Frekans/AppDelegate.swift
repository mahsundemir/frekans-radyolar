import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }
}

// iOS 27 UIScene yaşam döngüsünü zorunlu kılıyor: pencere sahnede oluşturulur.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let app = UIApplication.shared.delegate as? AppDelegate,
      let factory = app.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(withModuleName: "Frekans", in: window, launchOptions: nil)

    // Uygulama bir bağlantıyla soğuk açıldıysa
    if let url = connectionOptions.urlContexts.first?.url {
      FrekansLinks.deliver(url)
    }
  }

  // Uygulama açıkken gelen bağlantı
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    if let url = URLContexts.first?.url {
      FrekansLinks.deliver(url)
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// Paylaşılan frekans:// bağlantısını kaydeder; native oynatıcı modülü alıp çalar.
enum FrekansLinks {
  static func deliver(_ url: URL) {
    UserDefaults.standard.set(url.absoluteString, forKey: "frekans.pendingURL")
    NotificationCenter.default.post(name: Notification.Name("FrekansOpenURL"), object: nil)
  }
}
