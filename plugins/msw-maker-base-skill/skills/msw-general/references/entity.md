# MSW Entity — `.map` Placement & Runtime

Place and manage entity **instances** in `.map` files through `MapBuilder`; spawn, parent, and handle hierarchy at runtime. `.model` template authoring is split out into [model.md](model.md).

The legacy Maker RPC (curl) API has been removed. `.map` inspection and mutation are performed through `skills/msw-general/scripts/map/msw_map_builder.cjs`, followed by **msw-maker-mcp** verification tools.

---

## File / Tool Overview

| Area | Path | Role |
|------|------|------|
| Map | `./map/*.map` | Map root, footholds, tiles, **all placed entities** |
| User models | `./RootDesk/MyDesk/Models/{Category}/*.model` (typed subfolder, e.g. `Models/Monsters/`) | Custom `.model` templates ([model.md](model.md) — never save directly under `MyDesk/` or `Models/`) |
| System models | `./Global/*.model` | Engine default templates (monster presets, Player, etc.) — read-only; copy into `MyDesk/Models/{Category}/` to customize |
| UI | `./ui/*.ui` | UI-only entities and widgets ([`msw-ui-system`](../../msw-ui-system/SKILL.md)) |

> **Placing a monster** — read [monster.md](monster.md) first. Monsters have 11 required components, lowercase `ActionSheet` keys, and several `IsLegacy: false` flags. Mixing inline `@components` with `modelId` overrides on a system monster model produces `LEA-3046 InternalError` at runtime; bake the values into a dedicated `.model` instead.

> MCP tools are self-documenting when connected. If the user asks about MCP setup, share this link: https://maplestoryworlds-creators.nexon.com/ko/docs?postId=1368

---

## Scope Concept (file-edit workflow)

1. **Scope of "what shows up in the list"**
   - The editor **hierarchy** and the builder entity list for `./map/{mapname}.map` only contain entities belonging to **that map instance**.
   - When listing entities by opening a file, the **currently edited map file is the scope**. Placements in other maps live in other `.map` files.

2. **Scope of ID / path-based access**
   - In runtime Lua, you can reference an entity in any map via a **global path** like **`_EntityService:GetEntityByPath("/maps/map01/Monster01")`**.
   - Entity **`id` (UUID)** is also stored in the map file, and scripts can track it by the same ID (assuming the map is loaded).

**Practical implication**: "What's in this map?" → search `./map/{this}.map`. "Find this entity across the whole world" → grep all `.map` files.

---

## Component vs Logic

> See `msw-scripting` §3 for type comparison, declaration syntax, and decision criteria. Behavior attached to an entity → Component; global singleton manager → Logic.

---

## StateComponent vs StateAnimationComponent

### StateComponent

- **Role**: game-logic state machine (e.g. `Walk`, `Jump`, `Dead`, `Attack`).
- **May not play animation directly** — manages only state names and transition conditions.
- Controlled from scripts via `CurrentStateName`, `ChangeState()`, etc.
- The **DefaultPlayer** family uses `StateComponent` + `AvatarStateAnimationComponent`.

### StateAnimationComponent

- **Role**: visual state / action playback based on **sprite / action sheet** (`ActionSheet`).
- In monster / object models, handles the **action name ↔ sprite sequence** mapping.
- A common pattern is `actionSheet` etc. in `.model` `Properties` linking to `StateAnimationComponent`.

**Difference**: **StateComponent = logical state**; **StateAnimationComponent = sprite animation data**. In a model that has both, keep names and transition timing aligned.

---

## TouchReceiveComponent vs ButtonComponent

> See `msw-scripting` §10 for world input (TouchReceiveComponent + TouchEvent) vs UI input (ButtonComponent + ButtonClickEvent). Swapping them silently drops all input. Do not attach UI components to map entities.

---

## Entity.CurrentMap (strongly recommended)

