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

## Layout

```
src/
  config/layout.ts        # FLOORS — single source of truth for the tower (§2.5)
  model/                  # data model (§4) + graph derivation (§2.2/§2.6) + labels
  data/placeholder.ts     # Phase 0 stub content (ContentProvider seam; → §8 layer in Phase 4)
  geometry/hexagon.ts     # hexagon room math (wall transforms, apothem, walk clamp)
  controls/               # first-person pointer-lock + WASD (swappable seam for WebXR)
  interaction/            # center-screen raycast (hover / click)
  scene/                  # Room, HexShell, walls/, props/
  ui/Hud.tsx              # 2D overlay (reticle, hover label, enter prompt, toast)
  state/store.ts          # Zustand store
  App.tsx / main.tsx
```

## Status

**Phase 2 — Overlays ✅** (see §10). Click an item to open the art viewer (zoom/pan),
the in-museum reader, or the global Sources/attribution panel — all reading from the data
model. Next: **Phase 3** — the atrium, the 6-room wheel graph, hallways, and the
spiral-staircase tower.
