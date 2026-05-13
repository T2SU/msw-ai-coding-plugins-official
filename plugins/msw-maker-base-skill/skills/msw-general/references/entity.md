# MSW Entity — `.map` Placement & Runtime

Place and manage entity **instances** in `.map` files; spawn, parent, and handle hierarchy at runtime. `.model` template authoring is split out into [model.md](model.md).

The legacy Maker RPC (curl) API has been removed, so all work is performed via **direct workspace file edits** combined with **msw-maker-mcp** tools.

---

## File / Tool Overview

| Area | Path | Role |
|------|------|------|
| Map | `./map/*.map` | Map root, footholds, tiles, **all placed entities** |
| User models | `./RootDesk/MyDesk/Models/{Category}/*.model` (typed subfolder, e.g. `Models/Monsters/`) | Custom `.model` templates ([model.md](model.md) — never save directly under `MyDesk/` or `Models/`) |
| System models | `./Global/*.model` | Engine default templates (monster presets, Player, etc.) — read-only; copy into `MyDesk/Models/{Category}/` to customize |
| UI | `./ui/*.ui` | UI-only entities and widgets ([ui.md](ui.md)) |

> **Placing a monster** — read [monster.md](monster.md) first. Monsters have 11 required components, lowercase `ActionSheet` keys, and several `IsLegacy: false` flags. Mixing inline `@components` with `modelId` overrides on a system monster model produces `LEA-3046 InternalError` at runtime; bake the values into a dedicated `.model` instead.

> See [mcp-tools.md](mcp-tools.md) for MCP tools (refresh, logs, play/stop, etc.) and usage rules.

---

## Scope Concept (file-edit workflow)

