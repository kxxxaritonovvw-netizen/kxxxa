"""Render the soft light that falls from a case's logo into assets/case-light-<case>-<a|b|c>.webp.

A cone of light widens down the page: a pale tint under the logo, splitting into two colours
lower down, one on each side, fading into black. Each case gets three bitmaps: the theme's colours,
the same with the sides swapped, and a third pair; styles.css fades them into each other,
so the colours drift across the light.
It is baked into bitmaps because a blur this size, as a CSS or SVG filter, reruns on every repaint and
makes the cursor stutter. Random dithering hides the steps of a dark gradient.
Run by hand after changing the numbers below: python3 tools/make-case-light.py
"""
import math
import pathlib
import random

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1400, 1100  # CSS px the bitmap is drawn at (styles.css, .case-light)
SCALE = 0.25  # the light is soft, so a quarter-size bitmap holds every detail
STRENGTH = 0.6  # brightness at the hottest point, 0…1
# Per case and bitmap: the tint under the logo, then the colours of the left and right sides
CASES = {
    'winline': {
        'a': ((255, 214, 160), (255, 92, 28), (255, 176, 64)),
        'b': ((255, 214, 160), (255, 176, 64), (255, 92, 28)),
        'c': ((255, 226, 186), (255, 58, 44), (255, 214, 110)),
    },
    'chexx': {
        'a': ((214, 198, 255), (128, 64, 255), (255, 72, 182)),
        'b': ((214, 198, 255), (255, 72, 182), (128, 64, 255)),
        'c': ((226, 214, 255), (84, 92, 255), (255, 128, 222)),
    },
}


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def render(top, left, right, path):
    w, h = round(WIDTH * SCALE), round(HEIGHT * SCALE)
    rng = random.Random(1)
    data = bytearray()
    for y in range(h):
        v = (y + 0.5) / h  # 0 at the logo, 1 at the bottom
        # The cone widens as the light falls; brightness pools over the first card, then fades out
        spread = 0.16 + 0.75 * v
        fall = smoothstep(0.0, 0.3, v) * math.exp(-((v / 0.62) ** 3)) * (1 - smoothstep(0.75, 1, v))
        lower = smoothstep(0.05, 0.32, v)
        for x in range(w):
            u = ((x + 0.5) / w) * 2 - 1  # -1 left, 1 right
            # The edges of the bitmap fade to pure black, so it has no visible border
            light = STRENGTH * fall * math.exp(-((u / spread) ** 2)) * (1 - smoothstep(0.5, 1, abs(u)))
            colour = mix(top, mix(left, right, smoothstep(-0.35, 0.35, u)), lower)
            data.extend(min(255, int(c * light + rng.random())) for c in colour)
    Image.frombytes('RGB', (w, h), bytes(data)).save(path, 'WEBP', lossless=True, method=6)
    print(f'make-case-light: {path.name} {w}x{h}, {path.stat().st_size // 1024} KB')


for name, variants in CASES.items():
    for key, (top, left, right) in variants.items():
        render(top, left, right, ROOT / 'assets' / f'case-light-{name}-{key}.webp')
