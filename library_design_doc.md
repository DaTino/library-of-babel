# The Library of Babel — Virtual Museum
### Design Document (living — update as decisions are made)

**Status:** Draft v0.7
**Last updated:** 2026-06-16
**Owner:** (you)
**Build agent:** Claude Code

---

## 0. How to use this document

This is the canonical spec. Claude Code should read it before each work session and **update it in place** whenever a decision is made, an assumption is confirmed/overturned, or scope changes. Anything still undecided lives in §11 (Open Decisions). Every resolved decision should move out of §11 and into the relevant section, with a one-line note in §13 (Changelog).

---

## 1. Vision

A web-based, explorable virtual museum inspired by Borges's *The Library of Babel*. The visitor wanders a small, deliberately disorienting hexagonal complex. Each of six themed rooms is a "wing" devoted to one historical culture; it displays public-domain/open-license **art and artifacts** on its walls and a **bookshelf** of public-domain/open **literature and non-fiction** the visitor can actually open and read. A central atrium connects all six.

The experience goals, in priority order:

1. **Wonder** — the space should feel like a place worth being in, not a database with a 3D skin.
2. **Discovery** — a semi-random, browseable cross-section of the world's writing and art, anchored to a culture but not strictly limited to it.
3. **Disorientation as feature** — the geometry is intentionally not mappable (see §2). The visitor is meant to lose their bearings the way one does in Borges's Library.

Non-goals (for v1): scholarly accuracy of curation, multi-user presence, monetization.

---

## 2. Spatial topology (the important part)

### 2.1 The layout as described
- **7 hexagonal rooms total:** 1 central **atrium** + 6 themed rooms.
- **Atrium:** all 6 walls are exits — one leads to each themed room.
- **Themed room:** walls alternate between **art/literature walls** and **exit walls**. A hexagon has 6 walls, so each themed room has **3 art walls** and **3 exit walls**.
- Each themed room's 3 exits lead to: **the atrium**, and **two other rooms**.

### 2.2 What that graph actually is
The connectivity is a **wheel graph** \(W_6\): the atrium is the hub; the six themed rooms form a ring (rim) where each room is adjacent to its two ring-neighbors.

```
Adjacency (undirected):
  Atrium — Room1, Room2, Room3, Room4, Room5, Room6   (6 spokes)
  Room1 — Room2 — Room3 — Room4 — Room5 — Room6 — Room1 (6 rim edges, cyclic)

Per-room exits (3 each):  { atrium, prev-room, next-room }
Atrium exits (6):         { Room1 … Room6 }
Total doorways (edges):   12
```

This is a clean, well-defined graph. **It is not a clean planar drawing**, and that is the point.

### 2.3 Why it "can't be easily mapped or drawn"
A central hexagon ringed by six hexagons (a honeycomb rosette) *does* connect the hub to all six and each rim hexagon to its two neighbors — geometrically fine on paper. **But** in that honeycomb, each rim room's three connecting walls (to the atrium + its two neighbors) are **three adjacent walls in a row**. The design instead requires each room's three exits to sit on **alternating (non-adjacent) walls**, with art walls between them.

You cannot satisfy "every room's exits are on alternating walls" *and* keep a single consistent planar layout. The alternation forces the space into a **non-Euclidean / portal topology** — exactly the unmappable, vertiginous quality Borges evokes. This is a feature.

### 2.4 Engineering consequence (do this)
**Do not place all seven rooms in one global coordinate system.** Model the museum as a **graph of independent room-scenes connected by portals/hallways**:

- Each room is its own self-contained scene with its own local origin.
- Each exit is a **portal** that transitions the camera into the connected room's scene (load/fade, or render-through-doorway for the more ambitious "impossible space" effect — see §11).
- The adjacency graph (§2.2) is the single source of truth for navigation.

This sidesteps the impossibility entirely: no two rooms ever need to coexist in one coordinate space, so contradictory geometry costs nothing.

