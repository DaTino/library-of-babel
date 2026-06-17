# The Library of Babel — Virtual Museum

A web-based, explorable virtual museum inspired by Borges's _The Library of Babel_.
See **[`library_design_doc.md`](./library_design_doc.md)** for the canonical spec — it is
the source of truth and is updated in place as decisions are made.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Three.js** via **@react-three/fiber** + **@react-three/drei**
- **Zustand** for app state
- **ESLint** (flat config) · **Prettier** · **Vitest**

## Scripts

| command           | what                                          |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | start the dev server                          |
| `npm run build`   | type-check (`tsc -b`) + production build       |
| `npm run preview` | preview the production build                   |
| `npm run lint`    | ESLint                                         |
| `npm run format`  | Prettier (write)                              |
| `npm test`        | run unit tests (Vitest)                       |
| `npm run fetch:content` | cache real art + texts → `public/content/` (§8) |

## Explore

`npm run dev`, open <http://localhost:5173>, then **click to enter** (locks the mouse):

- **WASD / arrows** to move · **mouse** to look
- Walk toward a **doorway** (while facing it) or **click** it to travel between rooms; walk
  onto the central **staircase** in an atrium to change floors
- Put the reticle on a **painting / artifact / book** and click to open the viewer or reader
- **R** return to the floor's atrium · **C** Sources & licenses · **M** mute · **Esc** release / close
- Ambient audio fades in when you enter and crossfades as you move between rooms

> **Real content:** run `npm run fetch:content` once to load actual Met art + Gutenberg
> texts (otherwise you'll see styled placeholders).

See [`startup.md`](./startup.md) for full setup and prerequisites.

## Layout

```
src/
  config/layout.ts      # FLOORS — single source of truth for the tower (§2.5)
  model/                # data model (§4), graph derivation (deriveMuseum), assets, labels
  data/                 # placeholder content + shared per-culture themes
  content/              # cache loader + cached ContentProvider with seeded sampler (§8)
  geometry/hexagon.ts   # hexagon room math (wall transforms, apothem, walk clamp)
  navigation/entry.ts   # where the camera lands when arriving in a room
  controls/             # first-person pointer-lock + WASD (swappable seam for WebXR)
  interaction/          # center-screen raycast (hover / click → overlay or travel)
  audio/                # procedural ambient soundscapes (Web Audio, crossfade, mute, §6.6)
  scene/                # Scene switch, Room, Atrium, HexShell, walls/, props/, CameraRig, NavTriggers, ArtImage
  ui/                   # Hud, Overlays, Transition, overlays/ (art viewer, reader, sources)
  state/store.ts        # Zustand store (navigation, overlays, audio)
  App.tsx / main.tsx
scripts/fetch-content.ts  # build-time fetcher: Met art + Gutenberg texts → public/content/ (§8)
```

## Status

**Phase 5 — Theming, audio & polish ✅** (see §10). Per-culture ambient soundscapes
(procedural Web Audio, crossfaded on travel, autoplay-gated, mutable via the 🔊 button or
**M**), on top of the per-room theming and a perf/typography pass. Next: **Phase 6** —
content curation & QA (fill thin spots, vet every attribution).
