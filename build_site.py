#!/usr/bin/env python3
"""Build a standalone static site (for GitHub Pages / any static host) from the artifact sources.

Usage: python3 build_site.py <out_dir>
The artifact version of index.html has no <html>/<head> (the artifact viewer wraps it);
this script adds a full document shell, a PWA manifest, icons and a service worker.
"""
import os, re, shutil, sys, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'dist')
os.makedirs(OUT, exist_ok=True)

body = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
title = re.search(r'<title>(.*?)</title>', body).group(1)
body = body.replace('<title>%s</title>\n' % title, '')
version = time.strftime('%Y%m%d%H%M')

head = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="תוכניות האימון של שחר ובינה — אימון פעיל, טיימר מנוחה, מעקב משקלים">
<meta name="theme-color" content="#1E5FE0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Lean Strength">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>img{{max-width:100%}}</style>
</head>
<body>
'''
tail = f'''
<script>
if ('serviceWorker' in navigator) {{ window.addEventListener('load', function () {{ navigator.serviceWorker.register('sw.js?v={version}').catch(function () {{}}); }}); }}
</script>
</body>
</html>
'''
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + body + tail)

for f in ('data.js', 'app.js'):
    shutil.copy(os.path.join(HERE, f), os.path.join(OUT, f))
figs_out = os.path.join(OUT, 'figs')
if os.path.isdir(figs_out):
    shutil.rmtree(figs_out)
shutil.copytree(os.path.join(HERE, 'figs'), figs_out)

# manifest
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps({
    "name": "Lean Strength", "short_name": "Lean Strength", "lang": "he", "dir": "rtl",
    "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#FFFFFF", "theme_color": "#1E5FE0",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}, ensure_ascii=False, indent=2))

# icons (blue tile with a dumbbell)
try:
    from PIL import Image, ImageDraw
    for size in (192, 512):
        im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        r = size // 5; d.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=(30, 95, 224, 255))
        s = size / 192.0
        bar_y = size / 2
        d.rounded_rectangle((40 * s, bar_y - 7 * s, size - 40 * s, bar_y + 7 * s), radius=7 * s, fill='white')
        for x in (30, 52):
            d.rounded_rectangle((x * s, bar_y - 36 * s, (x + 16) * s, bar_y + 36 * s), radius=6 * s, fill='white')
            d.rounded_rectangle((size - (x + 16) * s, bar_y - 36 * s, size - x * s, bar_y + 36 * s), radius=6 * s, fill='white')
        im.save(os.path.join(OUT, f'icon-{size}.png'))
except ImportError:
    print('PIL not available — icons skipped')

# service worker: precache shell, cache-first for figures
figs = sorted(os.listdir(figs_out))
sw = f'''/* Lean Strength service worker */
var V = 'ls-{version}';
var SHELL = ['./', './index.html', './data.js', './app.js', './manifest.webmanifest', './icon-192.png'];
self.addEventListener('install', function (e) {{ e.waitUntil(caches.open(V).then(function (c) {{ return c.addAll(SHELL); }}).then(function () {{ return self.skipWaiting(); }})); }});
self.addEventListener('activate', function (e) {{ e.waitUntil(caches.keys().then(function (ks) {{ return Promise.all(ks.filter(function (k) {{ return k !== V; }}).map(function (k) {{ return caches.delete(k); }})); }}).then(function () {{ return self.clients.claim(); }})); }});
self.addEventListener('fetch', function (e) {{
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.indexOf('/figs/') >= 0) {{
    e.respondWith(caches.open(V).then(function (c) {{ return c.match(e.request).then(function (r) {{ return r || fetch(e.request).then(function (res) {{ if (res.ok) c.put(e.request, res.clone()); return res; }}); }}); }}));
  }} else {{
    e.respondWith(fetch(e.request).then(function (res) {{ if (res.ok) caches.open(V).then(function (c) {{ c.put(e.request, res.clone()); }}); return res; }}).catch(function () {{ return caches.match(e.request); }}));
  }}
}});
'''
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)
open(os.path.join(OUT, '.nojekyll'), 'w').close()
print('built', OUT, '·', len(figs), 'figures · version', version)
