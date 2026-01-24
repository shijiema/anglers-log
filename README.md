# Angler's Log - Fishing Journal

A React single-page web application for logging fishing catches. Built as a Progressive Web App (PWA) with offline-first design.

## Tech Stack

- **React 19** + **Vite 7** - Frontend framework and build tool
- **Tailwind CSS 4** - Styling
- **IndexedDB** - Local browser database for persistent storage
- **Chart.js** - Analytics visualizations
- **i18next** - Internationalization (English, Chinese)
- **Lucide React** - Icons

## Project Structure

```
src/
├── App.jsx              # Main application (all views and components)
├── main.jsx             # React entry point
├── i18n/
│   ├── index.js         # i18n configuration
│   └── locales/         # en.json, zh-CN.json
public/
├── sw.js                # Service Worker (offline support)
├── manifest.json        # PWA manifest
└── icons/               # App icons
```

## Features

1. **Dashboard** - Recent catches, total stats, quick access
2. **Log Form** - Add/edit catches with:
   - Species, weight, date/time
   - GPS location (auto-detect)
   - Bait/lure type
   - Temperature & wind conditions
   - Photos (max 4, auto-compressed)
   - Notes
3. **Analysis** - Charts showing species distribution, catch timeline, filtering
4. **Sharing** - Generate social media cards with two modes:
   - **Public** - Excludes location and map (safe for social media)
   - **Friends** - Includes location and map (for close friends)
5. **Data Management** - Export/import JSON, export CSV, bulk delete
6. **Offline Mode** - Full functionality without internet
7. **Multi-language** - English and Chinese (auto-detected)

## Data Storage

- Uses IndexedDB database `AnglersLogDB` with `catches` object store
- All data stored locally on device
- Photos compressed to 800x800px JPEG at 60% quality

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Production build to /dist
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | All components and business logic |
| `src/i18n/locales/*.json` | Translation strings |
| `public/sw.js` | Service worker caching strategy |
| `vite.config.js` | Build configuration |
| `tailwind.config.js` | Tailwind setup |
| `FEATURES.md` | Detailed feature documentation |
