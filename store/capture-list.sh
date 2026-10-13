# Çekim listesi: shoot <dosya adı> <radyo id> <favoriler> <shot json> <bekleme sn>
FAVS8="super-fm,metro-fm,virgin-radio,slow-turk,halk-radyo,arabesk-fm,retro-turk,borusan-klasik"
FAVS3="metro-fm,virgin-radio,halk-radyo"
shoot player-pop     kiss-turk     "$FAVS8" '{}' 22
shoot player-metro   metro-fm      "$FAVS8" '{}' 22
shoot player-virgin  virgin-radio  "$FAVS8" '{}' 22
shoot player-arabesk arabesk-fm    "$FAVS8" '{}' 22
shoot player-retro   retro-turk    "$FAVS8" '{}' 22
shoot player-halk    halk-radyo    "$FAVS8" '{}' 22
shoot player-sleep   virgin-radio  "$FAVS8" '{"sleep":true}' 22
shoot list           metro-fm      "$FAVS3" '{"screen":"stations"}' 16
shoot search         halk-radyo    "$FAVS3" '{"screen":"stations","query":"nagme"}' 14
