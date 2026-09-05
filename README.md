# CoreSync

**Train · Fuel · Recover** — an all-in-one fitness app with four trackers in one place, saved entirely on-device. No sign-in, no server, no data leaves the phone.

![stack](https://img.shields.io/badge/react-19-111) ![stack](https://img.shields.io/badge/vite-7-111) ![stack](https://img.shields.io/badge/tailwind-4-111)

## The five tabs

| Tab | What it does |
| --- | --- |
| **Today** | Calorie ring vs goal, protein/carbs/fat bars, quick cards (last workout, last run, cycle day, next period), shortcuts into every action, 7-day fuel strip |
| **Food** | Photo → macro estimate (fully editable), live camera **barcode scanning** with Open Food Facts lookup, searchable food DB, quick-add; daily log by meal with running totals and editable goals |
| **Gym** | Exercise library + custom exercises, live workout session with set logging and a rest timer, one-tap repeat of any past workout, PBs (max weight, best set, est. 1RM) and per-exercise volume trends |
| **Run** | Live GPS runs — dark live map, route trace, distance/time/pace, per-km splits — plus a Simulated GPS mode, saved summaries and history with trends |
| **Cycle** | Calendar with period/flow/symptom/mood logging, predictions (next period, fertile window, ovulation) from logged history, cycle-day badge feeds the home screen |

## Tech notes

- **Stack:** React 19 + Vite + Tailwind CSS 4, hash router (one route per tab, shared bottom-nav layout), Zustand stores persisted to `localStorage` (`coresync:*:v1`) — the typed data layer is the single swap point for future cloud sync.
- **Barcode:** `@zxing/browser` camera scanner → Open Food Facts API v2 (free, no key).
- **Maps:** Leaflet + CARTO dark tiles (no API key). `src/pages/RunMap.tsx` is the single component to swap for Google Maps.
- **Photo estimates:** deterministic on-device heuristic in `src/lib/foods.ts`, deliberately behind the same input/output contract a vision-model endpoint would use.
- **Client-only:** all camera, GPS and storage code runs in the browser; there is no backend.
- Starts empty on first launch — your data is yours alone. Wipe everything anytime from the footer of the Today tab.

## Run it

```bash
npm install
npm run dev      # local dev
npm run build    # outputs a single self-contained dist/index.html
npm run preview  # serve the production build
```

## Deploy

`npm run build` produces **one self-contained HTML file** (`dist/index.html`) — router is hash-based and all JS/CSS is inlined, so it works on any static host with zero config.

**GitHub Pages (automatic):** the workflow in `.github/workflows/deploy.yml` builds the app on every push and commits `index.html` to a `gh-pages` branch. Then: repo → **Settings → Pages → Source → "Deploy from a branch" → `gh-pages` → `/ (root)` → Save**. Done.

**GitHub Pages (manual, no Actions):**

```bash
npm install && npm run build
mkdir -p docs && cp dist/index.html docs/index.html
git add docs && git commit -m "Publish app" && git push
# then: Settings → Pages → "Deploy from a branch" → main → /docs → Save
```

Camera and GPS require a secure context — GitHub Pages serves over HTTPS, so everything works on the live URL.

_Cycle predictions are estimates from your own logged history — not medical advice._
