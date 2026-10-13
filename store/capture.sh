#!/bin/bash
# iPhone simülatöründen mağaza ekran görüntülerini çeker (ham, çerçevesiz).
# Gerekenler: Release derlemesi (app/ios/build/Build/Products/Release-iphonesimulator/Frekans.app)
# ve çekim için geçici src/shotHarness.ts yaraması (README'de anlatılıyor).
#
#   ./capture.sh <simülatör UDID>
set -euo pipefail
UDID="${1:?simülatör UDID gerekli (xcrun simctl list devices)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/../app/ios/build/Build/Products/Release-iphonesimulator/Frekans.app"
OUT="$HERE/raw/ios"
BID=com.mahsundemir.frekans
mkdir -p "$OUT"

sim() { xcrun simctl "$@"; }
dw() { sim spawn "$UDID" defaults write "$BID" "$@"; }

# Temiz durum çubuğu: 9:41, tam dolu pil ve sinyal
sim status_bar "$UDID" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState discharging --batteryLevel 100 >/dev/null

sim terminate "$UDID" $BID 2>/dev/null || true
sim install "$UDID" "$APP"

# prefs: favoriler + son çalan radyo; shot: ekran/arama/uyku durumu
prefs() { # lastId, favoriler (virgülle)
  local favs; favs=$(echo "$2" | sed 's/[^,]*/"&"/g')
  dw frekans.prefs -string "{\"enabled\":{},\"favorites\":[${favs}],\"volume\":0.8,\"lastId\":\"$1\"}"
}
shotstate() { dw frekans.shot -string "$1"; }

# shoot <ad> <radyo id> <favoriler> <shot json> <bekleme sn>
shoot() {
  local name="$1" id="$2" favs="$3" st="$4" wait="$5"
  sim terminate "$UDID" $BID 2>/dev/null || true
  prefs "$id" "$favs"
  shotstate "$st"
  # Radyoyu frekans:// bağlantısıyla başlat: bağlantı açılışta kayıtlı beklediği için
  # simctl openurl'ün "Açılsın mı?" penceresi çıkmaz
  dw frekans.pendingURL -string "$(python3 "$HERE/station-url.py" "$id")"
  sim launch "$UDID" $BID >/dev/null
  # Yayın bağlanıp şarkı bilgisi gelsin diye bekle
  sleep "$wait"
  sim io "$UDID" screenshot --type=png "$OUT/$name.png" >/dev/null
  echo "ok $name"
}

echo "hazır: $APP"
if [ "${2:-}" = "--list" ]; then exit 0; fi
# Çekim listesi capture-list.sh içinde (kaynak alınır): shoot satırları
# shellcheck disable=SC1091
source "$HERE/capture-list.sh"
