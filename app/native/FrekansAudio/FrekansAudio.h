#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// iOS ve macOS için ortak canlı yayın oynatıcı (AVPlayer).
// Olaylar: onState, onMetadata, onRemote
@interface FrekansAudio : RCTEventEmitter <RCTBridgeModule>
@end