At runtime, when spawning, parenting, or searching within the same map, use **`self.Entity.CurrentMap`** or an already-acquired map entity.

```lua
local map = self.Entity.CurrentMap
_SpawnService:SpawnByModelId("myenemy", "Enemy_1", position, map)
```

- **`SpawnService` parent must not be nil** — yields LWA-3019 warnings and undefined behavior.
- Unless a special case requires another parent (such as out-of-map common), **always pass the map entity**.
- For file-only edits, reflect the spawn position in `.map`'s `TransformComponent.Position`.

---

## RUID (Resource Unique ID)

- MSW resources (sprites, tilesets, sounds) are identified by **RUID strings**.
- An empty **`SpriteRendererComponent.SpriteRUID`** means **the entity is invisible** (with no error).
- In `.model` `Values` or `.map` `@components`, use either a string or `{ "DataId": "hex..." }` form — **match the existing pattern in the same map / model**.

**Asset search**: use the `msw-search` skill or `_ResourceService` API. Replace temporary placeholders with real assets before release ([platform.md](platform.md)).

---

## Snapshot Workflow (get → edit → set)

```
1. GET  : `MapBuilder.read("./map/{map}.map")`.
2. EDIT : call builder APIs only (`placeModel`, `sprite`, `patch`, `patchComponent`, etc.).
3. SET  : `map.write("./map/{map}.map")`.
4. SYNC : call MCP `refresh`.
5. (optional) `play` → check runtime via `logs`.
```

**Caution**: `.map` files have very large entity arrays. Use the builder snapshot and patch APIs for covered work. Direct raw JSON edits are allowed only when `MapBuilder` explicitly does not cover the operation; keep the edit minimal and verify with refresh/logs.

---

## Builder Values

Map entity values are patched through `MapBuilder` component APIs. Use world-unit vectors like `pos: [x, y, z]`, color helpers, and component override objects; do not hand-write raw component JSON except as a builder argument for a single component payload.

---

## MapBuilder Protocol

`MapBuilder` covers the safe subset needed for common agent map work. It does not replace Maker. Use it first for covered operations; direct `.map` reads/writes are allowed only when the builder explicitly cannot cover the task.

Use `../scripts/map/msw_map_builder.cjs` for inspection and mutation:

```javascript
const { MapBuilder } = require("../scripts/map/msw_map_builder.cjs");

const map = MapBuilder.read("map/map01.map");
console.log(map.getMapInfo());
console.log(map.listEntities());

map.placeModel("Monster01", "RootDesk/MyDesk/Models/Monsters/Slime.model", {
  pos: [3, 1, 0],
});

map.write("map/map01.map");
```

### Required Workflow When Covered

1. `MapBuilder.read("map/{name}.map")`.
2. Inspect with `getMapInfo()`, `getTileMapMode()`, `listEntities()`, `find()`, `getTiles()`, or `getFootholds()`.
3. Mutate through builder APIs when the operation is covered.
4. `write()` the same map file.
5. Run MCP `refresh`; then verify with logs/play if runtime behavior matters.

### API

