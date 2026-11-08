"""Stamp local asset links with a hash of the file's contents (styles.css?v=1a2b3c4d).

The host caches CSS, JS and images for a week, so a changed file must get a new URL
for returning visitors to see it. Only files whose contents changed get a new stamp.
Converts new images first (tools/optimize-images.py), so their files get stamped too.
Run after every change, by hand or from a git pre-commit hook: python3 tools/version-assets.py
"""
import hashlib
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(ROOT / 'tools' / 'optimize-images.py')], check=True)
HTML_REF = re.compile(r'((?:src|srcset|href)=")(?!https?:|//|#|data:|mailto:)([^"?#]+)(?:\?v=[0-9a-f]+)?(")')
CSS_REF = re.compile(r'(url\()(?!https?:|//|data:)([^)?#]+)(?:\?v=[0-9a-f]+)?(\))')


def stamp(path, pattern):
    text = path.read_text()

    def replace(match):
        target = (path.parent / match.group(2)).resolve()
        # Links between pages stay clean: pages are never cached (.htaccess)
        if target.suffix == '.html':
            return f'{match.group(1)}{match.group(2)}{match.group(3)}'
        if not target.is_file():
            return match.group(0)
        digest = hashlib.sha1(target.read_bytes()).hexdigest()[:8]
        return f'{match.group(1)}{match.group(2)}?v={digest}{match.group(3)}'

    updated = pattern.sub(replace, text)
    if updated != text:
        path.write_text(updated)
        return True
    return False


# The stylesheet first: its own hash depends on the stamps inside it
pages = [('styles.css', CSS_REF)] + [(page.name, HTML_REF) for page in sorted(ROOT.glob('*.html'))]
changed = [name for name, pattern in pages if stamp(ROOT / name, pattern)]
for name in changed:
    print(f'version-assets: updated {name}')

# Every page carries the Yandex.Metrika counter, so the whole site is counted: copy the block from index.html
# (the script at the end of <head>, the <noscript> pixel at the start of <body>) into any new page
METRIKA_ID = '114097231'
for page in sorted(ROOT.glob('*.html')):
    text = page.read_text()
    if f'tag.js?id={METRIKA_ID}' not in text or f'watch/{METRIKA_ID}' not in text:
        print(f'version-assets: WARNING {page.name} has no Yandex.Metrika counter, copy it from index.html')
