import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct FrekansApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  // Arayüz uygulamanın "ada" paneli (ekran çentiğinin altında/yanında); pencere sahnesi yok.
  var body: some Scene {
    Settings { EmptyView() }
  }
}

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  // Tek bir React görünümü: ada daralıp genişlese de durum korunur.
  lazy var rootView: NSView = reactNativeFactory.rootViewFactory.view(withModuleName: "Frekans")

  var island: IslandController?
  var statusItem: NSStatusItem?

  override init() {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    super.init()
  }

  // frekans:// bağlantısı (paylaşılan radyo)
  func application(_ application: NSApplication, open urls: [URL]) {
    if let url = urls.first {
      FrekansLinks.deliver(url)
    }
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)
    let island = IslandController(rootView: rootView)
    self.island = island
    island.show()
    setupStatusItem()
#if DEBUG
    startDebugProbe()
#endif
  }

  // Menü çubuğu simgesi: tıklayınca adayı sabitler/bırakır, sağ tık menüsünde "Çık" var.
  private func setupStatusItem() {
    let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    item.button?.image = IslandIcons.barsTemplate()
    item.button?.target = self
    item.button?.action = #selector(statusItemClicked)
    item.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])
    statusItem = item
  }

  @objc private func statusItemClicked() {
    if NSApp.currentEvent?.type == .rightMouseUp {
      let menu = NSMenu()
      menu.addItem(withTitle: (island?.pinned ?? false) ? "Adayı bırak" : "Adayı sabitle", action: #selector(togglePin), keyEquivalent: "")
      menu.addItem(NSMenuItem.separator())
      menu.addItem(withTitle: "Frekans'tan çık", action: #selector(quit), keyEquivalent: "q")
      menu.items.forEach { $0.target = self }
      statusItem?.menu = menu
      statusItem?.button?.performClick(nil)
      statusItem?.menu = nil
    } else {
      togglePin()
    }
  }

  @objc private func togglePin() { island?.togglePinned() }
  @objc private func quit() { NSApp.terminate(nil) }
}

// MARK: - Ada paneli (çentik adası)

final class IslandPanel: NSPanel {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { false }
  // Menü çubuğunun üstüne taşabilsin (çentik bölgesi)
  override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect { frameRect }
}

final class HoverView: NSView {
  var onEnter: (() -> Void)?
  var onExit: (() -> Void)?

  override func updateTrackingAreas() {
    trackingAreas.forEach(removeTrackingArea)
    addTrackingArea(
      NSTrackingArea(
        rect: bounds, options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
        owner: self, userInfo: nil))
    super.updateTrackingAreas()
  }

  override func mouseEntered(with event: NSEvent) { onEnter?() }
  override func mouseExited(with event: NSEvent) { onExit?() }
}

// Ekranın üst ortasında, çentiğin bulunduğu yerde duran panel. Daralmış halde çentiğin iki yanında
// radyo ve şarkı görünür; üzerine gelince genişleyip oynatıcıyı ve radyo listesini açar.
final class IslandController: NSObject, NSWindowDelegate {
  let panel: IslandPanel
  let container = HoverView()
  private(set) var expanded = false
  private(set) var pinned = false
  var frozen = false  // yalnızca hata ayıklama: durumu sabit tutar
  private var collapseWork: DispatchWorkItem?
  private var clickMonitor: Any?

  private let earWidth: CGFloat = 130
  // Genişlemiş ada iki boyutta: kısa kart (iOS Dynamic Island'daki gibi) ve uzun liste paneli
  private let cardSize = NSSize(width: 400, height: 218)
  private let tallSize = NSSize(width: 400, height: 568)
  private(set) var tall = false
  private var notchWidth: CGFloat = 0
  private var notchHeight: CGFloat = 0

  init(rootView: NSView) {
    panel = IslandPanel(
      contentRect: NSRect(x: 0, y: 0, width: 240, height: 30),
      styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    super.init()
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = false
    panel.isMovable = false
    panel.hidesOnDeactivate = false
    panel.becomesKeyOnlyIfNeeded = true
    panel.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.mainMenuWindow)) + 2)
    panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
    panel.delegate = self

    container.wantsLayer = true
    container.layer?.backgroundColor = NSColor.black.cgColor
    container.layer?.masksToBounds = true
    container.layer?.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]  // alt köşeler
    container.onEnter = { [weak self] in self?.hoverEntered() }
    container.onExit = { [weak self] in self?.hoverExited() }
    panel.contentView = container

    rootView.frame = container.bounds
    rootView.autoresizingMask = [.width, .height]
    container.addSubview(rootView)

    NotificationCenter.default.addObserver(
      self, selector: #selector(islandRequest(_:)), name: Notification.Name("FrekansIslandRequest"),
      object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(screensChanged),
      name: NSApplication.didChangeScreenParametersNotification, object: nil)
    clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) {
      [weak self] _ in
      guard let self, self.pinned, !self.panel.frame.contains(NSEvent.mouseLocation) else { return }
      self.pinned = false
      self.collapse()
    }
    measure()
  }

  // MARK: geometri

  private func targetScreen() -> NSScreen {
    NSScreen.screens.first { $0.safeAreaInsets.top > 0 } ?? NSScreen.main ?? NSScreen.screens[0]
  }

  private func measure() {
    let s = targetScreen()
    notchHeight = s.safeAreaInsets.top
    if let l = s.auxiliaryTopLeftArea, let r = s.auxiliaryTopRightArea {
      notchWidth = max(0, s.frame.width - l.width - r.width)
    } else {
      notchWidth = 0
    }
  }

  private var collapsedSize: NSSize {
    NSSize(
      width: notchWidth > 0 ? notchWidth + 2 * earWidth : 240,
      height: notchHeight > 0 ? notchHeight : 28)
  }

  private func frame(expanded: Bool) -> NSRect {
    let s = targetScreen()
    let body = tall ? tallSize : cardSize
    let size =
      expanded
      ? NSSize(width: body.width, height: body.height + notchHeight)
      : collapsedSize
    return NSRect(
      x: s.frame.midX - size.width / 2, y: s.frame.maxY - size.height, width: size.width,
      height: size.height)
  }

  // React tarafı kart ↔ uzun liste geçişini ister
  @objc private func islandRequest(_ note: Notification) {
    guard let wantTall = note.userInfo?["tall"] as? Bool, wantTall != tall else { return }
    tall = wantTall
    if expanded {
      panel.setFrame(frame(expanded: true), display: true)
    }
    publish()
  }

  @objc private func screensChanged() {
    measure()
    panel.setFrame(frame(expanded: expanded), display: true)
    publish()
  }

  // MARK: durum

  func show() {
    panel.setFrame(frame(expanded: false), display: true)
    container.layer?.cornerRadius = 12
    panel.orderFrontRegardless()
    publish()
  }

  func togglePinned() {
    pinned.toggle()
    pinned ? expand() : collapse()
  }

  private func hoverEntered() {
    collapseWork?.cancel()
    expand()
  }

  private func hoverExited() {
    guard !pinned, !panel.isKeyWindow else { return }
    scheduleCollapse()
  }

  func windowDidResignKey(_ notification: Notification) {
    if !pinned, !panel.frame.contains(NSEvent.mouseLocation) { scheduleCollapse() }
  }

  private func scheduleCollapse() {
    collapseWork?.cancel()
    let work = DispatchWorkItem { [weak self] in self?.collapse() }
    collapseWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35, execute: work)
  }

  func expand() { setExpanded(true) }
  func collapse() { if !pinned && !frozen { setExpanded(false) } }

  private func setExpanded(_ on: Bool) {
    guard on != expanded else { return }
    expanded = on
    if !on { tall = false }
    publish()  // JS düzeni hemen değiştirsin, pencere animasyonla büyüsün
    container.layer?.cornerRadius = on ? 26 : 12
    // Pencere tek hamlede boyutlanır: kare kare animasyon React'in yerleşim işlemleriyle çakışıp
    // ShadowTree commit döngüsünü kilitliyordu. Yumuşaklık için içerik solarak gelir.
    panel.setFrame(frame(expanded: on), display: true)
    container.alphaValue = 0.0
    NSAnimationContext.runAnimationGroup { ctx in
      ctx.duration = 0.22
      container.animator().alphaValue = 1.0
    }
  }

  // React tarafına ada durumunu ve çentik ölçülerini bildirir
  private func publish() {
    let info: [String: Any] = [
      "expanded": expanded,
      "notchWidth": notchWidth,
      "notchHeight": notchHeight,
      "collapsedWidth": collapsedSize.width,
      "tall": tall,
    ]
    UserDefaults.standard.set(info, forKey: "frekans.islandInfo")
    NotificationCenter.default.post(name: Notification.Name("FrekansIsland"), object: nil, userInfo: info)
  }
}

