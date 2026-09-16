# Lean Strength

אפליקציית אימונים אישית (שחר + בינה): אימון פעיל עם לוג סטים, טיימר מנוחה, סטופר, תוכנית ניתנת לעריכה, נפח שבועי, מפת שרירים ומעקב התקדמות. RTL, מותאמת לטלפון, עובדת גם כ-PWA.

## מבנה
- `index.html`, `app.js`, `data.js` — האפליקציה (ללא תלות בספריות).
- `figmap.json` + `fetch_figs.py` — מורידים ומקטינים את תמונות התרגילים מ-[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (נחלת הכלל).
- `build_site.py` — בונה אתר סטטי מלא (`dist/`) עם מניפסט PWA, אייקונים ו-service worker.
- `.github/workflows/pages.yml` — מפרסם אוטומטית ל-GitHub Pages בכל push ל-`main`.

## הרצה מקומית
```bash
pip install pillow
python3 fetch_figs.py figs
python3 build_site.py dist
python3 -m http.server --directory dist 8080
```

הנתונים (לוג, תוכנית מותאמת) נשמרים בדפדפן של המכשיר. יש גיבוי/שחזור בלשונית "מעקב".
