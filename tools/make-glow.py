"""Render the hero's background glow (the dark blurred shape from Figma) into assets/glow.webp.

The shape is only 13 shades above black, so a plain gradient shows steps; random dithering hides them.
The blur is baked in because an SVG filter this size reruns on every repaint and makes the cursor stutter.
Run by hand after changing the numbers below: python3 tools/make-glow.py
"""
import pathlib
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCALE = 0.25  # of Figma px; CSS stretches it back
BLUR = 170  # Figma px
COLOR = (0x0D, 0x0E, 0x11)
PAD = 520  # Figma px around the shape, about three times the blur so it fades out before the edge
SHAPE = [(200, 394.347), (510.275, 394.347), (344.785, 1499.96), (1414.97, 200), (413.472, 1872.97), (200, 1867.21)]

# The shape's own box in Figma is 1214.969×1672.974 with the polygon 200px in; the bitmap adds PAD around it
W, H = 1214.969 + 2 * PAD, 1672.974 + 2 * PAD
size = (round(W * SCALE), round(H * SCALE))
mask = Image.new('L', size, 0)
ImageDraw.Draw(mask).polygon([((x - 200 + PAD) * SCALE, (y - 200 + PAD) * SCALE) for x, y in SHAPE], fill=255)
# 256 levels of coverage are 20 times finer than the 13 shades of colour, plenty to dither from
mask = mask.filter(ImageFilter.GaussianBlur(BLUR * SCALE))

# Opaque over the page's black, each channel dithered to the nearest level by chance
rng = random.Random(1)
pixels = list(mask.getdata())
bands = []
for c in COLOR:
    bands.append(bytes(min(255, int(v / 255 * c + rng.random())) for v in pixels))
image = Image.merge('RGB', [Image.frombytes('L', size, b) for b in bands])
image.save(ROOT / 'assets' / 'glow.webp', 'WEBP', lossless=True, method=6)
# Where styles.css places the bitmap in .glow-shape
print(f'make-glow: .glow-shape img {{ left: {-PAD / 1214.969:.2%}; top: {-PAD / 1672.974:.2%}; width: {W / 1214.969:.2%}; height: {H / 1672.974:.2%}; }}')
print(f'make-glow: {size[0]}x{size[1]}, {(ROOT / "assets" / "glow.webp").stat().st_size // 1024} KB')