| Method | Returns | Purpose |
|---|---|---|
| `MapBuilder.read(path)` | `MapBuilder` | Load a `.map` file |
| `MapBuilder.snapshot(path)` | summary | Read-only summary without instantiating |
| `getMapInfo()` | summary | TileMapMode, gravity, instance flag, counts |
| `getTileMapMode()` | `0`/`1`/`2` | MapleTile / RectTile / SideViewRectTile |
| `listEntities()` | array | Compact entity list |
| `find(name)` | entity record | Lookup by map root name, relative child name, or `/maps/...` path |
| `component(name, compType)` | component object | Read a component on an entity |
| `placeModel(name, modelPath, opts)` | entity id string | Place a `.model` instance (`pos`, `componentOverrides`, ...) |
| `sprite(name, opts)` | entity id string | Inline sprite entity (`ruid`, `pos`, `order`) |
| `empty(name, opts)` | entity id string | Empty/script-only entity (`pos`, `scripts`) |
| `entity(name, components, opts)` | entity id string | Low-level entity placement |
| `patch(name, updates)` | boolean | Position/enable/rename in one call |
| `patchComponent(name, compType, fields)` | boolean | Field-level component update |
| `upsertComponent(name, compType, body)` | boolean | Add or replace a component |
| `removeComponent(name, compType)` | boolean | Drop a component |
| `rename(oldName, newName)` | boolean | Rename an entity |
| `remove(name)` | boolean | Delete an entity and descendants |
| `getTiles()` / `getTileAt(x,y)` / `getTileBounds()` | tile data | Tile inspection |
| `getFootholds(layer)` / `getFootholdBounds(layer)` | foothold data | Foothold inspection |
| `build()` | JSON | In-memory map JSON |
| `snapshot()` | summary | Current builder state summary |
| `write(path)` | `MapBuilder` | Save back to `.map` file |

Read-only inspection is `find()` + `component()`. To read raw entity JSON when the builder cannot cover the case, fall back to parsing the `.map` file's `ContentProto.Entities[*].jsonString` directly.

### Load / Inspect

```javascript
const map = MapBuilder.read("map/map01.map");
MapBuilder.snapshot("map/map01.map");

map.getMapInfo();       // TileMapMode, Gravity, IsInstanceMap, entity/tile/foothold counts
map.getTileMapMode();   // 0 MapleTile, 1 RectTile, 2 SideViewRectTile
map.listEntities();     // compact entity list
map.find("map01");      // root map entity by map name
map.find("Monster01");  // child entity by relative name or /maps/... path
map.component("Monster01", "MOD.Core.TransformComponent");
```

### Entity Placement

Prefer `.model` + `modelId` placement for repeated or runtime-spawned content.

`pos` accepts `[x, y, z]` (preferred), `{ x, y, z }`, or the exported `vector3(x, y, z)` helper. All normalize to the same component value.

```javascript
map.placeModel("Monster01", "RootDesk/MyDesk/Models/Monsters/Slime.model", {
  pos: [3, 1, 0],
});

map.sprite("Tree01", {
  ruid: "1705e3c5b2c146ac9a699f96fb067408",
  pos: [-2, 0, 0],
  order: 5,
});

map.empty("WaveController", {
  pos: [0, 0, 0],
  scripts: ["script.WaveController"],
});
```

`placeModel()` mirrors the model component list into the map instance and applies `Values`/property links where they target component fields. Per-instance overrides belong in `componentOverrides`.

```javascript
map.placeModel("FastMonster01", "RootDesk/MyDesk/Models/Monsters/FastMonster.model", {
  pos: [5, 1, 0],
  componentOverrides: {
    "MOD.Core.MovementComponent": { InputSpeed: 1.4 },
  },
});
```

### Patch / Rename / Remove

```javascript
map.patch("Monster01", { pos: [4, 1, 0], enable: true });
map.rename("Monster01", "Monster_A");
map.remove("Monster_A");
```

### Component Updates

```javascript
map.upsertComponent("Npc01", "script.NpcDialog", { "@type": "script.NpcDialog", Enable: true });
map.patchComponent("Npc01", "MOD.Core.SpriteRendererComponent", { OrderInLayer: 20 });
map.removeComponent("Npc01", "script.OldComponent");
```

### Tiles And Footholds

```javascript
map.getTiles();
map.getTileAt(0, 0);
map.getTileBounds();

map.getFootholds("1");
map.getFootholdBounds("1");
```

Tile array writes are only for explicit programmatic terrain requests. Normal tile painting remains a Maker editor task; guide the user through Maker UI and refresh afterward.

### Coverage Gaps

`MapBuilder` is intentionally incomplete. Use Maker UI first where appropriate, or carefully scoped direct `.map` edits when a task requires one of these:

