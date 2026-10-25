#!/usr/bin/env python3
# Draws the wallpaper of the Cinema theme (themes/cinema/cinema.jpg): dark silk folds lit from the upper right, generated from a few
# sine waves, so the picture is original and can be made again or changed. Needs Python 3 with numpy and Pillow; nothing is downloaded.
#   python3 tools/wallpaper-cinema.py [out.jpg]
# The light stays in the upper right; the left side (the clock, the app name) and the bottom (the dock) fall to near black, so text and
# tiles stay readable. A little noise is added so the dark gradients do not show bands on an LCD panel. 1920 x 1080, about 100 KB.
import sys

import numpy as np
from PIL import Image

W, H = 1920, 1080
FREQ, RELIEF, CREASE = 22.0, 0.06, 0.6  # how many folds, how deep they look, how sharp their creases are
KEY = np.array([48, 64, 160]) / 255  # midnight blue, the light from the upper right
RIM = np.array([110, 46, 118]) / 255  # plum, a weak light from the lower left in the valleys
SHEEN = np.array([190, 205, 250]) / 255  # the satin highlight
FLOOR = np.array([3, 4, 9]) / 255  # never quite black: an LCD shows pure black as grey anyway, this keeps the tone even


def draw():
    rng = np.random.default_rng(11)
    y, x = np.mgrid[0:H, 0:W].astype(np.float64)
    u, v, vv = x / W, y / W, y / H
    # long folds along a bent diagonal, with a second wave on top and creases
    bend = 0.18 * np.sin(u * 3.4 + 0.8) + 0.10 * np.sin(u * 7.1 + 2.0) + 0.06 * np.sin(v * 9.0 + u * 2.0)
    s = (v - 0.62 * u) + bend
    amp = 0.55 + 0.45 * np.sin(u * 2.3 + 1.1)
    h = amp * (np.sin(s * FREQ) + 0.30 * np.sin(s * FREQ * 2.1 + u * 4.0)) - CREASE * amp * np.abs(np.sin(s * FREQ * 0.5 + 0.7))
    # surface normals, lit by a key light, a rim light and a broad highlight
    gy, gx = np.gradient(h, 1.0 / W)
    nx, ny, nz = -gx * RELIEF, -gy * RELIEF, np.ones_like(h)
    n = np.sqrt(nx**2 + ny**2 + nz**2)
    nx, ny, nz = nx / n, ny / n, nz / n

    def lit(d):
        d = np.array(d, float) / np.linalg.norm(d)
        return np.clip(nx * d[0] + ny * d[1] + nz * d[2], 0, 1)

    col = KEY * lit([0.6, -0.5, 0.62])[..., None] ** 2.2 * 0.9
    col += RIM * lit([-0.7, 0.6, 0.35])[..., None] ** 4 * 0.45
    col += SHEEN * lit([0.6, -0.5, 1.62])[..., None] ** 24 * 0.42
    # where the light may be: around the upper right, fading towards the left, the bottom and the very top (the buttons)
    r = np.sqrt(((u - 0.80) * 1.1) ** 2 + ((vv - 0.18) * 0.75) ** 2)
    mask = np.clip(1.0 - r / 0.9, 0, 1) ** 1.5
    mask *= 1.0 - 0.9 * np.clip((vv - 0.55) / 0.45, 0, 1) ** 1.2
    mask *= 1.0 - 0.7 * np.clip((0.45 - u) / 0.45, 0, 1) ** 1.4
    mask *= 1.0 - 0.45 * np.clip((0.2 - vv) / 0.2, 0, 1) ** 1.3
    col = col * (mask * 0.88)[..., None]
    # a faint blue haze behind the folds, top right
    haze = np.exp(-(((u - 0.9) / 0.35) ** 2 + ((vv - 0.0) / 0.35) ** 2))
    col += np.array([30, 28, 80]) / 255 * haze[..., None] * 0.5
    col = np.maximum(col, FLOOR)
    col = col * 255 + rng.normal(0, 0.9, col.shape)
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'themes/cinema/cinema.jpg'
    draw().save(out, quality=88, optimize=True, progressive=True, subsampling=0)
    print(out)
