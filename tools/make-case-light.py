"""Render the soft light that falls from a case's logo into assets/case-light-<case>-<a|b|c>.webp.

A cone of light widens down the page: a pale tint under the logo, splitting into two colours
lower down, one on each side, fading into black. Each case gets three bitmaps: the theme's colours,
the same with the sides swapped, and a third pair; styles.css fades them into each other,
so the colours drift across the light.
It is baked into bitmaps because a blur this size, as a CSS or SVG filter, reruns on every repaint and
makes the cursor stutter. The bitmaps stay smooth: dithering baked in here would be stretched into blotches
on a phone, so the steps of the dark gradient are hidden by grain laid over it at screen resolution
instead (assets/grain.webp, made here too).
Run by hand after changing the numbers below: python3 tools/make-case-light.py
"""
import math
import pathlib
import random

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1400, 1100  # CSS px the bitmap is drawn at (styles.css, .case-light)
SCALE = 0.5  # half size: the light is soft, and stretching it less keeps its steps fine
STRENGTH = 0.66  # brightness at the hottest point, 0…1
ABOVE = 70  # CSS px the light starts above the logo's centre (styles.css, .case-beam)
LOGO_V = ABOVE / 860  # where the logo's centre falls in the bitmap (the light is ~860px tall on a desktop)
# Per case and bitmap: the tint under the logo, then the colours of the left and right sides
CASES = {
    'winline': {
        'a': ((255, 206, 150), (255, 104, 36), (255, 170, 64)),
        'b': ((255, 206, 150), (255, 170, 64), (255, 104, 36)),
        'c': ((255, 214, 164), (255, 72, 48), (255, 200, 100)),
    },
    'chexx': {
        'a': ((208, 190, 255), (140, 78, 255), (200, 82, 244)),
        'b': ((208, 190, 255), (200, 82, 244), (140, 78, 255)),
        'c': ((216, 200, 255), (96, 96, 255), (236, 96, 216)),
    },
}


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def render(top, left, right, path):
    w, h = round(WIDTH * SCALE), round(HEIGHT * SCALE)
    data = bytearray()
    for y in range(h):
        v = (y + 0.5) / h  # 0 at the logo, 1 at the bottom
        # The bitmap starts ABOVE px above the logo's centre (styles.css, .case-beam), so the light also
        # glows behind the logo, a little wider than it, and the logo sits on it with no edge to be seen.
        # From there a cone widens past the first card's sides (its top is at v ~ 0.6) and fades well
        # before the bottom
        d = v - LOGO_V  # below the logo's centre
        # Everything here is one smooth curve, with no hot spot of its own and no kinks, so the light
        # reads as a single fade: the width eases from the logo's into a straight widening cone
        # (a soft max(d, 0)), and the brightness eases in at the top and then only ever dims
        below = 0.03 * math.log1p(math.exp(d / 0.03))
        spread = 0.15 + 1.3 * below
        fall = smoothstep(-LOGO_V, 0.05, d) / (1 + below / 0.22) * (1 - smoothstep(0.6, 1, v))
        lower = smoothstep(0.0, 0.4, v)
        for x in range(w):
            u = ((x + 0.5) / w) * 2 - 1  # -1 left, 1 right
            # One profile across: bright along the middle, sides that soften all the way out,
            # reaching pure black at the bitmap's edges, so the light has no visible border
            r = abs(u) / spread
            light = STRENGTH * fall / (1 + r * r) ** 2 * (1 - smoothstep(0.3, 1, abs(u)))
            colour = mix(top, mix(left, right, smoothstep(-0.35, 0.35, u)), lower)
            data.extend(min(255, round(c * light)) for c in colour)
    Image.frombytes('RGB', (w, h), bytes(data)).save(path, 'WEBP', lossless=True, method=6)
    print(f'make-case-light: {path.name} {w}x{h}, {path.stat().st_size // 1024} KB')


# Grain: grey around the middle, so in overlay mode it leaves black black and only shades the light
grain_rng = random.Random(1)
grain = Image.frombytes('L', (128, 128), bytes(grain_rng.randint(120, 136) for _ in range(128 * 128)))
grain.save(ROOT / 'assets' / 'grain.webp', 'WEBP', lossless=True, method=6)
print(f'make-case-light: grain.webp, {(ROOT / "assets" / "grain.webp").stat().st_size // 1024} KB')

for name, variants in CASES.items():
    for key, (top, left, right) in variants.items():
        render(top, left, right, ROOT / 'assets' / f'case-light-{name}-{key}.webp')
