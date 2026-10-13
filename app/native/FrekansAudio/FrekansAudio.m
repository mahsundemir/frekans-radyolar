#import "FrekansAudio.h"
#import <AVFoundation/AVFoundation.h>
#import <MediaPlayer/MediaPlayer.h>
#import <ImageIO/ImageIO.h>
#import <CommonCrypto/CommonDigest.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface FrekansAudio () <AVPlayerItemMetadataOutputPushDelegate>
@property (nonatomic, strong) AVPlayer *player;
@property (nonatomic, strong) AVPlayerItem *item;
@property (nonatomic, strong) AVPlayerItemMetadataOutput *metaOutput;
@property (nonatomic, copy) NSString *station;
@property (nonatomic, copy) NSString *stationId;
@property (nonatomic, copy) NSString *streamURL;
@property (nonatomic, copy) NSString *colorHex;
@property (nonatomic, copy) NSString *shortName;
@property (nonatomic, copy) NSString *logoURL;
@property (nonatomic, strong) NSData *logoData;
@property (nonatomic, copy) NSString *trackTitle;
@property (nonatomic, copy) NSString *trackArtist;
@property (nonatomic, copy) NSArray *quickStations;
@property (nonatomic, strong) NSTimer *sleepTimer;
@property (nonatomic, strong) NSTimer *fadeTimer;
@property (nonatomic, assign) float volumeBeforeFade;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, assign) BOOL remoteReady;
@property (nonatomic, assign) BOOL carPlay;  // iOS: CarPlay bağlıyken sistem oynatıcısı (Now Playing) açılır
@end

static void *kItemStatusContext = &kItemStatusContext;
static void *kTimeControlContext = &kTimeControlContext;

@implementation FrekansAudio

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return YES; }

- (instancetype)init {
  if ((self = [super init])) {
    // Swift tarafı (SceneDelegate / AppDelegate) frekans:// bağlantısını kaydedip bildirim gönderir.
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handlePendingURL) name:@"FrekansOpenURL" object:nil];
    // macOS çentik adası: genişleme/daralma ve çentik ölçüleri (Swift tarafı bildirir)
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleIsland:) name:@"FrekansIsland" object:nil];
    // Dynamic Island / kilit ekranı düğmeleri (iOS): oynat-duraklat, önceki, sonraki, radyo seç
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleRemote:) name:@"FrekansRemote" object:nil];
    // CarPlay sahnesi bağlandı / ayrıldı (iOS, CarPlaySceneDelegate bildirir)
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleCarPlay:) name:@"FrekansCarPlay" object:nil];
    dispatch_async(dispatch_get_main_queue(), ^{ [self handlePendingURL]; });
  }
  return self;
}

- (void)dealloc { [[NSNotificationCenter defaultCenter] removeObserver:self]; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"onState", @"onMetadata", @"onRemote", @"onPlayRequest", @"onSleep", @"onIsland"]; }
- (void)startObserving { self.hasListeners = YES; }
- (void)stopObserving { self.hasListeners = NO; }

- (void)emit:(NSString *)name body:(id)body {
#if DEBUG
  NSLog(@"[FrekansAudio] %@ %@", name, body);
#endif
  if (self.hasListeners) { [self sendEventWithName:name body:body]; }
}

#pragma mark - JS API

RCT_EXPORT_METHOD(play:(NSString *)urlString station:(NSString *)station stationId:(NSString *)stationId
                  color:(NSString *)color short:(NSString *)shortName logo:(NSString *)logo) {
  self.colorHex = color;
  self.shortName = shortName;
  [self setLogoAndPrepare:logo];
  [self startURL:urlString station:station stationId:stationId];
}

// Paylaşılan bağlantıyla açılan radyonun rengi/kısaltması JS'ten sonradan bildirilir
RCT_EXPORT_METHOD(setStyle:(NSString *)color short:(NSString *)shortName logo:(NSString *)logo) {
  self.colorHex = color;
  self.shortName = shortName;
  [self setLogoAndPrepare:logo];
  [self postNowPlaying];
}