- New map creation from a complete Maker-compatible template
- `TileMapMode` switching
- Most tile-painting workflows
- Foothold add/delete/re-chain authoring
- MapLayer creation, rename, sorting, visibility, and locking
- Background editing
- Portal, SpawnLocation, SectorConfig high-level workflows
- RectTileMap-specific high-level editing
- Collision, sorting layer, camera, map bounds, and map area high-level APIs
- Maker internal migration or normalization behavior

Before filling any gap in `MapBuilder`, verify the behavior against a Maker-saved file or engine/source metadata and add a focused smoke test.

### Map Mode Rules

Always inspect `TileMapMode` before any map work:

| Value | Mode | Required Body |
|:--:|---|---|
| `0` | MapleTile | `RigidbodyComponent` |
| `1` | RectTile | `KinematicbodyComponent` |
| `2` | SideViewRectTile | `SideviewbodyComponent` |

The builder may read the mode, but it must not be used to flip `TileMapMode` directly. Mode switching is a Maker Hierarchy right-click operation.

### Constraints

- Prefer `MapBuilder` for covered operations.
- Direct `.map` reads/writes are allowed only for uncovered operations; keep edits minimal and verify with `refresh` plus logs/play when behavior matters.
- Do not hand-write `Entities[]`, `componentNames`, `origin`, `pathConstraints`, or foothold chains when a builder API can do it.
- Use `.model` first for any composition placed more than once or spawned at runtime.

---

## TileMapMode ↔ Movement Components

`MapComponent.TileMapMode` on the map root determines the **entire movement / gravity / collision stack**. If an entity's Body-family component does not match the map, **it will not move** (with no error) — and the engine will log one of the `[LEA-3004] MissingComponent` messages ([platform.md §4](platform.md)).

### Map Work Preflight (mandatory before any map task)

Before touching a map in any way (entity placement, spawn, movement scripts, applying models, tile edits, etc.), always confirm the following two items **in order**:

1. **Identify which map you are working on and where it lives** (e.g. the `./map/{mapname}.map` path and its root entity).
2. **Use `MapBuilder.read(...).getTileMapMode()` to read `MapComponent.TileMapMode` as a number**, and keep the value in mind:
   - `0` → **MapleTile** (side-view + Foothold; Body = `RigidbodyComponent`)
   - `1` → **RectTile** (top-down grid; Body = `KinematicbodyComponent`)
   - `2` → **SideViewRectTile** (side-view tile grid; Body = `SideviewbodyComponent`)

**Do not proceed with model / entity / script work while the `TileMapMode` value is unknown or unclear.** The three modes differ completely in Body component, events, gravity, and collision. A mismatch is not a compile-time error — it surfaces as a runtime `[LEA-3004] MissingComponent` log **or** as a silent failure where the entity simply refuses to move with no error at all.

### Recommending the mode (when starting a new map or when the current mode is wrong for the user's goal)

For **new map authoring** — or whenever the current map's `TileMapMode` clearly does not fit the gameplay the user described — **explicitly recommend the appropriate `TileMapMode` before doing any further entity / model / script work** (do not silently proceed with whatever is already on disk).

Use this decision matrix:

| User's intended game / gameplay | Recommend | Why |
|---|---|---|
| MapleStory-style side-scrolling action · jump · ladder · freely placed footholds (platformer) | **`0` MapleTile** | Side-view + gravity + freely placed Foothold line segments |
| Top-down RPG · maze · board game · dungeon crawler · Bomberman-style · farming sim | **`1` RectTile** | Top-down 4-directional free move, no gravity, square-tile grid |
| Tile-based side-scrolling platformer · Mario-style pixel action · side-view puzzle | **`2` SideViewRectTile** | Side-view + gravity **on a tile grid** (not free footholds) |

