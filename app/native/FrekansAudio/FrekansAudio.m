#import "FrekansAudio.h"
#import <AVFoundation/AVFoundation.h>
#import <MediaPlayer/MediaPlayer.h>

@interface FrekansAudio () <AVPlayerItemMetadataOutputPushDelegate>
@property (nonatomic, strong) AVPlayer *player;
@property (nonatomic, strong) AVPlayerItem *item;
@property (nonatomic, strong) AVPlayerItemMetadataOutput *metaOutput;
@property (nonatomic, copy) NSString *station;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, assign) BOOL remoteReady;
@end

static void *kItemStatusContext = &kItemStatusContext;
static void *kTimeControlContext = &kTimeControlContext;

@implementation FrekansAudio

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"onState", @"onMetadata", @"onRemote"]; }
- (void)startObserving { self.hasListeners = YES; }
- (void)stopObserving { self.hasListeners = NO; }

- (void)emit:(NSString *)name body:(id)body {
#if DEBUG
  NSLog(@"[FrekansAudio] %@ %@", name, body);
#endif
  if (self.hasListeners) { [self sendEventWithName:name body:body]; }
}

#pragma mark - JS API

RCT_EXPORT_METHOD(play:(NSString *)urlString station:(NSString *)station) {
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) { [self emit:@"onState" body:@{@"state": @"error", @"message": @"Geçersiz adres"}]; return; }
  self.station = station;
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
  [self emit:@"onState" body:@{@"state": @"stopped"}];
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

- (void)updateNowPlayingTitle:(NSString *)title artist:(NSString *)artist {
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
  [self emit:@"onMetadata" body:@{@"title": title ?: @"", @"artist": artist ?: @""}];
}

@end
