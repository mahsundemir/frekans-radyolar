#import "FrekansAudio.h"
#import <AVFoundation/AVFoundation.h>
#import <MediaPlayer/MediaPlayer.h>

@interface FrekansAudio () <AVPlayerItemMetadataOutputPushDelegate>
@property (nonatomic, strong) AVPlayer *player;
@property (nonatomic, strong) AVPlayerItem *item;
@property (nonatomic, strong) AVPlayerItemMetadataOutput *metaOutput;
@property (nonatomic, copy) NSString *station;
@property (nonatomic, copy) NSString *stationId;
@property (nonatomic, copy) NSString *streamURL;
@property (nonatomic, copy) NSString *colorHex;
@property (nonatomic, copy) NSString *shortName;
@property (nonatomic, copy) NSString *trackTitle;
@property (nonatomic, copy) NSString *trackArtist;
@property (nonatomic, copy) NSArray *quickStations;
@property (nonatomic, strong) NSTimer *sleepTimer;
@property (nonatomic, strong) NSTimer *fadeTimer;
@property (nonatomic, assign) float volumeBeforeFade;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, assign) BOOL remoteReady;
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
    // Dynamic Island / kilit ekranı düğmeleri (iOS): oynat-duraklat, önceki, sonraki, radyo seç
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleRemote:) name:@"FrekansRemote" object:nil];
    dispatch_async(dispatch_get_main_queue(), ^{ [self handlePendingURL]; });
  }
  return self;
}

- (void)dealloc { [[NSNotificationCenter defaultCenter] removeObserver:self]; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"onState", @"onMetadata", @"onRemote", @"onPlayRequest", @"onSleep"]; }
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
                  color:(NSString *)color short:(NSString *)shortName) {
  self.colorHex = color;
  self.shortName = shortName;
  [self startURL:urlString station:station stationId:stationId];
}

// Paylaşılan bağlantıyla açılan radyonun rengi/kısaltması JS'ten sonradan bildirilir
RCT_EXPORT_METHOD(setStyle:(NSString *)color short:(NSString *)shortName) {
  self.colorHex = color;
  self.shortName = shortName;
  [self postNowPlaying];
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
    @"quick": self.quickStations ?: @[],
  }];
}

- (void)updateNowPlayingTitle:(NSString *)title artist:(NSString *)artist {
  self.trackTitle = title;
  self.trackArtist = artist;
  NSMutableDictionary *info = [NSMutableDictionary dictionary];
  info[MPMediaItemPropertyTitle] = title.length ? title : (self.station ?: @"Frekans");
  info[MPMediaItemPropertyArtist] = artist.length ? artist : (self.station ?: @"");
  info[MPNowPlayingInfoPropertyIsLiveStream] = @YES;
  info[MPNowPlayingInfoPropertyPlaybackRate] = @(1.0);
  MPNowPlayingInfoCenter.defaultCenter.nowPlayingInfo = info;
}

- (void)setupRemoteCommands {
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
