# Architectural Visualization Studio — React

**Lumen / Field** · the Studio (`/`) and the Project Dashboard (`/dashboard`).
Plain React (JSX) + Vite. Installs with **npm** — no pnpm needed.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build     # production build → dist/
npm run preview   # serve the production build
```

Needs Node 20.19 or newer (https://nodejs.org).
To open it on your phone, connect to the same Wi-Fi and visit `http://<your-computer-IP>:5173`.

## Structure

```
index.html
vite.config.js
src/
  main.jsx               entry (mounts <App /> inside the error boundary)
  App.jsx                router + Studio page + Dashboard page
  index.css              all styling, including the responsive layer (sm 640 · md 768 · lg 1024)
  pages/not-found.jsx    404 page
  components/            error-boundary.jsx · ui/card.jsx
  lib/utils.js           cn() class helper
public/                  favicon.svg · robots.txt
```

## Notes

- Same design, markup and behaviour as the original app (with the Figma Make responsive update applied).
- Left out, because nothing on screen used them: the API server, database and OpenAPI packages,
  the unused UI-kit components, react-query, and the empty toast/tooltip providers.