**Decided (Q2):** transitions are **walkable hallways with a gentle fade**, *not* render-through-portals. The visitor walks down a short hallway between rooms; the destination scene loads behind the fade. We keep the *topological* impossibility (you can't draw the whole thing) but avoid *perceptual* disorientation (no jarring non-Euclidean visuals, no spinning the camera). Lost-but-playful, not nauseating.

### 2.5 Floors & ring order (config)
**Decided (Q3):** ring order is **arbitrary for now**, and the museum is a **vertical tower of floors** (§2.6). Both live in **one editable config file**:

```ts
// src/config/layout.ts — single source of truth for floors, rooms, and ring order
export const FLOORS = [
  {
    id: "floor-1",
    level: 0,                          // 0 = ground; higher = up the tower
    title: "Ground Floor",
    ring: [                            // ordered themed rooms around this floor's ring
      "egypt",
      "mesoamerica",
      "greece",
      "china",
      "renaissance_italy",
      "tudor_england",
    ],
  },
  // To add capacity: append another floor here (its own atrium + 6-room ring).
  // To reorder a floor's ring: reorder its `ring` array.
];
```

The per-floor wheel graph **and** the vertical connections between floors (§2.6) are **derived** from `FLOORS` at load time. Don't hand-author adjacency.

### 2.6 The tower — vertical extensibility (DECIDED)
**Decided:** capacity grows **vertically, not horizontally.** The museum is a **tower of floors**, each floor an identical structure — one hexagonal atrium + a 6-room ring (\(W_6\)). Floors are stacked and connected by a **spiral staircase at the center of each atrium**.

This is the cleaner answer to the many-door problem from v0.2, and it is strongly on-theme: Borges's Library is an indefinite vertical series of hexagonal galleries joined by spiral staircases winding up and down. The tower *is* the Babel metaphor.

Consequences:
- **Every atrium stays hexagonal forever** — exactly 6 room-exits. No parametric N-gon needed. The atrium's center is no longer a sculpture but the **staircase** (up + down).
- **Adding capacity = appending a floor** to `FLOORS` (§2.5): a new atrium, a new 6-room ring, its own themes/art. Literature is global (§8.5), so new floors need art + themes only.
- **Vertical adjacency:** `atrium(level n) ↔ atrium(level n+1)` via the staircase. **Decided (Q15): the tower is finite** — the ground floor's staircase goes up only, the top floor's goes down only, and the staircase visibly terminates at both ends. Floors are **fully authored**, not procedural (simplifies the content pipeline — no generated upper floors to source). The "endless tower" idea is parked as a possible future mode, not v1.
- **Floors can be themed sets:** floor 1 = the six cultures here; later floors can be other groupings (e.g., a floor of modern movements, a floor of mythologies). That's a content decision per floor, not an engine change.

The staircase is modeled like a hallway (§2.4): a self-contained vertical scene the visitor walks through, with a gentle fade masking the next floor's load. Keeps traversal walkable and non-disorienting.

---

## 3. Room anatomy

### 3.1 Themed room (6 of these)
- **Shape:** regular hexagonal floor, flat ceiling, moderate height (~4–5 m feel).
- **Walls (6), alternating by index** — art walls at even indices `{0,2,4}`, exit walls at odd indices `{1,3,5}` (convention; pick one and keep it).
- **Art wall composition (bottom → top):**
  - A **bookshelf** at standing height holding several volumes (literature/non-fiction). Book spines are interactable; clicking opens the reader (§7.2).
  - On **top of the bookshelf:** a **smaller sculpture or artifact** — e.g., a bust, a vessel, a mask, a tool — as a billboarded sprite (§6.3).
  - On the **upper portion of the wall:** a **framed painting / 2D artwork**, clickable to open the art viewer (§7.1).
- **Exit wall:** an opening to a short **hallway** that leads to the connected room (per §2.2). Hallway is a transition zone (good place to mask scene loads).
- **Center:** a **large sculpture** (billboarded or low-poly 3D), with **benches** arranged facing outward toward the art walls.

### 3.2 Atrium
- Always a **hexagonal** shell (one floor = 6 rooms), with **all 6 walls as exits** (no art walls). No parametric N-gon needed — capacity grows vertically (§2.6).
- **Center holds the spiral staircase** connecting to the floors above/below (replaces the v0.2 "meta sculpture" idea). On the ground floor it ascends only; interior floors go both ways.
- Each exit is labeled/themed so the visitor can tell which culture lies beyond (signage, a color/material cue, or a "vestibule" preview). With the staircase, the atrium is the main wayfinding anchor and the floor's identity marker — keep it legible.

---

## 4. Data model

Keep content **data-driven** and separate from rendering. Suggested schema (JSON/TS):

```ts
type CultureId = "egypt" | "mesoamerica" | "greece" | "china" | "renaissance_italy" | "tudor_england";

interface Museum {
  floors: Floor[];         // the tower
}

interface Floor {
  id: string;              // "floor-1"
  level: number;           // 0 = ground, +1 per floor up
  title?: string;
  ring: CultureId[];       // ordered themed rooms (6 for now)
  rooms: Room[];           // atrium + themed rooms, DERIVED from ring
}

// Navigation graph is derived: per-floor wheel (§2.2) + vertical staircase edges
// atrium(level n) <-> atrium(level n+1).

interface Room {
  id: string;              // "atrium-1" | "{floorId}:{CultureId}"
  kind: "atrium" | "themed";
  culture?: CultureId;
  title: string;
  artWalls: ArtWall[];     // 3 for themed, 0 for atrium
  exits: Exit[];           // 3 for themed; 6 (+ staircase) for atrium
  centerpiece?: Artwork;   // large sculpture (themed rooms); atrium center = staircase
  theme: RoomTheme;        // colors, lighting, ambient audio, materials (§6.6)
}

interface Exit {
  wallIndex?: number;      // 0..5 for horizontal doorways
  kind: "doorway" | "staircase-up" | "staircase-down";
  toRoomId: string;        // target room (or target floor's atrium for staircases)
}

interface RoomTheme {
  palette: string[];
  keyLight: { color: string; intensity: number };
  ambientLight: { color: string; intensity: number };
  materials: Record<string, string>;
  ambientAudioUrl?: string;   // per-culture soundscape (§6.6); atrium = neutral bed
}

interface ArtWall {
  wallIndex: number;       // 0..5
  painting: Artwork;       // upper wall
  shelfItem: Artwork;      // sculpture/artifact on top of shelf
  shelf: BookRef[];        // the books
}

interface Artwork {
  id: string;
  title: string;
  creator?: string;
  date?: string;
  culture?: CultureId;
  imageUrl: string;        // hi-res for viewer
  thumbUrl: string;        // wall texture
  source: SourceRef;       // attribution + license (REQUIRED)
}

interface BookRef {
  id: string;
  title: string;
  author?: string;
  language: string;
  readUrl?: string;        // direct full-text URL (txt/html/epub)
  externalUrl?: string;    // canonical page at source
  source: SourceRef;       // attribution + license (REQUIRED)
}

interface SourceRef {
  provider: string;        // "The Met" | "Project Gutenberg" | ...
  providerUrl: string;
  license: "CC0" | "PD" | "CC-BY" | "CC-BY-SA" | "other";
  attributionText?: string;
  rightsNote?: string;
}
```

**Rule:** every `Artwork` and `BookRef` carries a `SourceRef`. Nothing renders without one. See §8.4.

---

## 5. Tech stack (recommended)

**Decided (stack, v0.5):** the stack is **Vite + React 19 + TypeScript**, Three.js via **@react-three/fiber** + **@react-three/drei**, **Zustand** for state, and **ESLint (flat) + Prettier + Vitest** for quality. Scaffolded in Phase 0 (§10); the camera/controls stay behind a swappable interface for future WebXR (Q7).

- **Rendering:** [Three.js](https://threejs.org) (WebGL) — first-person navigable 3D. Mature, well-documented, good sprite/billboard support.
- **Framework:** React + Vite (or plain Vite). React for the 2D overlay UI (reader, art viewer, attribution); Three.js canvas underneath. `@react-three/fiber` + `@react-three/drei` is a strong option (drei provides `Billboard`, `Html`, loaders, controls).
- **Navigation/controls (decided, Q1):** **free first-person** — `PointerLockControls` (WASD + mouse-look). Click-to-move is dropped for v1.
- **Targets (decided, Q7):** **desktop browser only** for v1. WebXR is a desired future direction, so keep the camera/controls abstracted (a swappable controller interface) and avoid desktop-only assumptions baked into scene code, so a WebXR controller can be added later without a rewrite.
- **State:** lightweight (Zustand or React context). Current floor/room, camera, open overlay, fetched-content cache, audio state. **Stateless across sessions (decided, Q8):** no accounts, no persistence — reading position, randomized shelves, and progress live in memory only and reset on refresh. (On-theme: each visit reshuffles the Library. Revisit Q8 if visitors later want bookmarks/favorites.)
- **Content fetching:** a small TypeScript "sourcing" layer (§8) that talks to the open APIs, normalizes results into the §4 schema, and caches them.
- **Build/deploy:** static site (Vercel/Netlify/GitHub Pages). All heavy lifting is client-side or precomputed at build time.

> When building any UI, **consult the `frontend-design` skill** for styling/design-token guidance before writing components.
>
> _Note (v0.5): the `frontend-design` skill is **not available in the current build environment**. Until it is, UI uses a small local design-token set (CSS variables in `src/index.css`); revisit if the skill becomes available._

Desktop-only for v1; WebXR is a future option the architecture should not preclude (see §6 controls note).

---

## 6. Rendering approach

### 6.1 Rooms as isolated scenes
Per §2.4, each room is its own scene graph. Maintain one "active room" plus optionally pre-load neighbors for snappy transitions. Reuse a single hexagon-shell geometry parameterized by `RoomTheme`.

### 6.2 Walls
- Art wall = textured planes: painting plane (upper), bookshelf (model or textured plane with per-spine hit regions), shelf-item sprite.
- Exit wall = doorway opening + hallway segment. Use the hallway to hide async scene loads (fade or fog).

### 6.3 Sculptures as billboards
As specified, sculptures/artifacts are **billboarded sprites** (a textured quad that always faces the camera) rather than 3D meshes. This keeps the asset pipeline to 2D images only. Use `THREE.Sprite` or drei's `<Billboard>`. Add a subtle ground shadow/plinth so they don't look like floating cardboard. (3D models can be a later upgrade for centerpieces.)

### 6.4 Lighting & mood
Per-culture `RoomTheme` controls ambient color, key light, and material palette so each wing feels distinct (warm sandstone for Egypt, cool marble for Greece, etc.). Keep it readable — visitors must be able to see the art and read spines.

### 6.5 Interaction
Raycast from camera/cursor. Hover → highlight + label. Click → open the relevant overlay (art viewer or reader). `Esc` closes overlays; movement is locked while an overlay is open.

### 6.6 Audio — per-culture ambient soundscape (DECIDED, Q9)
Each themed room has its own **ambient soundscape** (`RoomTheme.ambientAudioUrl`); the atrium has a neutral bed. Implementation:
- Web Audio API. **Crossfade** between soundscapes on room/floor transition (tie the fade to the §2.4 hallway fade so audio and visuals move together).
- Loop seamlessly; keep volume low and non-fatiguing (it's a backdrop, not a score).
- **Autoplay caveat:** browsers block audio until a user gesture — start the audio context on first click/keypress (e.g., the "enter the museum" action) and show a mute/volume control.
- Source the audio under the same open-license discipline as everything else (§8.4): CC0/CC-BY ambient/field-recording libraries (e.g., Freesound under CC filters, or commissioned/owned loops). Store a `SourceRef` per track.
- Optional later: positional audio (a fountain near the atrium, murmurs near shelves). Not v1.

---

## 7. UI / UX overlays (2D, over the canvas)

### 7.1 Art viewer
Full-bleed hi-res image, zoom/pan, title/creator/date, and a **persistent attribution line** (provider + license, linked to source). Next/prev within the room optional.

### 7.2 Reader
**Decided (Q5):** the **full text is readable in-museum** — no link-out-only, no excerpt-only. Opens a book's complete text in a clean typographic reader (serif, comfortable measure, light/dark, paginated or scroll). Fetch the source's plain-text/HTML/EPUB, sanitize, and render. Track scroll/position in session state. Still show attribution + a "read at source" link. Large texts should stream/lazy-load by chapter so opening a long book isn't a wall of loading.

### 7.3 Attribution panel
A global "Credits / Sources" view listing every asset currently loaded with provider and license. Also a small always-visible attribution affordance on each open asset. **This is a compliance requirement, not a nicety** (§8.4).

### 7.4 Wayfinding
Deliberately minimal (the space is supposed to be confusing). The atrium's labeled exits are the anchor. Consider a single "return to atrium" affordance so visitors are never truly lost. **Avoid** a full map — it would defeat §2.3.

---

## 8. Content sourcing

All sources below were checked and are live as of 2026-06-16; **Claude Code should re-verify endpoints, auth, and license terms at build time**, since these change. Prefer **CC0 / public-domain** assets; accept **CC-BY / CC-BY-SA** only if attribution is rendered (it is — §7.3).

### 8.1 Art & artifacts — confirmed
- **The Metropolitan Museum of Art — Collection API.** RESTful JSON, **no auth, no key**, CC0 on open-access works; 470k+ objects, hi-res images. Has strong holdings across **all six** cultures (Egyptian, Greek, Mesoamerican, Chinese, European/Renaissance). Filter by department + `isPublicDomain`. **Primary art source.**
  - Base: `https://collectionapi.metmuseum.org/public/collection/v1/`

### 8.2 Art & artifacts — strong candidates (verify terms at build)
- **Smithsonian Open Access** — CC0 across many units; huge artifact range. API key (free) via api.data.gov.
- **Art Institute of Chicago API** — open access, CC0 subset, clean JSON, IIIF images. Strong for Renaissance/European.
- **Cleveland Museum of Art Open Access API** — CC0 subset, good JSON.
- **Wikimedia Commons / Wikidata** (MediaWiki API) — vast public-domain image pool; the broadest coverage for niche cultures (e.g., Olmec/Maya/Aztec artifacts), but licenses are **per-file** — must parse each.
- **Openverse** — aggregator over Wikimedia, Smithsonian, Europeana, Flickr Commons, etc. (~800M openly licensed media) with normalized **license + attribution** fields. Good single entry point for the "fill in the gaps" cases; still verify per-item.
- **Getty Open Content**, **Rijksmuseum API** (Renaissance/European), **Europeana** — additional European/Renaissance depth.

> Mesoamerica is the thinnest for hi-res open art. The Met + Smithsonian + Wikimedia Commons together should cover Olmec/Maya/Aztec; budget extra curation time here.

### 8.3 Literature & non-fiction — confirmed / known
**Important (per §8.5 decision):** literature is a **single global pool**, *not* bound to a room's culture. All shelves across all rooms draw randomly from this combined corpus. So these sources are aggregated into one pool and sampled; they are not assigned per-room. This is what makes adding rooms cheap — a new room needs art + a theme, but no literature curation.

- **Project Gutenberg via Gutendex** (`https://gutendex.com`) — JSON, **no auth, no known rate limit**, ~70k+ public-domain books; filter by `languages`, `topic`, `search`, `copyright=false`; returns download links (txt/html/epub). **Primary literature source and the backbone of the global pool.**
- **Chinese Text Project** (`https://ctext.org/api...`) — pre-modern Chinese texts with paired English translations; free API key; Python wrapper exists. Feeds the pool with non-Western primary works. (Original texts PD; verify rights on specific digital editions/translations.)
- **Perseus Digital Library** — Greek & Latin classics with translations; adds antiquity to the pool.
- **Wikisource** (MediaWiki API) — multilingual PD texts: plays, treaties, primary documents.
- **Standard Ebooks** — beautifully formatted PD ebooks (curated Gutenberg subset); great for the reader's typography; good candidate for "featured" volumes.
- **Internet Archive** — enormous; good for texts not elsewhere; mixed rights — filter carefully.
- **Sacred-Texts / other PD repositories** — supplementary primary sources.

> **Why global/random (your note):** some cultures have a far larger open text corpus than others, and you plan to add rooms. Decoupling text from culture means a sparse-corpus room is never starved, and the Borgesian "you never know what you'll find on the shelf" effect is preserved. Implementation: build one normalized pool, then sample N books per shelf (optionally seeded per-shelf so a given shelf is stable within a session but varies across visits/rooms).

### 8.4 Licensing & attribution rules (hard requirements)
- Store `license` + `provider` + `providerUrl` (+ `attributionText` where required) for **every** asset.
- **CC0 / PD:** attribution not legally required, but **always display source anyway** (good practice + builds trust).
- **CC-BY / CC-BY-SA:** attribution **required** and must be visible wherever the asset appears (viewer + credits). For CC-BY-SA, be aware of share-alike implications for any derivative.
- **Reject** assets whose license can't be determined.
- Add a project-wide **Sources & Licenses** page.
- **Use context (decided, Q10):** **purely educational / personal**, non-commercial. This means **CC-BY and CC-BY-SA are acceptable** (with visible attribution) alongside CC0/PD, widening the usable pool. Do **not** assume commercial rights; if scope ever changes to commercial, re-screen every source (§12).
- If the project will ever be **commercial**, re-screen every source's terms (some "open" sets restrict commercial use).

### 8.5 Literature is a global random pool (DECIDED)
**Decided (Q6): Model B — "Babel shelves."** Bookshelves draw a semi-random selection from the **entire global corpus** (§8.3), independent of the room's culture. Only the **art and artifacts** are culture-specific; the books are deliberately unpredictable, in the spirit of the source material. Rationale: cultures have very unequal open-text corpora, and new rooms are planned — decoupling keeps every room well-stocked and keeps the discovery/wonder goal intact.

Implementation notes:
- One normalized book pool, sampled per shelf.
- Optional per-shelf seed so a shelf is consistent within a session but differs across rooms/visits.
- Keep a small "featured/legible" subset (e.g., Standard Ebooks) weighted slightly higher so shelves aren't all obscure.

---

## 9. The six rooms

**Note:** literature is a global random pool (§8.5), so the table below lists **art/artifact** sourcing only. Books on every room's shelves come from the same shared corpus regardless of culture.

| # | Room | Scope | Art/artifact sources |
|---|------|-------|----------------------|
| 1 | **Ancient Egypt** | Pre–Bronze Age Collapse (Old→New Kingdom, ~pre-1200 BCE) | Met (Egyptian Art dept), Smithsonian, Wikimedia |
| 2 | **Meso-America** | **Olmec**, Maya, Aztec | Met (Arts of the Americas), Smithsonian, Wikimedia Commons (heaviest reliance) |
| 3 | **Ancient Greece** | Mycenaean → Alexander | Met (Greek & Roman Art), AIC, Wikimedia |
| 4 | **Pre-Yuan China** | Shang/Zhou → Song (pre-1271), **no dynasty emphasis** — broad sampling | Met (Asian Art), Smithsonian, Wikimedia |
| 5 | **Renaissance Italy** | ~14th–16th c. | AIC, Rijksmuseum, Met, Getty, Europeana |
| 6 | **Elizabethan / Tudor England** | ~1485–1603 | Met, AIC, Wikimedia (portraiture) |

**Decided (Q4): art is selected algorithmically.** For each room, the sourcing layer queries the relevant museum APIs (the table above) filtered by culture/department + open-license + has-image, then picks the wall painting, the shelf-top artifact, and the center sculpture from the results. Like the shelves, use a per-room seed so a room is stable within a session but varies across visits. Build in a small **blocklist/quality gate** (skip items with no usable image, tiny resolution, or off-theme tags) and a manual override hook so a bad pick can be pinned/excluded later without going back to hand-curation.

---

## 10. Build plan (phases for Claude Code)

**Phase 0 — Scaffold.** Vite + React + Three.js (or r3f). Repo, lint, deploy pipeline. Stub the §4 data model with hard-coded placeholder content (lorem + a few CC0 test images).

**Phase 1 — One room, walkable.** Build the hexagon shell, 3 art walls + 3 exit walls, billboarded center sculpture, benches, first-person controls, hover/click raycasting. No real content yet.

**Phase 2 — Overlays.** Art viewer + reader + attribution panel, all reading from the data model.

**Phase 3 — The graph & the tower.** Atrium + 6 rooms + hallways + gentle transitions driven by the §2.2 wheel, all generated from `FLOORS` (§2.5). Add the **spiral staircase** as a vertical transition scene and wire `atrium↔atrium` edges so you can climb between floors (even with just one floor stubbed above). Verify full traversal and reliable atrium return.

**Phase 4 — Sourcing layer.** Implement the §8 fetch/normalize/cache pipeline. Start with Met (per-room **algorithmic** art selection, Q4/§9) + Gutendex (the global book pool). Add ctext/Perseus/Standard Ebooks as additional feeds into the same pool. Enforce §8.4 attribution. Implement the §8.5 random-shelf sampler and the seeded per-room art picker with quality gate + override hook.

**Phase 5 — Theming, audio & polish.** Per-room `RoomTheme` (light, color, material). **Per-culture ambient soundscapes with crossfade (§6.6)** + mute control + autoplay-gesture handling. Reader typography, transitions, performance pass (texture budgets, lazy-load, dispose on room/floor exit).

**Phase 6 — Content curation.** Fill the six rooms with vetted assets; handle the thin spots (Mesoamerica art, room-specific literature); QA every attribution.

Each phase should end with the doc updated and a note in §13.

---

## 11. Open design decisions

**All v0 questions resolved.** Summary: Q1 first-person WASD · Q2 walkable gentle transitions · Q3 random ring via `layout.ts` · Q4 **algorithmic art selection** · Q5 full-text in-museum reader · Q6 global random literature pool · Q7 desktop-only (WebXR-friendly) · Q8 **stateless** · Q9 **per-culture ambient soundscape** · Q10 educational/personal (CC-BY OK) · Olmec confirmed · no China dynasty emphasis · **tower-of-floors architecture** with spiral-staircase atria.

**New questions surfaced by the tower model (for a later session, not blocking):**
- **Q13 — Staircase fidelity:** walkable spiral geometry (visitor climbs) vs. a stylized transition scene (step on → fade → arrive)? Either fits §2.4; the walkable version is more immersive but more work.
- **Q14 — Floor identity:** how does a visitor know which floor they're on and what's above/below? (Atrium signage, a subtle floor indicator, a glimpse up/down the staircase shaft?)
- **Q15 — Tower bounds:** ✅ **Resolved — finite** (ground + N authored floors; staircase terminates top and bottom; no procedural floors for now).

---

## 12. Risks & notes

- **Mesoamerican open hi-res art is scarce** vs. the other five; plan extra curation and lean on Wikimedia + Smithsonian.
- **CORS / hotlinking:** some APIs block cross-origin image use or rate-limit. May need a thin proxy or a build-time fetch-and-cache step rather than pure runtime calls.
- **License drift:** open-access programs change terms; re-verify at build and store the license snapshot with each asset.
- **Performance:** lots of hi-res textures will blow the GPU/memory budget. Use thumbnails on walls, hi-res only in the viewer; dispose textures on room exit.
- **Disorientation vs. frustration:** keep at least one reliable anchor (atrium return) so "lost" stays playful.
- **Translation rights (ctext, Perseus):** the ancient *text* is PD, but a specific modern *translation* may not be. Verify per work.
- **Audio autoplay:** browsers block sound until a user gesture — gate audio start on the "enter" interaction and ship a mute control (§6.6). Also screen audio licenses like everything else.
- **Vertical traversal:** if the staircase is walkable (Q13), watch camera collision/clipping on the spiral and motion comfort; the transition-scene fallback avoids both.

---

## 13. Changelog
- **v0.7 (2026-06-16):** **Phase 2 (Overlays) complete** (§7, §10): the click interaction now opens real 2D overlays that read from the data model — an **art viewer** (full-bleed image, zoom/pan, title/creator/date, persistent attribution line; §7.1); an in-museum **reader** (serif, comfortable measure, light/dark toggle, scroll position kept in session state, "read at source" link; §7.2 — placeholder text until the Phase 4 fetch/sanitize pipeline); and a global **Sources & Licenses** panel listing every loaded asset with provider + license (§7.3 / §8.4; opened via the Sources button or the "C" key). Movement and raycast pause while an overlay is open; Esc or × closes it. Added `model/assets.ts` (`collectRoomAssets`, de-duped by kind+id) with tests (13 total). Verified: lint clean, type-checked build, and all three overlays render (screenshotted).
- **v0.6 (2026-06-16):** **Phase 1 (One walkable room) complete** (§10): a reusable hexagon shell (floor/ceiling/6 walls, parameterized by `RoomTheme`) with art on walls {0,2,4} and doorway frames on {1,3,5}; art walls carry a bookshelf of clickable spines, a billboarded artifact, and a framed painting (§3.1); a billboarded center sculpture on a plinth with three benches; **first-person pointer-lock + WASD** behind a swappable controller seam (`controls/`, ready for WebXR per Q7); **center-screen raycast** hover-highlight + DOM label + click (`interaction/`, §6.5); short dark hallway stubs at exits; per-culture lighting + fog. Verified: lint clean, 10/10 tests (added hexagon-geometry invariants), type-checked build, and the room renders + interacts. Q13/Q14 (staircase fidelity, floor identity) stay open, due at Phase 3.
- **v0.5 (2026-06-16):** **Stack locked** — react-three-fiber + drei (Vite + React 19 + TS + Zustand; ESLint/Prettier/Vitest), recorded in §5. **Phase 0 (Scaffold) complete** (§10): project structure, the §4 data model (`model/types.ts`), `config/layout.ts`, the graph-derivation engine (`model/deriveMuseum.ts`) that builds the §2.2 wheel + §2.6 finite-tower from `FLOORS`, unit tests for the graph invariants, placeholder content behind a pluggable `ContentProvider` seam (swapped for the §8 sourcing layer in Phase 4), a minimal r3f scene, lint, and CI. Verified: lint clean, 7/7 tests, type-checked production build, and the scene renders (HUD reads the derived model). Also fixed §6 subsection ordering (6.5 before 6.6).
- **v0.4 (2026-06-16):** Q15 resolved — **tower is finite** (ground + N fully authored floors; staircase terminates top and bottom; no procedural floors for v1). Updated §2.6 and §11. Q13 (staircase fidelity) and Q14 (floor identity) remain open and non-blocking.
- **v0.3 (2026-06-16):** Resolved final open questions and adopted a **tower architecture**. Algorithmic art selection (Q4, §9); stateless across sessions (Q8, §5); per-culture ambient soundscapes with crossfade (Q9, §6.6). **Replaced horizontal room-growth with a vertical tower of floors connected by spiral-staircase atria** (§2.5/§2.6, §3.2) — retires the many-door problem and reinforces the Babel metaphor. Data model gained `Floor` + vertical staircase exits + `RoomTheme.ambientAudioUrl` (§4). Updated build plan (Phases 3–5) and risks. Surfaced new non-blocking questions Q13–Q15 (staircase fidelity, floor identity, tower bounds).
- **v0.2 (2026-06-16):** Resolved 8 open decisions. First-person WASD controls (Q1); walkable gentle hallway transitions, no portal-through (Q2); random ring order driven by an editable `layout.ts` config, plus extensibility plan for adding rooms / parametric atrium (Q3, §2.6); full-text in-museum reader (Q5); **literature reframed as a single global random pool decoupled from culture** (Q6, rewrote §8.3/§8.5/§9); desktop-only with WebXR-friendly architecture (Q7); educational/personal use, CC-BY acceptable (Q10); confirmed Olmec and no China dynasty emphasis. Remaining open: art curation model (Q4), persistence (Q8), audio (Q9).
- **v0.1 (2026-06-16):** Initial draft. Topology resolved as wheel graph \(W_6\); portal/graph rendering approach chosen; sourcing options identified and the three primary sources (Met, Gutendex, Chinese Text Project) verified live; data model, build phases, and open decisions drafted.