// Logoyu indirir (paylaşılan klasöre); hazır olunca canlı etkinlik güncellenir
- (void)setLogoAndPrepare:(NSString *)logo {
  self.logoURL = logo.length ? logo : nil;
  self.logoData = nil;
  if (!self.logoURL) { return; }
  __weak FrekansAudio *weakSelf = self;
  NSString *url = self.logoURL;
  EnsureLogo(url, ^(NSString *key, NSError *err) {
    if (!key) { return; }
    NSData *thumb = LogoThumbData([LogosDir() stringByAppendingPathComponent:[key stringByAppendingString:@".png"]]);
    dispatch_async(dispatch_get_main_queue(), ^{
      if (![weakSelf.logoURL isEqualToString:url]) { return; }  // radyo bu arada değişti
      weakSelf.logoData = thumb;
#if DEBUG
      NSLog(@"[FrekansAudio] logo küçük görsel: %lu bayt", (unsigned long)thumb.length);
#endif
      [weakSelf postNowPlaying];
    });
  });
}

// Şu an native tarafta çalan radyo (JS sonradan açıldığında arayüzü eşitlemek için)
RCT_EXPORT_METHOD(getCurrent:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  if (!self.stationId.length) { resolve([NSNull null]); return; }
  resolve(@{@"id": self.stationId, @"name": self.station ?: @"", @"url": self.streamURL ?: @"",
            @"playing": @(self.player.timeControlStatus != AVPlayerTimeControlStatusPaused)});
}

- (void)startURL:(NSString *)urlString station:(NSString *)station stationId:(NSString *)stationId {
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) { [self emit:@"onState" body:@{@"state": @"error", @"message": @"Geçersiz adres"}]; return; }
  self.station = station;
  self.stationId = stationId;
  self.streamURL = urlString;
  self.trackTitle = nil;
  self.trackArtist = nil;
  [self configureSession];
  [self teardownItem];

  AVPlayerItem *item = [AVPlayerItem playerItemWithURL:url];
  AVPlayerItemMetadataOutput *out = [[AVPlayerItemMetadataOutput alloc] initWithIdentifiers:nil];
  [out setDelegate:self queue:dispatch_get_main_queue()];
  [item addOutput:out];
  [item addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionNew context:kItemStatusContext];
  self.item = item;
  self.metaOutput = out;

  if (!self.player) {
    self.player = [[AVPlayer alloc] init];
    self.player.automaticallyWaitsToMinimizeStalling = YES;
    [self.player addObserver:self forKeyPath:@"timeControlStatus" options:NSKeyValueObservingOptionNew context:kTimeControlContext];
  }
  [self.player replaceCurrentItemWithPlayerItem:item];
  [self.player play];
  [self setupRemoteCommands];
  [self updateNowPlayingTitle:nil artist:nil];
  [self emit:@"onState" body:@{@"state": @"buffering"}];
  [self postNowPlaying];
}

- (void)handleIsland:(NSNotification *)n {
  if (n.userInfo) { [self emit:@"onIsland" body:n.userInfo]; }
}

// Mac adası: kart (kısa) ↔ liste paneli (uzun) geçişi
RCT_EXPORT_METHOD(setIslandTall:(BOOL)tall) {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FrekansIslandRequest" object:nil userInfo:@{@"tall": @(tall)}];
}

// Pil tasarrufu: iOS canlı etkinlik güncellemeleri (kayan yazı/dalga karesi) durur
RCT_EXPORT_METHOD(setEnergySaver:(BOOL)on) {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FrekansEnergy" object:nil userInfo:@{@"saver": @(on)}];
}

// macOS çentik adasının son durumu (JS açıldığında düzeni kurmak için)
RCT_EXPORT_METHOD(getIslandInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  NSDictionary *info = [[NSUserDefaults standardUserDefaults] dictionaryForKey:@"frekans.islandInfo"];
  resolve(info ?: [NSNull null]);
}

