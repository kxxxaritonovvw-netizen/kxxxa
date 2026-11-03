"""Turn the original images in assets/src into the files the site loads: WebP for every browser and a
smaller AVIF that <picture> offers first (assets/phone.png -> assets/phone.webp + assets/phone.avif).

Drop a PNG or JPEG into assets/src and it is converted; files are only rebuilt when the original is newer.
Images are capped at MAX_SIDE px, twice the largest size they are shown at.
version-assets.py runs it first, so new images are picked up on every change; or by hand:
python3 tools/optimize-images.py   (needs Pillow: python3 -m pip install --user "pillow<12")
"""
import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    # Without Pillow the already built files stay as they are, so version-assets.py still runs
    print('optimize-images: skipped, Pillow is missing: python3 -m pip install --user "pillow<12"')
    sys.exit(0)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'src'
OUT = ROOT / 'assets'
MAX_SIDE = 1600
WEBP = {'quality': 80, 'method': 6}
AVIF = {'quality': 55, 'speed': 4}


def build(source):
    targets = [OUT / f'{source.stem}.webp', OUT / f'{source.stem}.avif']
    mtime = source.stat().st_mtime
    if all(t.exists() and t.stat().st_mtime >= mtime for t in targets):
        return
    image = Image.open(source)
    image = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    image.save(targets[0], 'WEBP', **WEBP)
    image.save(targets[1], 'AVIF', **AVIF)
    sizes = ', '.join(f'{t.suffix[1:]} {t.stat().st_size // 1024} KB' for t in targets)
    print(f'optimize-images: {source.name} -> {image.width}x{image.height}, {sizes}')


for path in sorted(SRC.glob('*')):
    if path.suffix.lower() in ('.png', '.jpg', '.jpeg'):
        build(path)
