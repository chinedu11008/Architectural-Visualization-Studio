# Architectural Visualization Studio — React

**Lumen / Field** · Sign in → Dashboard → Workspace → Account → Subscription.
Plain React (JSX) + Vite + Tailwind CSS. Installs with **npm** — no pnpm needed.

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

The structure is the Figma Make project's, file for file:

```
index.html
vite.config.js
src/
  main.jsx                 entry
  App.jsx                  state-based navigation: signin · dashboard · workspace · account · subscription
  index.css                Inter font, colour tokens, mobile safe-area + scrollbar rules, hatch pattern
  pages/
    SignIn.jsx  Dashboard.jsx  Workspace.jsx  Account.jsx  Subscription.jsx
  components/
    Header.jsx  UserDropdown.jsx
public/favicon.svg
```

## Colours

Layout, spacing, breakpoints and behaviour come straight from the Make code.
Colours are kept separate: every colour class points at a token defined at the top of `src/index.css`.

- Default: this project's dark / amber palette.
- The Figma Make's original light palette is included — add `data-theme="light"` to `<html>` in `index.html` to use it.
