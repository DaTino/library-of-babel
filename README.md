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

## Explore

`npm run dev`, open <http://localhost:5173>, then **click to enter** (locks the mouse):

- **WASD / arrows** to move · **mouse** to look
- Walk toward a **doorway** (while facing it) or **click** it to travel between rooms; walk
  onto the central **staircase** in an atrium to change floors
- Put the reticle on a **painting / artifact / book** and click to open the viewer or reader
- **R** return to the floor's atrium · **C** Sources & licenses · **Esc** release / close

See [`startup.md`](./startup.md) for full setup and prerequisites.

## Layout

```
src/
  config/layout.ts      # FLOORS — single source of truth for the tower (§2.5)
  model/                # data model (§4), graph derivation (deriveMuseum), assets, labels
  data/placeholder.ts   # stub content behind a ContentProvider seam (→ §8 sourcing in Phase 4)
  geometry/hexagon.ts   # hexagon room math (wall transforms, apothem, walk clamp)
  navigation/entry.ts   # where the camera lands when arriving in a room
  controls/             # first-person pointer-lock + WASD (swappable seam for WebXR)
  interaction/          # center-screen raycast (hover / click → overlay or travel)
  scene/                # Scene switch, Room, Atrium, HexShell, walls/, props/, CameraRig, NavTriggers
  ui/                   # Hud, Overlays, Transition, overlays/ (art viewer, reader, sources)
  state/store.ts        # Zustand store (navigation + overlays)
  App.tsx / main.tsx
```

## Status

**Phase 3 — Graph & tower ✅** (see §10). Walk the full wheel graph — atrium ↔ six rooms
through doorways with gentle fades — and ride the central spiral staircase between floors.
Next: **Phase 4** — the sourcing layer (Met + Gutendex …) feeding real art and full texts.
