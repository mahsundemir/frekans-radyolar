#!/usr/bin/env python3
"""Ham simülatör görüntülerinden mağaza ekran görüntülerini üretir.

    python3 compose.py            # ios/6.9 (1320x2868) ve ios/6.5 (1284x2778)

Girdi:  raw/ios/*.png (capture.sh)
Çıktı:  ios/<boyut>/NN-ad.png  (RGB, saydamlık yok)
"""
import math
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / "raw" / "ios"
FONT = HERE.parent / "app" / "assets" / "fonts" / "BricolageGrotesque-ExtraBold.ttf"

W, H = 1320, 2868          # tasarım tuvali: 6.9" iPhone
INK_DARK, INK_LIGHT = (23, 20, 31), (255, 255, 255)
SS = 3                      # kenar yumuşatma için büyütme katsayısı


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = map(f, c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ink_for(c):  # uygulamadaki inkFor ile aynı eşik
    return INK_DARK if lum(c) > 0.2 else INK_LIGHT


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rr_mask(size, radius):
    w, h = size
    m = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), radius * SS, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def background(accent):
    """Üstten alta hafif koyulaşan zemin + arkada marka motifi (ses çubukları)."""
    top, bot = mix(accent, (255, 255, 255), 0.10), mix(accent, (0, 0, 0), 0.28)
    g = Image.new("RGB", (1, H))
    for y in range(H):
        g.putpixel((0, y), mix(top, bot, y / (H - 1)))
    img = g.resize((W, H))
    # telefonun arkasında yumuşak ışık
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-200, 1000, W + 200, 2700), fill=(*mix(accent, (255, 255, 255), 0.35), 70))
    img = Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(220)))
    return img


def phone(shot_path, width, notch=True):
    """Ekran görüntüsünü ince siyah çerçeveli cihaz içine koyar. RGBA döner."""
    shot = Image.open(shot_path).convert("RGB")
    if notch:  # Dynamic Island: simülatör görüntülerinde her zaman çizilmiyor, hepsine aynısını koy
        m = rr_mask((284, 112), 56)
        shot.paste(Image.new("RGB", (284, 112), (0, 0, 0)), (517, 41), m)
    bez = round(width * 0.018)
    sw = width - 2 * bez
    sh = round(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    full = (width, sh + 2 * bez)
    out = Image.new("RGBA", full, (0, 0, 0, 0))
    body = Image.new("RGBA", (full[0] - 4, full[1] - 4), (14, 13, 18, 255))
    # çerçeve dış kenar çizgisi (titanyum hissi)
    edge = Image.new("RGBA", full, (70, 68, 78, 255))
    outer_r = round(width * 0.135)
    out.paste(edge, (0, 0), rr_mask(full, outer_r))
    inner = (full[0] - 4, full[1] - 4)
    out.paste(body, (2, 2), rr_mask(inner, outer_r - 2))
    out.paste(shot, (bez, bez), rr_mask((sw, sh), round(outer_r - bez * 0.9)))
    return out


def shadow(img, blur=60, dy=40, alpha=120):
    a = img.getchannel("A").point(lambda v: v * alpha // 255)
    pad = blur * 3
    sh = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    black = Image.new("RGBA", img.size, (0, 0, 0, 255))
    sh.paste(black, (pad, pad + dy), a)
    return sh.filter(ImageFilter.GaussianBlur(blur)), pad


def place(canvas, ph, x, y, angle=0):
    if angle:
        ph = ph.rotate(angle, resample=Image.BICUBIC, expand=True)
    sh, pad = shadow(ph)
    canvas.alpha_composite(sh, (x - pad, y - pad))
    canvas.alpha_composite(ph, (x, y))


def text_block(canvas, lines, accent, y, size=114, sub=None):
    ink = ink_for(accent)
    d = ImageDraw.Draw(canvas)
    f = ImageFont.truetype(str(FONT), size)
    for ln in lines:
        w = d.textlength(ln, font=f)
        d.text(((W - w) / 2, y), ln, font=f, fill=ink)
        y += round(size * 1.04)
    if sub:
        fs = ImageFont.truetype(str(FONT), round(size * 0.37))
        w = d.textlength(sub, font=fs)
        d.text(((W - w) / 2, y + 26), sub, font=fs, fill=mix(ink, accent, 0.22))
        y += 26 + fs.size
    return y


# ---- Slayt tanımları -------------------------------------------------------
# kind "single": tek telefon;  "trio": üç telefon (renk dizisi)
SLIDES = [
    dict(name="01-canli-radyo", kind="single", raw="player-pop", accent="#1B1826",
         lines=["Türkiye'nin radyoları", "tek dokunuşta"], sub="Pop'tan arabeske, haberden spora"),
    dict(name="02-calan-sarki", kind="single", raw="player-metro", accent="#6A47FF",
         lines=["Şu an çalan", "şarkıyı gör"], sub="Şarkı ve sanatçı, yayından anında"),
    dict(name="03-renkli", kind="trio", raws=["player-arabesk", "player-virgin", "player-retro"],
         accent="#1B1826", lines=["Her tür", "kendi renginde"], sub="Radyo değişince ekran da değişir"),
    dict(name="04-liste", kind="single", raw="list", accent="#2DD4A8",
         lines=["Tüm radyolar", "tek listede"], sub="Ara, aç, kapat: liste senin"),
    dict(name="05-favoriler", kind="single", raw="player-halk", accent="#FF6FB5",
         lines=["Favorilerin hep", "elinin altında"], sub="Kalbe dokun, listene eklensin"),
    dict(name="06-uyku", kind="single", raw="player-sleep", accent="#34C8FF",
         lines=["Müzikle", "uykuya dal"], sub="Süre dolunca ses yavaşça kısılır"),
]




def build(slide):
    acc = hexrgb(slide["accent"])
    canvas = background(acc)
    y = text_block(canvas, slide["lines"], acc, 200, sub=slide.get("sub"))
    top = y + 150
    if slide["kind"] == "single":
        pw = 1060
        ph = phone(RAW / f"{slide['raw']}.png", pw)
        place(canvas, ph, (W - pw) // 2, top)
    else:
        a, b, c = slide["raws"]
        side_w, mid_w = 820, 1060
        pl = phone(RAW / f"{a}.png", side_w)
        pr = phone(RAW / f"{c}.png", side_w)
        pm = phone(RAW / f"{b}.png", mid_w)
        place(canvas, pl, -170, top + 230, angle=7)
        place(canvas, pr, W - side_w + 170, top + 230, angle=-7)
        place(canvas, pm, (W - mid_w) // 2, top + 20)
    return canvas.convert("RGB")


def main():
    only = sys.argv[1:]
    sizes = {"6.9": (1320, 2868), "6.5": (1284, 2778)}
    for slide in SLIDES:
        if only and not any(o in slide["name"] for o in only):
            continue
        img = build(slide)
        for label, size in sizes.items():
            out = HERE / "ios" / label
            out.mkdir(parents=True, exist_ok=True)
            res = img if size == (W, H) else img.resize(size, Image.LANCZOS)
            res.save(out / f"{slide['name']}.png", optimize=True)
        print("ok", slide["name"])


if __name__ == "__main__":
    main()