- (void)handleRemote:(NSNotification *)n {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *cmd = n.userInfo[@"command"];
    if ([cmd isEqualToString:@"toggle"]) {
      if (!self.player.currentItem) { return; }
      if (self.player.timeControlStatus == AVPlayerTimeControlStatusPaused) { [self.player play]; }
      else { [self.player pause]; }
    } else if (cmd.length) {
      // sonraki / önceki / station: radyo listesi JS'te olduğu için olay olarak iletilir
      NSMutableDictionary *body = [@{@"command": cmd} mutableCopy];
      if (n.userInfo[@"id"]) { body[@"id"] = n.userInfo[@"id"]; }
      [self emit:@"onRemote" body:body];
    }
  });
}

// Araç ekranları (CarPlay / Android Auto) için radyo listesi + favoriler (JSON).
// Kalıcı saklanır: uygulama arka planda, yalnızca araçtan açıldığında da liste hazır olsun.
RCT_EXPORT_METHOD(setCatalog:(NSString *)json) {
  [[NSUserDefaults standardUserDefaults] setObject:json forKey:@"frekans.carCatalog"];
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FrekansCatalog" object:nil];
}

// CarPlay bağlıyken sistem Now Playing bilgisi ve uzaktan komutlar açılır, ayrılınca kapanır.
// (iPhone'da kilit ekranı oynatıcısı normalde kapalı; bkz. updateNowPlayingTitle)
- (void)handleCarPlay:(NSNotification *)n {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.carPlay = [n.userInfo[@"connected"] boolValue];
#if TARGET_OS_IOS
    if (self.carPlay) {
      [self setupRemoteCommands];
      [self updateNowPlayingTitle:self.trackTitle artist:self.trackArtist];
    } else {
      MPNowPlayingInfoCenter.defaultCenter.nowPlayingInfo = nil;
    }
    [self setRemoteCommandsEnabled:self.carPlay];
#endif
  });
}

// Genişletilmiş adadaki hızlı seçim için radyolar (JS: favoriler önce)
RCT_EXPORT_METHOD(setQuick:(NSArray *)list) {
  self.quickStations = list;
  [self postNowPlaying];
}

// frekans://radyo/<id>?u=<https yayın adresi>&n=<ad>
- (void)handlePendingURL {
  NSUserDefaults *d = [NSUserDefaults standardUserDefaults];
  NSString *s = [d stringForKey:@"frekans.pendingURL"];
  if (!s.length) { return; }
  [d removeObjectForKey:@"frekans.pendingURL"];
  NSURLComponents *c = [NSURLComponents componentsWithString:s];
  if (![c.scheme isEqualToString:@"frekans"] || ![c.host isEqualToString:@"radyo"]) { return; }
  NSString *rid = [c.path hasPrefix:@"/"] ? [c.path substringFromIndex:1] : c.path;
  NSString *stream = nil, *name = nil;
  for (NSURLQueryItem *q in c.queryItems) {
    if ([q.name isEqualToString:@"u"]) { stream = q.value; }
    if ([q.name isEqualToString:@"n"]) { name = q.value; }
  }
  // Yalnızca https yayınları kabul edilir
  if (!rid.length || ![stream hasPrefix:@"https://"]) { return; }
  [self startURL:stream station:(name.length ? name : rid) stationId:rid];
  [self emit:@"onPlayRequest" body:@{@"id": rid, @"name": name ?: rid, @"url": stream}];
}

// Uyku zamanlayıcı: native taraf zamanlar, böylece panel/ekran kapalıyken de çalışır.
// 0 dakika zamanlayıcıyı iptal eder. Süre dolunca ses 5 saniyede kısılır ve yayın durur.
#pragma mark - Logolar

static NSString *LogoKey(NSString *urlString) {
  unsigned char digest[CC_SHA1_DIGEST_LENGTH];
  NSData *keyData = [urlString dataUsingEncoding:NSUTF8StringEncoding];
  CC_SHA1(keyData.bytes, (CC_LONG)keyData.length, digest);
  NSMutableString *name = [NSMutableString string];
  for (int i = 0; i < 10; i++) { [name appendFormat:@"%02x", digest[i]]; }
  return name;
}

static NSString *LogosDir(void) {
  NSString *base = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject stringByAppendingPathComponent:@"FrekansLogos"];
  [[NSFileManager defaultManager] createDirectoryAtPath:base withIntermediateDirectories:YES attributes:nil error:nil];
  return base;
}

