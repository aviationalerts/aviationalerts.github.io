# Aviation Alerts

Cockpit warning soundboard — 36 real GPWS, stall, windshear and radio-altimeter callouts, played locally.

## Run

```powershell
npm install
npm run dev
```

Production build: `npm run build` then `npm run preview`.

## Layout

- `src/` — React app (Vite + TypeScript + Tailwind)
- `public/audio/` — MP3s + `manifest.json` (durations/availability)
- `public/images/` — hero photo
