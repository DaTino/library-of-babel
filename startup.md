# Running the Library of Babel locally

A first-person 3D virtual museum (Vite + React + react-three-fiber). Everything runs
client-side — **no backend, no database**, and the app itself needs **no API keys**. (One
optional, free key lets the content fetcher pull Smithsonian specimen photos — see below.)

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

The app ships with styled placeholders. To populate **real open-licensed art (The Met +
Wikimedia Commons), full texts (Project Gutenberg), and the hallway exhibits (Wikimedia
Commons plates + Smithsonian specimens)**:

### Optional: a Smithsonian key (for the display-case specimens)

The hallway display cases show CC0 photographs of real specimens from the Smithsonian's
National Museum of Natural History. Its API needs a free key:

1. Sign up at **<https://api.data.gov/signup/>** (name + email). The key arrives by email
   right away.
2. Copy `.env.example` to **`.env.local`** in the project root (it's git-ignored) and paste
   the key after `SMITHSONIAN_API_KEY=`.

Without a key everything still works; the cases just show Wikimedia Commons photos instead.

### Fetch

```bash
npm run fetch:content
```

This caches art for 18 cultures, 540 texts, and the exhibits for all 36 hallways under
`public/content/` (git-ignored). Wikimedia throttles downloads, so the whole run takes a while
(~30 min); reload the page when it finishes. Partial refreshes, which merge into what's there:

- `ART_ONLY=rome,edo_japan npm run fetch:content` — re-fetch art for some cultures
- `EXHIBITS_ONLY=1 npm run fetch:content` — re-fetch all hallway exhibits (e.g. after adding
  the Smithsonian key)
- `EXHIBITS_ONLY=missing npm run fetch:content` — resume an interrupted exhibits fetch
- `EXHIBITS_ONLY=coleoptera,odonata npm run fetch:content` — just some categories

(On Windows PowerShell set the variable first: `$env:EXHIBITS_ONLY="1"; npm run fetch:content`.)

## 3. Explore

- **Click** anywhere to enter (this locks the mouse pointer to the window).
- **W A S D** or **arrow keys** to walk; **move the mouse** to look around.
- Walk through a **doorway** and down its **hallway** to reach the next room — each hallway is
  hung with natural-history exhibits, and the next room appears as you round its bend.
- In an atrium, step into the **stair tower's doorway** and turn **left to ascend** or **right
  to descend** (or click a flight) to climb to another floor.
- Put the center reticle on an item (painting, book, artifact, or exhibit) — it highlights and
  shows a label. **Click** to open the art viewer or reader.
- **R** returns to the floor's atrium; **Esc** releases the mouse.
- Ambient audio fades in when you enter and blends between rooms as you walk; toggle it with
  the **🔊** button or **M**.

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