static BOOL WritePNG(CGImageRef img, NSString *path) {
  CGImageDestinationRef dst = CGImageDestinationCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:path], (__bridge CFStringRef)UTTypePNG.identifier, 1, NULL);
  if (!dst) { return NO; }
  CGImageDestinationAddImage(dst, img, NULL);
  BOOL ok = CGImageDestinationFinalize(dst);
  CFRelease(dst);
  return ok;
}

// Logoyu indirir, renkli ve siyah-beyaz PNG olarak yazar: <anahtar>.png ve <anahtar>-bw.png
static void EnsureLogo(NSString *urlString, void (^done)(NSString *key, NSError *err)) {
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url || ![url.scheme isEqualToString:@"https"]) {
    done(nil, [NSError errorWithDomain:@"Frekans" code:1 userInfo:@{NSLocalizedDescriptionKey: @"Geçersiz logo adresi"}]);
    return;
  }
  NSString *key = LogoKey(urlString);
  NSString *dir = LogosDir();
  NSString *color = [dir stringByAppendingPathComponent:[key stringByAppendingString:@".png"]];
  NSString *bw = [dir stringByAppendingPathComponent:[key stringByAppendingString:@"-bw.png"]];
  NSFileManager *fm = [NSFileManager defaultManager];
  if ([fm fileExistsAtPath:color] && [fm fileExistsAtPath:bw]) { done(key, nil); return; }

  [[[NSURLSession sharedSession] dataTaskWithURL:url completionHandler:^(NSData *data, NSURLResponse *resp, NSError *err) {
    if (!data.length || err) { done(nil, err ?: [NSError errorWithDomain:@"Frekans" code:2 userInfo:nil]); return; }
    CGImageSourceRef src = CGImageSourceCreateWithData((__bridge CFDataRef)data, NULL);
    if (!src) { done(nil, [NSError errorWithDomain:@"Frekans" code:3 userInfo:nil]); return; }
    NSDictionary *opts = @{(id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
                           (id)kCGImageSourceCreateThumbnailWithTransform: @YES,
                           (id)kCGImageSourceThumbnailMaxPixelSize: @256};
    CGImageRef img = CGImageSourceCreateThumbnailAtIndex(src, 0, (__bridge CFDictionaryRef)opts);
    CFRelease(src);
    if (!img) { done(nil, [NSError errorWithDomain:@"Frekans" code:3 userInfo:nil]); return; }
    size_t w = CGImageGetWidth(img), h = CGImageGetHeight(img);
    CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
    CGContextRef ctx = CGBitmapContextCreate(NULL, w, h, 8, w * 4, cs, (CGBitmapInfo)kCGImageAlphaPremultipliedLast);
    CGColorSpaceRelease(cs);
    CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), img);
    CGImageRef colorImg = CGBitmapContextCreateImage(ctx);  // renkli kopya (normalleştirilmiş RGBA)
    uint8_t *px = CGBitmapContextGetData(ctx);
    for (size_t i = 0; i < w * h; i++) {
      uint8_t *p = px + i * 4;  // önceden çarpılmış RGBA: parlaklık aynı oranda korunur
      uint8_t g = (uint8_t)(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]);
      p[0] = p[1] = p[2] = g;
    }
    CGImageRef bwImg = CGBitmapContextCreateImage(ctx);
    CGContextRelease(ctx);
    CGImageRelease(img);
    BOOL ok = WritePNG(colorImg, color) && WritePNG(bwImg, bw);
    CGImageRelease(colorImg);
    CGImageRelease(bwImg);
    done(ok ? key : nil, ok ? nil : [NSError errorWithDomain:@"Frekans" code:4 userInfo:nil]);
  }] resume];
}