// Menü çubuğu simgesi: tasarımdaki 5 çubuk (tek renk, şablon)
enum IslandIcons {
  static func barsTemplate() -> NSImage {
    let image = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { _ in
      NSColor.black.setFill()
      let bars: [(CGFloat, CGFloat)] = [(1.2, 6), (4.2, 10.5), (7.2, 15), (10.2, 9), (13.2, 5)]
      for (x, h) in bars {
        let r = NSRect(x: x + 1.5, y: (18 - h) / 2, width: 2.4, height: h)
        NSBezierPath(roundedRect: r, xRadius: 1.2, yRadius: 1.2).fill()
      }
      return true
    }
    image.isTemplate = true
    return image
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

#if DEBUG
// Geliştirme yardımcısı: FREKANS_DEBUG_SEQ=1 ile ada görüntüleri yerel dinleyiciye (localhost:9099/snap)
// gönderilir: önce daralmış hal, sonra üzerine gelinmiş (genişlemiş) hal.
extension AppDelegate {
  func startDebugProbe() {
    guard ProcessInfo.processInfo.environment["FREKANS_DEBUG_SEQ"] == "1", let island else { return }
    func snap() {
      guard let v = island.panel.contentView,
        let rep = v.bitmapImageRepForCachingDisplay(in: v.bounds) else { return }
      v.cacheDisplay(in: v.bounds, to: rep)
      if let png = rep.representation(using: .png, properties: [:]) {
        var req = URLRequest(url: URL(string: "http://localhost:9099/snap")!)
        req.httpMethod = "POST"
        req.httpBody = png
        URLSession.shared.dataTask(with: req).resume()
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 14) { snap() }
    island.frozen = true  // gerçek fare/tıklama olayları durumu bozmasın
    DispatchQueue.main.asyncAfter(deadline: .now() + 16) { island.expand() }
    DispatchQueue.main.asyncAfter(deadline: .now() + 24) { snap() }
    DispatchQueue.main.asyncAfter(deadline: .now() + 26) {
      NotificationCenter.default.post(
        name: Notification.Name("FrekansIslandRequest"), object: nil, userInfo: ["tall": true])
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 34) { snap() }
  }
}
#endif

// Paylaşılan frekans:// bağlantısını kaydeder; native oynatıcı modülü alıp çalar.
enum FrekansLinks {
  static func deliver(_ url: URL) {
    UserDefaults.standard.set(url.absoluteString, forKey: "frekans.pendingURL")
    NotificationCenter.default.post(name: Notification.Name("FrekansOpenURL"), object: nil)
  }
}
