"""Render the hero's background light into assets/glow.webp.

Soft light falls from the name pill down the page and spreads out: mint under the pill,
violet to the left and peach to the right lower down, fading into black.
It is baked into a bitmap because a blur this size, as an SVG or CSS filter, reruns on every repaint
and makes the cursor stutter. Random dithering hides the steps of a dark gradient.
Run by hand after changing the numbers below: python3 tools/make-glow.py
"""
import math
import pathlib
import random

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1800, 1400  # CSS px the bitmap is shown at (styles.css, .glow)
SCALE = 0.25  # the light is soft, so a quarter-size bitmap holds every detail
STRENGTH = 0.5  # brightness at the hottest point, 0…1
MINT = (150, 222, 214)
VIOLET = (164, 118, 226)
PEACH = (238, 178, 136)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


w, h = round(WIDTH * SCALE), round(HEIGHT * SCALE)
rng = random.Random(1)
data = bytearray()
for y in range(h):
    v = (y + 0.5) / h  # 0 at the pill, 1 at the bottom
    # The cone widens as the light falls; brightness rises from the source, then fades out
    spread = 0.08 + 0.5 * v
    fall = smoothstep(0.0, 0.5, v) * math.exp(-((v / 0.82) ** 3)) * (1 - smoothstep(0.7, 1, v))
    lower = smoothstep(0.12, 0.5, v)
    for x in range(w):
        u = ((x + 0.5) / w) * 2 - 1  # -1 left, 1 right
        # The edges of the bitmap fade to pure black, so it has no visible border
        light = STRENGTH * fall * math.exp(-((u / spread) ** 2)) * (1 - smoothstep(0.65, 1, abs(u)))
        colour = mix(MINT, mix(VIOLET, PEACH, smoothstep(-0.3, 0.3, u)), lower)
        data.extend(min(255, int(c * light + rng.random())) for c in colour)

image = Image.frombytes('RGB', (w, h), bytes(data))
image.save(ROOT / 'assets' / 'glow.webp', 'WEBP', lossless=True, method=6)
print(f'make-glow: {w}x{h}, {(ROOT / "assets" / "glow.webp").stat().st_size // 1024} KB')