// Canlı etkinliğe giden küçük logo: ActivityKit durumu en çok ~4 KB olabildiği için beyaz zeminde
// 56 px JPEG, boyut ~1,8 KB'ın altına inene kadar kalite düşürülür. Eklenti ağdan görsel yükleyemez.
static NSData *LogoThumbData(NSString *colorPath) {
  CGImageSourceRef src = CGImageSourceCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:colorPath], NULL);
  if (!src) { return nil; }
  CGImageRef img = CGImageSourceCreateImageAtIndex(src, 0, NULL);
  CFRelease(src);
  if (!img) { return nil; }
  NSData *best = nil;
  for (NSNumber *sizeN in @[@56, @48, @40]) {
    int s = sizeN.intValue;
    CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
    CGContextRef ctx = CGBitmapContextCreate(NULL, s, s, 8, s * 4, cs, (CGBitmapInfo)kCGImageAlphaNoneSkipLast);
    CGColorSpaceRelease(cs);
    CGContextSetRGBFillColor(ctx, 1, 1, 1, 1);
    CGContextFillRect(ctx, CGRectMake(0, 0, s, s));
    CGFloat iw = CGImageGetWidth(img), ih = CGImageGetHeight(img);
    CGFloat scale = MIN((s * 0.84) / iw, (s * 0.84) / ih);
    CGFloat w = iw * scale, h = ih * scale;
    CGContextSetInterpolationQuality(ctx, kCGInterpolationHigh);
    CGContextDrawImage(ctx, CGRectMake((s - w) / 2, (s - h) / 2, w, h), img);
    CGImageRef flat = CGBitmapContextCreateImage(ctx);
    CGContextRelease(ctx);
    for (NSNumber *q in @[@0.6, @0.45, @0.3]) {
      NSMutableData *out = [NSMutableData data];
      CGImageDestinationRef dst = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)out, (__bridge CFStringRef)UTTypeJPEG.identifier, 1, NULL);
      CGImageDestinationAddImage(dst, flat, (__bridge CFDictionaryRef)@{(id)kCGImageDestinationLossyCompressionQuality: q});
      BOOL ok = CGImageDestinationFinalize(dst);
      CFRelease(dst);
      if (ok && out.length > 0) {
        best = out;
        if (out.length <= 1800) { CGImageRelease(flat); CGImageRelease(img); return out; }
      }
    }
    CGImageRelease(flat);
  }
  CGImageRelease(img);
  return (best.length <= 2400) ? best : nil;
}

// Radyo logosunun siyah-beyaz kopyasını üretir (iOS ve macOS ortak). Sonuç file:// adresi; açılmayan görselde hata verir.
RCT_EXPORT_METHOD(grayLogo:(NSString *)urlString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  EnsureLogo(urlString, ^(NSString *key, NSError *err) {
    if (!key) { reject(@"logo", @"Logo hazırlanamadı", err); return; }
    NSString *path = [LogosDir() stringByAppendingPathComponent:[key stringByAppendingString:@"-bw.png"]];
    resolve([NSURL fileURLWithPath:path].absoluteString);
  });
}

RCT_EXPORT_METHOD(startSleepTimer:(double)minutes) {
  [self.sleepTimer invalidate];
  self.sleepTimer = nil;
  if (self.fadeTimer) { [self cancelFade]; }
  if (minutes <= 0) {
    [self emit:@"onSleep" body:@{@"endsAt": @0}];
    return;
  }
  NSTimeInterval secs = minutes * 60.0;
  self.sleepTimer = [NSTimer scheduledTimerWithTimeInterval:secs target:self selector:@selector(sleepFired) userInfo:nil repeats:NO];
  double endsAt = ([[NSDate date] timeIntervalSince1970] + secs) * 1000.0;
  [self emit:@"onSleep" body:@{@"endsAt": @(endsAt)}];
}

- (void)sleepFired {
  self.sleepTimer = nil;
  self.volumeBeforeFade = self.player.volume;
  __block int step = 0;
  __weak FrekansAudio *weakSelf = self;
  self.fadeTimer = [NSTimer scheduledTimerWithTimeInterval:0.25 repeats:YES block:^(NSTimer *timer) {
    FrekansAudio *s = weakSelf;
    if (!s) { [timer invalidate]; return; }
    step++;
    s.player.volume = s.volumeBeforeFade * MAX(0.0f, 1.0f - step / 20.0f);
    if (step >= 20) {
      [timer invalidate];
      s.fadeTimer = nil;
      [s.player pause];
      s.player.volume = s.volumeBeforeFade;
      [s emit:@"onSleep" body:@{@"endsAt": @0, @"fired": @YES}];
    }
  }];
}