1. **Scope of "what shows up in the list"**
   - The editor **hierarchy** and **`ContentProto.Entities` of `./map/{mapname}.map`** only contain entities belonging to **that map instance**.
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
1. GET  : read `./map/{map}.map` or `./RootDesk/MyDesk/.../{model}.model`.
2. EDIT : keep JSON structure intact; modify only the needed fields (sync id / path / @components carefully).
3. SET  : save the file.
4. SYNC : call MCP `refresh`.
5. (optional) `play` → check runtime via `logs`.
```

**Caution**: `.map` files have very large `ContentProto.Entities[]` arrays. **Do not regenerate the whole file** — apply minimal edits only to the relevant entity block.

---

## Inline `@components` Values in `.map` Files

Map entity JSON often stores values **directly into fields without `ValueType`**.

| Logical type | `.map` / inspector JSON example |
|-----------|-------------------------|
| Number | `1.0`, `100` |
| String | `"..."` |
| Vector3 | `"Position": { "x", "y", "z" }` |
| Color | `"Color": { "r", "g", "b", "a" }` |
| DataRef / RUID | `"SpriteRUID": "hex..."` **or** `{ "DataId": "hex..." }` — **match the form used by existing entities in the same map** |

> See [model.md §9](model.md) for the full `ValueType` rules of `.model` `Values`. The same logical value **may have different JSON representations** in `.map` vs `.model` — preserve each file's existing pattern.

### Special Cases

| Situation | Caution |
|------|------|
| Quaternion | `.map` `TransformComponent` has a separate `QuaternionRotation` field — copy from an existing entity, then edit |
| ZRotation vs Rotation | Map data may carry both — there are cases where **fixing only one is wrong**, so preserve the pattern of the same entity |

---

## TileMapMode ↔ Movement Components

`MapComponent.TileMapMode` on the map root determines the **entire movement / gravity / collision stack**. If an entity's Body-family component does not match the map, **it will not move** (with no error) — and the engine will log one of the `[LEA-3004] MissingComponent` messages ([platform.md §4](platform.md)).

### Map Work Preflight (mandatory before any map task)

Before touching a map in any way (entity placement, spawn, movement scripts, applying models, tile edits, etc.), always confirm the following two items **in order**:

1. **Identify which map you are working on and where it lives** (e.g. the `./map/{mapname}.map` path and its root entity).
2. **Open that `.map` file and read `MapComponent.TileMapMode` as a number**, and keep the value in mind:
   - `0` → **MapleTile** (side-view + Foothold; Body = `RigidbodyComponent`)
   - `1` → **RectTile** (top-down grid; Body = `KinematicbodyComponent`)
   - `2` → **SideViewRectTile** (side-view tile grid; Body = `SideviewbodyComponent`)

**Do not proceed with model / entity / script work while the `TileMapMode` value is unknown or unclear.** The three modes differ completely in Body component, events, gravity, and collision. A mismatch is not a compile-time error — it surfaces as a runtime `[LEA-3004] MissingComponent` log **or** as a silent failure where the entity simply refuses to move with no error at all.

### Recommending the mode (when starting a new map or when the current mode is wrong for the user's goal)

For **new map authoring** — or whenever the current map's `TileMapMode` clearly does not fit the gameplay the user described — **explicitly recommend the appropriate `TileMapMode` in Korean before doing any further entity / model / script work** (do not silently proceed with whatever is already on disk).

Use this decision matrix:

| User's intended game / gameplay | Recommend | Why |
|---|---|---|
| 메이플스토리식 횡스크롤 액션 · 점프 · 사다리 · 자유 위치 발판(플랫포머) | **`0` MapleTile** | Side-view + gravity + freely placed Foothold line segments |
| 탑다운(위에서 본) RPG · 미로 · 보드게임 · 던전 크롤러 · 봄버맨류 · 농장 시뮬레이션 | **`1` RectTile** | Top-down 4-directional free move, no gravity, square-tile grid |
| 타일 기반 횡스크롤 플랫포머 · 마리오식 픽셀 액션 · 사이드뷰 퍼즐 | **`2` SideViewRectTile** | Side-view + gravity **on a tile grid** (not free footholds) |

If the user has not yet told you what kind of game they want, **ask one short Korean question first** (e.g. "탑다운 시점인가요, 횡스크롤(점프/사다리)인가요? 자유 발판 기반인지, 정사각 타일 그리드 기반인지 알려주세요.") and only then recommend.

### Changing `TileMapMode` — user action in Maker, not an AI file edit

The AI must **never** write a new value into `MapComponent.TileMapMode` directly in the `.map` JSON. Mode switching swaps tile components, rebuilds footholds, and converts tile-data formats — Maker handles all of that internally.

Guide the user to switch the mode in the Maker editor as follows:

1. Open the Maker editor's **Hierarchy** window.
2. **Right-click the target map entity** in the Hierarchy.
3. Choose the **"Switch ..." option that matches the target mode** (Switch TileMap / RectTileMap / SideViewRectTileMap) from the context menu.
4. After the user reports the switch is complete, call MCP **`refresh`**, then re-read `MapComponent.TileMapMode` to confirm and re-check every dynamic entity's Body component against the new mode.

> AI role on mode changes: **recommend mode → wait for the user to right-click-switch in the Maker Hierarchy → refresh → fix Body components / scripts that no longer match**. Do not flip `TileMapMode` from a file edit.

> Mapping table / check protocol / transition limits / `LEA-3004` handling: [platform.md §4](platform.md), [platform.md §11](platform.md). Tile map editing itself: [tile.md](tile.md).

---

## Two-Step Map Editing Workflow (create → place)

1. **Create** — define the `.model` under `RootDesk/MyDesk/Models/{Category}/{Name}.model` (typed subfolder; details in [model.md §1, §2.2](model.md)).
2. **Place**
   - Add an entity entry to `Entities` in `./map/{map}.map`.
   - **`modelId` form (default — required for ≥2 instances)**: set `jsonString.modelId` to the model id, `origin.entry_id` to the same id, `origin.root_entity_id` to the entity's own outer `id`, and **mirror every component from the model into both `componentNames` (full comma-joined list) and `@components` (one entry per component with at least `Enable: true`)**. Per-instance overrides (typically `Position` on `TransformComponent`) live on the relevant `@components` entry. Use the verbatim shape in [entity/map-schema.md "Model-referenced entity"](entity/map-schema.md) — it matches what Maker emits after a save.
   - **Inline form**: `modelId: null` + full `@components` listing — **only acceptable when the composition appears exactly once in the map**.
   - Follow the rules for `id` (UUID), `path`, `componentNames`, `displayOrder` ([entity/map-schema.md](entity/map-schema.md)).
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

- `modelId` is a lowercase id matching the model's `Id` field.
- `origin.type` = `"Model"`; `origin.entry_id` = same lowercase id.
- `origin.root_entity_id` = **the entity's own outer `id`** (self-reference for a top-level instance; sub-entities of a composite model carry the parent root's id instead).
- `origin.sub_entity_id` / `replaced_model_id` = `null` unless this is a sub-entity or a model substitution.
- `revision` is `1` for a freshly placed instance and bumps as Maker saves further edits.
- **`componentNames` is the full comma-joined list** of every component in the model's `Components` array — **never empty**, never partial.
- **`@components` mirrors every component in the model**, in the same order. Each entry has at minimum `Enable: true`. Components with an `IsLegacy` field (`AIChaseComponent`, `AIWanderComponent`, `HitComponent`) repeat `IsLegacy: false`. Component-specific defaults (default `MoveVelocity`/`RealMoveVelocity` on Rigidbody, `IsDead: false` on `script.Monster`, zero `SpriteSize`/`PositionOffset` on `script.MonsterAttack`) are mirrored too. Per-instance overrides (typically `Position` on `TransformComponent`) replace the model default on the relevant entry.
- A `modelId` instance is **not** a thin pointer that pulls components at load time. The map's `@components` array *is* the runtime component list — Maker treats a missing entry as "this component is removed from this instance." Empty `componentNames` + single-component `@components` = an entity that has only `TransformComponent` at runtime, regardless of what the model defines (the monster will look invisible / immobile / non-combat even though the model is correct).
- See [entity/map-schema.md "Model-referenced entity"](entity/map-schema.md) for the verbatim shape and a per-field table.

### Adding a new map to the world

- You may need to add `map://{mapId}` to `entries` in `Global/SectorConfig.config` ([entity/map-schema.md](entity/map-schema.md)).

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
| Create entity | Author `.model` under `RootDesk/MyDesk/Models/{Category}/` + add an instance to `Entities` in `.map` (use `modelId` form by default; inline only for true one-offs) |
| Delete entity | Remove the relevant `Entities` entry in `.map` (clean up orphan references) |
| Change property | Edit `@components` in `.map` or `Values` in `.model` |
| Add/remove component | Sync the `.model` `Components` array with the map instance's `componentNames` / `@components` |
| Register/edit/delete model | CRUD `.model` files under `RootDesk/MyDesk/` (`refresh`) |
| List entities | Grep `.map` files / parse JSON |

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
2. **Edit large `.map` files in part** — do not overwrite the whole file.
3. **Do not modify `Environment/*.d.mlua`** — API definitions are read-only.
4. **Do not create or edit `.codeblock` manually** — Maker `refresh` generates it from `.mlua`.
5. **Take `screenshot` only when the user explicitly asks** ([mcp-tools.md](mcp-tools.md)).

