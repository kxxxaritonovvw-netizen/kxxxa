"""Draw the site's cursors as crisp PNGs at 1x and 2x (assets/cursor*.png, cursor*@2x.png).

Drawn after the hero font, PP Pangaia: a light arrow with a calligraphic concave edge and a thin dark outline,
a pointing hand in the same light and outline over anything clickable, and an I with wedge serifs over text. Browsers draw an SVG cursor at 1x
and stretch it on a Retina screen, so the cursors are bitmaps offered through image-set instead.
Shapes are drawn on a 24px grid and shrunk by SIZE to the size of the system cursor (an 18px image);
each size is drawn 8 times larger and scaled down for smooth edges.
python3 tools/make-cursors.py   (needs Pillow)
"""
import math
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
GRID = 24
SIZE = 0.75  # the system arrow is about 15px tall; ours is 20 on the grid
CANVAS = round(GRID * SIZE)
SUPER = 8
OUTLINE = (11, 11, 14, 255)

def quad(p0, c, p1, steps=10):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]) for t in (i / steps for i in range(1, steps + 1))]


def arc(cx, cy, r, start, end, steps=12):
    """Points along a circle from start to end degrees, counted anticlockwise from the right, y pointing down"""
    return [(cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a)))
            for a in (start + (end - start) * i / steps for i in range(steps + 1))]


# The arrow: straight left side and tail, its long edge bowed in like a pen stroke
ARROW = [(3, 2), (3, 18.6), (7.2, 14.9), (10.1, 21.3), (12.7, 20.2), (9.8, 13.8), (15.8, 13.6)]
ARROW += quad((15.8, 13.6), (8.6, 10.2), (3, 2))[:-1]

# The hand: the index finger up (its tip is the hotspot), three folded fingers, the palm and the thumb
HAND = [(8, 12.6), (8, 3.6)]
HAND += arc(9.5, 3.6, 1.5, 180, 0)
HAND += [(11, 9.9)] + arc(12.6, 9.9, 1.6, 180, 0)
HAND += [(14.2, 10.7)] + arc(15.8, 10.7, 1.6, 180, 0)
HAND += [(17.4, 11.9)] + arc(18.8, 11.9, 1.4, 180, 0)
HAND += [(20.2, 15.6)] + quad((20.2, 15.6), (20.2, 19.4), (17.6, 21.2))
HAND += [(11.2, 21.2)] + quad((11.2, 21.2), (8.8, 20.8), (7.4, 18.8))
HAND += [(4.2, 15.3)] + arc(5.25, 14.25, 1.5, 225, 45)
HAND += [(8, 14.2)]
# Creases between the folded fingers
HAND_LINES = [[(11, 9.9), (11, 13.4)], [(14.2, 10.7), (14.2, 13.6)], [(17.4, 11.9), (17.4, 14)]]


# The I: a thin stem flaring into curved wedge serifs at both ends
I_BEAM = [(7.5, 3)]
I_BEAM += quad((7.5, 3), (12, 4.1), (16.5, 3))
I_BEAM += [(16.5, 4.3)]
I_BEAM += quad((16.5, 4.3), (13.5, 4.5), (12.75, 5.8))
I_BEAM += [(12.75, 18.2)]
I_BEAM += quad((12.75, 18.2), (13.5, 19.5), (16.5, 19.7))
I_BEAM += [(16.5, 21)]
I_BEAM += quad((16.5, 21), (12, 19.9), (7.5, 21))
I_BEAM += [(7.5, 19.7)]
I_BEAM += quad((7.5, 19.7), (10.5, 19.5), (11.25, 18.2))
I_BEAM += [(11.25, 5.8)]
I_BEAM += quad((11.25, 5.8), (10.5, 4.5), (7.5, 4.3))

LIGHT = (246, 242, 249, 255)
CURSORS = {
    'cursor': (ARROW, [], LIGHT, 1.0),
    'cursor-pointer': (HAND, HAND_LINES, LIGHT, 1.0),
    'cursor-text': (I_BEAM, [], LIGHT, 0.8),
}


def draw(shape, lines, fill, outline, scale):
    k = SIZE * scale * SUPER
    size = CANVAS * scale * SUPER
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pen = ImageDraw.Draw(image)
    points = [(x * k, y * k) for x, y in shape]
    # The outline sits outside the shape: a thick dark line along the edge, then the fill over its inner half.
    # It keeps its width as the shape shrinks, so the small cursor stays as clearly edged
    pen.line(points + points[:2], fill=OUTLINE, width=round(outline * 2 * scale * SUPER), joint='curve')
    pen.polygon(points, fill=OUTLINE)
    pen.polygon(points, fill=fill)
    for line in lines:
        pen.line([(x * k, y * k) for x, y in line], fill=OUTLINE, width=round(0.7 * scale * SUPER))
    return image.resize((CANVAS * scale, CANVAS * scale), Image.LANCZOS)


for name, (shape, lines, fill, outline) in CURSORS.items():
    for scale, suffix in ((1, ''), (2, '@2x')):
        path = ROOT / 'assets' / f'{name}{suffix}.png'
        draw(shape, lines, fill, outline, scale).save(path, optimize=True)
        print(f'make-cursors: {path.name}, {path.stat().st_size} B')