- (void)cancelFade {
  [self.fadeTimer invalidate];
  self.fadeTimer = nil;
  self.player.volume = self.volumeBeforeFade;
}

RCT_EXPORT_METHOD(pause) { [self.player pause]; }

RCT_EXPORT_METHOD(resume) {
  if (self.player.currentItem) { [self.player play]; }
}

RCT_EXPORT_METHOD(stop) {
  [self.player pause];
  [self teardownItem];
  [self.player replaceCurrentItemWithPlayerItem:nil];
  MPNowPlayingInfoCenter.defaultCenter.nowPlayingInfo = nil;
  self.stationId = nil;
  [self emit:@"onState" body:@{@"state": @"stopped"}];
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FrekansNowPlaying" object:nil userInfo:@{@"ended": @YES}];
}

// Basit kalıcı depo (NSUserDefaults): favoriler, ayarlar ve liste önbelleği için
RCT_EXPORT_METHOD(storageGet:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSString *v = [[NSUserDefaults standardUserDefaults] stringForKey:key];
  resolve(v ?: [NSNull null]);
}

RCT_EXPORT_METHOD(storageSet:(NSString *)key value:(NSString *)value) {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:key];
}

RCT_EXPORT_METHOD(quit) {
#if TARGET_OS_OSX
  [NSApp terminate:nil];
#endif
}

RCT_EXPORT_METHOD(setVolume:(double)volume) {
  self.player.volume = (float)MAX(0.0, MIN(1.0, volume));
}

#pragma mark - Session / now playing

- (void)configureSession {
#if TARGET_OS_IOS
  AVAudioSession *s = [AVAudioSession sharedInstance];
  [s setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeDefault options:0 error:nil];
  [s setActive:YES error:nil];
#endif
}

// Swift tarafı (iOS: Dynamic Island / Live Activity) bu bildirimi dinler.
- (void)postNowPlaying {
  if (!self.stationId.length) { return; }
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FrekansNowPlaying" object:nil userInfo:@{
    @"stationId": self.stationId,
    @"name": self.station ?: @"",
    @"short": self.shortName ?: @"",
    @"color": self.colorHex ?: @"#FF5B4A",
    @"title": self.trackTitle ?: @"",
    @"artist": self.trackArtist ?: @"",
    @"playing": @(self.player.timeControlStatus != AVPlayerTimeControlStatusPaused),
    @"logoData": self.logoData ?: [NSNull null],
    @"quick": self.quickStations ?: @[],
  }];
}

- (void)updateNowPlayingTitle:(NSString *)title artist:(NSString *)artist {
  self.trackTitle = title;
  self.trackArtist = artist;
#if TARGET_OS_IOS
  // iPhone'da sistemin kilit ekranı oynatıcısı gösterilmez; yalnızca kendi canlı etkinliğimiz çıkar.
  // İstisna: CarPlay bağlıyken araç ekranı bu bilgiyi kullanır.
  if (!self.carPlay) {
    MPNowPlayingInfoCenter.defaultCenter.nowPlayingInfo = nil;
    return;
  }
#endif
  NSMutableDictionary *info = [NSMutableDictionary dictionary];
  info[MPMediaItemPropertyTitle] = title.length ? title : (self.station ?: @"Frekans");
  info[MPMediaItemPropertyArtist] = artist.length ? artist : (self.station ?: @"");
  info[MPNowPlayingInfoPropertyIsLiveStream] = @YES;
  info[MPNowPlayingInfoPropertyPlaybackRate] = @(1.0);
  MPNowPlayingInfoCenter.defaultCenter.nowPlayingInfo = info;
}

