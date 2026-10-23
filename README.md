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

| command                 | what                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | start the dev server                                              |
| `npm run build`         | type-check (`tsc -b`) + production build                          |
| `npm run preview`       | preview the production build                                      |
| `npm run lint`          | ESLint                                                            |
| `npm run format`        | Prettier (write)                                                  |
| `npm test`              | run unit tests (Vitest)                                           |
| `npm run fetch:content` | cache real art, texts + hallway exhibits → `public/content/` (§8) |

## Explore

`npm run dev`, open <http://localhost:5173>, then **click to enter** (locks the mouse):

- **WASD / arrows** to move · **mouse** to look
- Walk through a **doorway** and down its **hallway** — a 25 m corridor of natural-history
  exhibits (§2.7) — to reach the next room; there's no fade, you walk the whole way
- In an atrium, step into the **stair tower's doorway** and turn **left to ascend / right to
  descend** (or click a flight) — you'll climb the spiral to the next floor (§2.6)
- Put the reticle on a **painting / artifact / book / exhibit** and click to open the viewer or reader
- **R** return to the floor's atrium · **C** Sources & licenses · **M** mute · **Esc** release / close
- Ambient audio fades in when you enter, and blends from room to room as you walk a hallway

> **Real content:** run `npm run fetch:content` once to cache real Met + Wikimedia Commons art
> (18 cultures), 540 Gutenberg texts, and the hallway exhibits (36 categories of Commons plates +
> Smithsonian specimens). It takes a while (~30 min); otherwise you'll see styled placeholders.
> For the Smithsonian specimen photos, put a free api.data.gov key in `.env.local` first — see
> [`startup.md`](./startup.md).

See [`startup.md`](./startup.md) for full setup and prerequisites.

## Layout

```
src/
  config/layout.ts      # FLOORS — single source of truth for the tower (§2.5)
  config/hallways.ts    # which natural-history category hangs in which hallway (§9.1)
  model/                # data model (§4), graph derivation (deriveMuseum: rooms + hallways), assets, labels
  data/                 # placeholder content, per-culture themes, exhibit categories
  content/              # cache loader + cached ContentProvider with seeded sampler (§8)
  geometry/             # hexagon room math, hallway shape + frame hand-over (§2.7), stair helix (§2.6)
  navigation/           # entry placement, walkable area (collision), climb state
  controls/             # first-person pointer-lock + WASD (swappable seam for WebXR)
  interaction/          # center-screen raycast (hover / click → overlay or climb)
  audio/                # procedural ambient soundscapes (Web Audio, per-culture chord progression, hallway blend, mute, §6.6)
  scene/                # Scene, Room, Atrium, HexShell, hallway/, walls/, props/ (StairTower), CameraRig, NavTriggers, StairClimb
  ui/                   # Hud, Overlays, Transition, overlays/ (art viewer, reader, sources)
  state/store.ts        # Zustand store (navigation, hallway/climb state, overlays, audio)
  App.tsx / main.tsx
scripts/fetch-content.ts  # build-time fetcher: Met + Commons art + Gutenberg texts → public/content/ (§8)
scripts/fetch-exhibits.ts # hallway exhibits: Commons plates + Smithsonian specimens (§9.1)
```

## Status

**Phase 6 — Content curation ✅** (see §10), plus post-v1 floors. **Three floors, 18 cultures**
(the third — _The Lantern Gallery_ — adds Plains Nations, Ancient India, Viking Scandinavia,
the Islamic Golden Age, Polynesia, and 19th-century America), real Met + Wikimedia Commons art
per room, and **540 unique texts** (10 per shelf, no repeats anywhere) spanning fiction,
non-fiction, poetry, plays, and essays. Run `npm run fetch:content` to populate. **All
build-plan phases (0–6) are complete.**

**v0.16 — hallways & the stair tower.** Every doorway opens onto a walkable, 25 m hallway (36 in
all) hung with natural-history exhibits — one category each (beetles, trilobites, the herbarium,
meteorites…), as wall plates and display cases — and the next room appears out of sight at the
hallway's bend, with no fade. Floors are joined by an enclosed spiral stair tower you actually
climb.

**v0.17 — spruce-up.** Museum labels on every object, titled book spines, wall text introducing
each room, a floor and wall finish per culture (flagstone, marble, tatami, shoji, zellige…) with
real trim, artifacts in glass cases, and lantern-lit atria. Further ideas are in the design
doc's backlog (§10, "Spruce-up review").
