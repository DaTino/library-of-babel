# Running the Library of Babel locally

A first-person 3D virtual museum (Vite + React + react-three-fiber). Everything runs
client-side — **no backend, no API keys, no database** needed.

## Prerequisites

- **Node.js 20.19+ or 22+** (developed on Node 24) — check with `node -v`
- **npm 10+** (ships with Node) — check with `npm -v`

If you don't have Node, install it from <https://nodejs.org> (LTS) or via a version
manager like `nvm`/`fnm`, then reopen your terminal.

## 1. Install dependencies

From the project root:

```bash
cd /Users/alberto.maiocco/projects/library-of-babel
npm install
```

One-time step; re-run only when dependencies change. (For a clean, lockfile-exact
install — e.g. on CI or a fresh clone — use `npm ci` instead.)

## 2. Start the dev server

```bash
npm run dev
```

Vite prints a local URL — open it in your browser:

> **http://localhost:5173**

The server hot-reloads as you edit files. Stop it with **Ctrl+C**.

## Load real content (optional)

The app ships with styled placeholders. To populate **real open-licensed art (The Met) and
full texts (Project Gutenberg)**:

```bash
npm run fetch:content
```

This caches art for 12 cultures + ~360 texts under `public/content/` (git-ignored), so it
takes a few minutes; reload the page when it finishes. If the Met API throttles one
culture's art, re-fetch just that culture with `ART_ONLY=rome,edo_japan npm run fetch:content`.

## 3. Explore the room

- **Click** anywhere to enter (this locks the mouse pointer to the window).
- **W A S D** or **arrow keys** to walk.
- **Move the mouse** to look around.
- Put the center reticle on an item (painting, book, artifact, or a doorway) — it
  highlights and shows a label. **Click** to open the art viewer or reader.
- **Esc** releases the mouse.
- Ambient audio fades in when you enter; toggle it with the **🔊** button or **M**.

## All commands

| command           | what it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | start the dev server (hot reload)              |
| `npm run build`   | type-check + production build → `dist/`        |
| `npm run preview` | serve the production build at `localhost:4173` |
| `npm test`        | run the unit tests (Vitest)                    |
| `npm run lint`    | run ESLint                                     |
| `npm run format`  | format the code with Prettier                  |

## Production build

```bash
npm run build      # outputs a static site to dist/
npm run preview    # preview it at http://localhost:4173
```

`dist/` is a plain static site — deployable to any static host (Vercel, Netlify,
GitHub Pages).

## Troubleshooting

- **Port 5173 already in use:** `npm run dev -- --port 5174` (or stop the other process).
- **Page looks frozen / mouse won't move the view:** make sure you **clicked** the page
  to lock the pointer; press **Esc** to release it again.
- **`command not found: npm`:** install Node.js (it includes npm) and reopen your terminal.
- **Type or build errors after pulling new changes:** `rm -rf node_modules && npm install`.

## More

- `README.md` — source layout and stack overview.
- `library_design_doc.md` — the full design spec and the canonical source of truth.