- (void)setupRemoteCommands {
#if TARGET_OS_IOS
  if (!self.carPlay) { return; }  // iPhone: yalnızca CarPlay bağlıyken uzaktan komut kaydedilir
#endif
  if (self.remoteReady) { return; }
  self.remoteReady = YES;
  MPRemoteCommandCenter *c = MPRemoteCommandCenter.sharedCommandCenter;
  __weak FrekansAudio *weakSelf = self;
  [c.playCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *e) {
    [weakSelf.player play]; return MPRemoteCommandHandlerStatusSuccess; }];
  [c.pauseCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *e) {
    [weakSelf.player pause]; return MPRemoteCommandHandlerStatusSuccess; }];
  [c.togglePlayPauseCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *e) {
    if (weakSelf.player.timeControlStatus == AVPlayerTimeControlStatusPaused) { [weakSelf.player play]; }
    else { [weakSelf.player pause]; }
    return MPRemoteCommandHandlerStatusSuccess; }];
  [c.nextTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *e) {
    [weakSelf emit:@"onRemote" body:@{@"command": @"next"}]; return MPRemoteCommandHandlerStatusSuccess; }];
  [c.previousTrackCommand addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent *e) {
    [weakSelf emit:@"onRemote" body:@{@"command": @"previous"}]; return MPRemoteCommandHandlerStatusSuccess; }];
}

- (void)setRemoteCommandsEnabled:(BOOL)on {
  if (!self.remoteReady) { return; }
  MPRemoteCommandCenter *c = MPRemoteCommandCenter.sharedCommandCenter;
  for (MPRemoteCommand *cmd in @[c.playCommand, c.pauseCommand, c.togglePlayPauseCommand, c.nextTrackCommand, c.previousTrackCommand]) {
    cmd.enabled = on;
  }
}

#pragma mark - Observers

- (void)teardownItem {
  if (self.item) {
    @try { [self.item removeObserver:self forKeyPath:@"status" context:kItemStatusContext]; } @catch (NSException *e) {}
    if (self.metaOutput) { [self.item removeOutput:self.metaOutput]; }
  }
  self.item = nil;
  self.metaOutput = nil;
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context {
  if (context == kTimeControlContext) {
    NSString *state = @"paused";
    switch (self.player.timeControlStatus) {
      case AVPlayerTimeControlStatusPlaying: state = @"playing"; break;
      case AVPlayerTimeControlStatusWaitingToPlayAtSpecifiedRate: state = @"buffering"; break;
      default: state = @"paused"; break;
    }
    if (self.item && self.item.status == AVPlayerItemStatusFailed) { return; }
    [self emit:@"onState" body:@{@"state": state}];
    [self postNowPlaying];
  } else if (context == kItemStatusContext) {
    if (self.item.status == AVPlayerItemStatusFailed) {
      NSString *msg = self.item.error.localizedDescription ?: @"Yayın açılamadı";
      [self emit:@"onState" body:@{@"state": @"error", @"message": msg}];
    }
  } else {
    [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
  }
}

#pragma mark - Timed metadata (ICY / ID3)

- (void)metadataOutput:(AVPlayerItemMetadataOutput *)output
    didOutputTimedMetadataGroups:(NSArray<AVTimedMetadataGroup *> *)groups
             fromPlayerItemTrack:(AVPlayerItemTrack *)track {
  NSString *title = nil, *artist = nil, *streamTitle = nil;
  for (AVTimedMetadataGroup *g in groups) {
    for (AVMetadataItem *m in g.items) {
      NSString *v = m.stringValue;
      if (!v.length) { continue; }
      if ([m.identifier isEqualToString:AVMetadataIdentifierIcyMetadataStreamTitle]) { streamTitle = v; }
      else if ([m.identifier isEqualToString:AVMetadataIdentifierID3MetadataTitleDescription]) { title = v; }
      else if ([m.identifier isEqualToString:AVMetadataIdentifierID3MetadataLeadPerformer]) { artist = v; }
    }
  }
  if (streamTitle.length && !title.length) {
    // "Sanatçı - Şarkı" biçimi
    NSRange r = [streamTitle rangeOfString:@" - "];
    if (r.location != NSNotFound) {
      artist = [streamTitle substringToIndex:r.location];
      title = [streamTitle substringFromIndex:r.location + r.length];
    } else {
      title = streamTitle;
    }
  }
  if (!title.length && !artist.length) { return; }
  [self updateNowPlayingTitle:title artist:artist];
  [self postNowPlaying];
  [self emit:@"onMetadata" body:@{@"title": title ?: @"", @"artist": artist ?: @""}];
}

@end