If the user has not yet told you what kind of game they want, **ask one short question first** (e.g. "Is it top-down, or side-scrolling (jump/ladder)? Is it based on freely placed footholds, or a square tile grid?") and only then recommend.

### Changing `TileMapMode` — user action in Maker, not an AI file edit

The AI must **never** write a new value into `MapComponent.TileMapMode` directly in the `.map` JSON. Mode switching swaps tile components, rebuilds footholds, and converts tile-data formats — Maker handles all of that internally.

Guide the user to switch the mode in the Maker editor as follows:

1. Open the Maker editor's **Hierarchy** window.
2. **Right-click the target map entity** in the Hierarchy.
3. Choose the **"Switch ..." option that matches the target mode** (Switch TileMap / RectTileMap / SideViewRectTileMap) from the context menu.
4. After the user reports the switch is complete, call MCP **`refresh`**, then re-read `MapComponent.TileMapMode` to confirm and re-check every dynamic entity's Body component against the new mode.

> AI role on mode changes: **recommend mode → wait for the user to right-click-switch in the Maker Hierarchy → refresh → fix Body components / scripts that no longer match**. Do not flip `TileMapMode` from a file edit.

> Mapping table / check protocol / transition limits: [platform.md §4](platform.md). `LEA-3004` and other silent-failure symptoms (won't move / won't render / floating in mid-air / stuck in a wall …): [troubleshooting.md](troubleshooting.md). Per-map-type code patterns: [platform-maple.md](platform-maple.md) / [platform-rect.md](platform-rect.md) / [platform-sideview.md](platform-sideview.md). Tile painting itself: [tile.md](tile.md).

---

## Two-Step Map Editing Workflow (create → place)

