Pod::Spec.new do |s|
  s.name         = 'FrekansAudio'
  s.version      = '0.1.0'
  s.summary      = 'Frekans için iOS ve macOS ortak canlı yayın oynatıcısı'
  s.homepage     = 'https://github.com/mahsundemir/frekans-radyolar'
  s.license      = 'MIT'
  s.authors      = { 'Frekans' => 'frekans@example.com' }
  s.platforms    = { :ios => '15.1', :osx => '11.0' }
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.frameworks   = 'AVFoundation', 'MediaPlayer', 'ImageIO', 'UniformTypeIdentifiers'
  s.dependency 'React-Core'
end