### Physics / Movement / Map

6. **TileMapMode ↔ Body components** must match.
7. On **MapleTile**, placement Y is **foothold-based**; assumes gravity / Rigidbody.
8. On **RectTile**, do not expect vertical foothold physics — assumes Kinematicbody.
9. When adding a new foothold, keep **Id chain / Length / OwnerId** consistent ([entity/map-schema.md](entity/map-schema.md)).

### Render / Resource

10. **If a visual is needed, do not leave `SpriteRUID` empty.**
11. **RUIDs must be project-registered resources** — arbitrary strings are missing at runtime.
12. **Match the form of TileSetRUID / sprite DataRef** to existing maps.

### Entity / Spawn / Hierarchy

13. **Keep `id` / `path` / `componentNames` / `jsonString.path` consistent in `.map`.**
14. **`SpawnService` parent must not be nil** — pass a map entity such as `self.Entity.CurrentMap`.
15. **When referencing `modelId`**, `origin.entry_id` = `modelId`, and `origin.root_entity_id` = the entity's own outer `id` (top-level instance).
16. **Mirror the model's components in `modelId` instances** — `componentNames` must be the full comma-joined list, and `@components` must contain one entry per component (with at least `Enable: true`). Empty `componentNames` or a partial `@components` array silently removes those components at runtime.
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
| [entity/map-schema.md](entity/map-schema.md) | `.map` JSON schema details |
| [model.md](model.md) | `.model` template authoring |
| [tile.md](tile.md) | Tile maps / tilesets |
| [ui.md](ui.md) | UI authoring |
| [platform.md](platform.md) | TileMapMode, spawn, RUID, coordinates, directories |
| `msw-defaultplayer` | Player model / Values / components |
| `msw-scripting` | Component/Logic, properties, lifecycle |
| `msw-search` | RUID / asset / doc search |

The core principle of entity work is **"models are templates, maps are instances, MCP is for verification."**