1. **Create** — define the `.model` under `RootDesk/MyDesk/Models/{Category}/{Name}.model` (typed subfolder; details in [model.md §1, §2.2](model.md)).
2. **Place**
   - Use `MapBuilder.read("./map/{map}.map").placeModel(name, modelPath, { pos })`.
   - **`modelId` form (default — required for ≥2 instances)**: `placeModel()` mirrors model components and applies per-instance overrides.
   - **Inline form**: use `sprite()` / `empty()` only for true one-off map-local entities.
   - Follow the builder protocol in [MapBuilder Protocol](#mapbuilder-protocol).
   - `refresh`.

### `modelId` vs Inline — Decision Rule

| Situation | Form |
|---|---|
| Same composition placed **≥2 times** in this map | **`modelId`** (always — author a `.model` first if none exists) |
| Same composition reused in **another map** | **`modelId`** |
| Will be spawned at runtime via `SpawnByModelId` | **`modelId`** (required) |
| Truly one-off composition that will never recur | inline `@components` is acceptable |

> When in doubt, choose `modelId`. Five inline copies of "the same monster" silently drift apart over edits (one gets `IsLegacy: true`, another loses `SortingLayer`); the model anchors the canonical values and a single edit propagates.

---

## Handling Entity Instances in `.map`

### Common fields (must match)

- **`id`**: UUID v4 (with hyphens). Generate fresh for new entities.
- **`path`**: `/maps/{mapname}/{entityname}` — parent-child hierarchy is the path prefix.
- **`componentNames`**: comma-joined `@type` values of `@components`, **kept in sync**.
- **`jsonString.path`**: same as the outer `path`.
- **`pathConstraints`**: root `//`, child `///`.
- **`displayOrder`**: avoid overlap among siblings.

### modelId entities

Use `MapBuilder.placeModel()`. It creates the model instance metadata, keeps component names in sync, mirrors model components, and applies per-instance `TransformComponent.Position` / `componentOverrides`.

### Adding a new map to the world

- You may need to add `map://{mapId}` to `entries` in `Global/SectorConfig.config`.

---

## Tile-map entity transform is locked

The map's tile-grid container — the entity carrying `TileMapComponent` (MapleTile) or `RectTileMapComponent` (RectTile / SideViewRectTile) — has its `TransformComponent` **locked by the tile-map component itself**. Writes to `TransformComponent.Position` / `EulerAngles` / `Scale` are **silently rejected** with a `LWA-3047 NativeIssue_UnableToChange` warning. The engine keeps this entity at a fixed origin (`(0, 0, z)`, or a half-cell offset for odd-grid RectTile maps) so that tile coordinates and world coordinates stay in a known relationship.

**This applies regardless of whether the entity was placed with `modelId` or as an inline `@components` block** — the lock comes from the tile-map component, not from how the entity was authored. Moving the entity in `.map` JSON appears to take, but `refresh` reverts it to `(0, 0, z)`; runtime `Position = ...` writes produce no visible movement and log `[LWA-3047]`.

**Workaround**: do not try to move the tile-map entity. Anchor your game's coordinate system to the locked origin instead — keep gameplay anchors (grid origin, spawn points, path waypoints) in tile coordinates and convert via the tile-map component's helpers (e.g. `RectTileMapComponent:ToWorldPosition(cellPos)` — see [`platform-rect.md`](platform-rect.md) §3).

Symptoms when the rule is ignored:

- A `Position` written into `.map` JSON reverts to `(0, 0, z)` after Maker `refresh`.
- Runtime `TransformComponent.Position = ...` writes have no observable effect; `logs` shows `[LWA-3047] UnableToChange`.
- Adding a custom child entity to the tile-map entity works, but the child's effective world position is still measured relative to the locked parent at `(0, 0)`.

This is **by design** — the tile-map entity is the canonical reference frame for tile↔world conversion. Decorations, spawn anchors, or overlays that need to be elsewhere should live as **siblings under the map root, not as children of the tile-map entity**.

---

## Placement Coordinate Rules

### Y (MapleTile + footholds)

- Align character / foothold-based entities to the **top of the foothold**.
- The **`y`** of each foothold's `StartPoint`/`EndPoint` in `FootholdComponent` is the platform height.
- A small offset (+0.01 to 0.05) may be needed depending on sprite anchor / collider offset — verify with `play` + `screenshot`.

### Horizontal Spacing (multiple monsters / objects in a row)

- **Always use the `modelId` form** for repeated entities (see "Two-Step Map Editing Workflow → Decision Rule" above). The N instances should share one `.model` and differ only in `TransformComponent.Position`.
- Space along X **without overlap** based on each entity's **bound width** (`TiledSize`, `BoxSize`).
- Even spacing: `x_i = x0 + i * (width + gap)`.
- On the same foothold, share **the same Y** and only shift X.

### RectTile / SideViewRectTile

- **Grid-based** placement — verify the conversion between `RectTileMapComponent` tile coordinates and world coordinates ([tile.md](tile.md)).
- On RectTile (no gravity), assume **Kinematicbody** and move on the XY plane.

### Camera Visible Area

- See the rough visible-world-unit table in [platform.md §5](platform.md) for PC / mobile — verify the **start position is on-screen**.

---

## RPC → File-Based Replacement Table

| Old (RPC) | Current equivalent |
|----------------|-----------|
| Create entity | Author `.model` under `RootDesk/MyDesk/Models/{Category}/` + place it with `MapBuilder.placeModel()` |
| Delete entity | `MapBuilder.remove()` |
| Change property | `MapBuilder.patchComponent()` for map instances or ModelBuilder values for templates |
| Add/remove component | `MapBuilder.upsertComponent()` / `removeComponent()` for one-off map-local instance changes |
| Register/edit/delete model | CRUD `.model` files under `RootDesk/MyDesk/` (`refresh`) |
| List entities | `MapBuilder.snapshot()` / `listEntities()` |

---

## Runtime Verification

For **runtime state** that's hard to know from files alone, use `logs` and `log()` in play mode.

### Flow

1. Add `log()` in `.mlua` for the value to inspect
2. `refresh` → `play` → collect via `logs`
3. `stop` → edit files → repeat

### When you don't know an API

1. **`.d.mlua`** — search `Environment/NativeScripts/` for `EntityService`, `SpawnService` signatures
2. **`msw-search`** — API details, implementation guide

After work, `**stop**` to return to edit mode.

---

## Constraint Rules Checklist

### Files / Editor / MCP

1. **Run `refresh` after file changes** (not allowed during play — `stop` first).
2. **Use `MapBuilder` first for `.map` work** — direct raw JSON edits are only for explicitly unsupported gaps, and must be minimal plus verified.
3. **Do not modify `Environment/*.d.mlua`** — API definitions are read-only.
4. **Do not create or edit `.codeblock` manually** — Maker `refresh` generates it from `.mlua`.
5. **Take `screenshot` only when the user explicitly asks or when identifying coordinates for input simulation.**

### Physics / Movement / Map

6. **TileMapMode ↔ Body components** must match.
7. On **MapleTile**, placement Y is **foothold-based**; assumes gravity / Rigidbody.
8. On **RectTile**, do not expect vertical foothold physics — assumes Kinematicbody.
9. When inspecting or changing foothold data, use `MapBuilder` APIs so Id / Length / OwnerId consistency is centralized.

### Render / Resource

10. **If a visual is needed, do not leave `SpriteRUID` empty.**
11. **RUIDs must be project-registered resources** — arbitrary strings are missing at runtime.
12. **Match the form of TileSetRUID / sprite DataRef** to existing maps.

### Entity / Spawn / Hierarchy

13. **Keep `id` / `path` / `componentNames` / `jsonString.path` consistent in `.map`.**
14. **`SpawnService` parent must not be nil** — pass a map entity such as `self.Entity.CurrentMap`.
15. **When referencing `modelId`**, `origin.entry_id` = `modelId`, and `origin.root_entity_id` = the entity's own outer `id` (top-level instance).
16. **Use `MapBuilder.placeModel()` for `modelId` instances** — it mirrors model components and keeps `componentNames` in sync. Empty component names or partial component arrays silently remove components at runtime.
17. Child entities must have a **`path` that is a prefix of the parent**.

### Input / UI Boundary

18. **TouchReceive (world) vs Button (UI)** — do not confuse input layers.
19. Keep the responsibilities of UI-only groups (the `ui` hierarchy) and map entities separated.

### State / Animation

20. Do not confuse the roles of **StateComponent (logic)** vs **StateAnimationComponent (sprite action)**.
21. Action-name strings must **match** across code, action sheet, and animation data.

### Verification Loop

22. **`refresh` → `logs`** → **`play` → `logs` → `stop`**.
23. On intermediate failure, **stop the following steps** — fix the cause and retry.

---

## Related Skills / Docs

| Doc | Purpose |
|-------------|------|
| [MapBuilder Protocol](#mapbuilder-protocol) | `.map` builder protocol |
| [model.md](model.md) | `.model` template authoring |
| [tile.md](tile.md) | Tile maps / tilesets |
| [`msw-ui-system`](../../msw-ui-system/SKILL.md) | UI authoring |
| [platform.md](platform.md) (core) | TileMapMode↔Body mapping, spawn, RUID, coordinates, `.directory`, ID, `.config` (common to all map types) |
| [platform-maple.md](platform-maple.md) / [platform-rect.md](platform-rect.md) / [platform-sideview.md](platform-sideview.md) | Per-map-type physics/events/patterns/checklists |
| [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix reference (`LEA-3004`, "won't move", "won't render" …) |
| `msw-defaultplayer` | Player model / Values / components |
| `msw-scripting` | Component/Logic, properties, lifecycle |
| `msw-search` | RUID / asset / doc search |

The core principle of entity work is **"models are templates, maps are instances, MCP is for verification."**
