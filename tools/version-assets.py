"""Stamp local asset links with a hash of the file's contents (styles.css?v=1a2b3c4d).

The host caches CSS, JS and images for a week, so a changed file must get a new URL
for returning visitors to see it. Only files whose contents changed get a new stamp.
Runs from the git pre-commit hook; can also be run by hand: python3 tools/version-assets.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML_REF = re.compile(r'((?:src|srcset|href)=")(?!https?:|//|#|data:|mailto:)([^"?#]+)(?:\?v=[0-9a-f]+)?(")')
CSS_REF = re.compile(r'(url\()(?!https?:|//|data:)([^)?#]+)(?:\?v=[0-9a-f]+)?(\))')


def stamp(path, pattern):
    text = path.read_text()

    def replace(match):
        target = (path.parent / match.group(2)).resolve()
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
changed = [name for name, pattern in (('styles.css', CSS_REF), ('index.html', HTML_REF)) if stamp(ROOT / name, pattern)]
for name in changed:
    print(f'version-assets: updated {name}')
