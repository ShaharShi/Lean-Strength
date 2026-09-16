#!/usr/bin/env python3
"""Download and downscale the exercise photos listed in figmap.json into ./figs.

Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain).
Each exercise has two photos: 0 = start position, 1 = peak of the movement.
Usage: python3 fetch_figs.py [out_dir]   (default: ./figs next to this script)
"""
import io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'figs')
BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/'
os.makedirs(OUT, exist_ok=True)

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('Pillow is required: pip install pillow')

figmap = json.load(open(os.path.join(HERE, 'figmap.json'), encoding='utf-8'))
db = {e['id']: e for e in json.load(urllib.request.urlopen(BASE + 'dist/exercises.json', timeout=60))}

todo = sorted(set(figmap.values()))
for i, ex_id in enumerate(todo, 1):
    e = db.get(ex_id)
    if not e:
        print('!! not in database:', ex_id); continue
    for phase, img in enumerate(e['images'][:2]):
        dst = os.path.join(OUT, f'{ex_id}_{phase}.jpg')
        if os.path.exists(dst):
            continue
        raw = urllib.request.urlopen(BASE + 'exercises/' + img, timeout=60).read()
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
        w, h = im.size; s = 520 / max(w, h)
        if s < 1:
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=78, optimize=True, progressive=True)
    print(f'[{i}/{len(todo)}] {ex_id}')
print('done:', len(os.listdir(OUT)), 'files in', OUT)
