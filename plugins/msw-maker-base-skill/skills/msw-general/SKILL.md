---
name: msw-general
description: "Foundation skill for MSW (MapleStory Worlds). Read this FIRST before anything else in MSW."
---

# MSW General — Foundation Skill

The foundation skill for MSW (MapleStory Worlds) creation, integrating **shared tools, domain knowledge, platform rules, and file authoring**. Every other MSW skill depends on it.

---

## Core Principle: Visual Polish

MSW is a **game creation platform**. The goal is not a prototype where logic merely runs — it is a **polished game** players can enjoy.

So whatever entity you create — monster, NPC, tower, item, background object — search for and apply **appropriate resources (sprites, animations, sounds)** that match its role and personality. Do not leave the default sprite in place or leave `SpriteRUID` empty.

**Resource application principle when creating an entity:**

1. After creating the entity, use the **`msw-search` skill** to find sprites/animations that fit it
2. Apply the RUID of the found resource to `SpriteRendererComponent` so the entity is **visually represented**
3. If there is combat, also set hit/explosion effects; if there is interaction, set sound effects

> **Functionality implemented != finished.** A polished game requires appropriate resources plus visual presentation.

---

## When making a `.model` — catalog first

Do not start a new `.model` from an empty file. **The skill-local `models/` folder contains validated templates organized by category** — monsters (`ChaseMonster`/`MoveMonster`/`StaticMonster`), NPC (`StaticNPC`), players (`Player`/`DefaultPlayer`), terrain (`Foothold`/`Ladder`/`Rope`/`Portal`), map objects (`MapObject`/`SkeletonMapObject`/`ItemAsset`), particles (`BasicParticle`/`SpriteParticle`/`AreaParticle`/`AnimationPlayer`), sound (`Sound`/`SoundEffect`), tile map containers (`TileMap`/`RectTileMap`), UI (`UIButton`/`UIText`/`UISprite`/`UIGroup`, etc.), external media (`WebSprite`/`YoutubePlayerWorld`).

**Workflow**: **`Read` [references/model.md](references/model.md) IN FULL FIRST (mandatory — see "Model Work Preflight — MUST" below)** → pick the closest template from the catalog → load it with `skills/msw-general/scripts/model/msw_model_builder.cjs` (`ModelBuilder.fromTemplate`) → replace the 3 identifiers (`EntryKey`, `Id`, `Name`) through the builder → customize `Components`/`Values`/`Properties`/`Children` through the builder → **save under a typed subfolder of `RootDesk/MyDesk/Models/`** (e.g. `Models/Monsters/{Name}.model`, never directly under `MyDesk/`) → `refresh`. Detailed catalog and builder procedure: [references/model.md §2](references/model.md).

> The builder emits the required value metadata, so agents do not need to read or hand-write `.model` format internals.

> **For a monster, start with [`models/MonsterCanonical.model`](models/MonsterCanonical.model) and [references/monster.md](references/monster.md).** The other monster templates (`ChaseMonster` / `MoveMonster` / `StaticMonster`) leave `ActionSheet` empty and use defaults that silently fail (uppercase keys, `SortingLayer="Default"`, `IsLegacy=true`).

---

## Placing multiple entities — model first

If the same entity is going to appear **twice or more in a map** (5 monsters, 10 trees, 3 portals, …), **author a `.model` first and place each instance via `modelId`** rather than copy-pasting inline `@components`.

| Instance count of same composition | Choice |
|---|---|
| **1** (truly one-off decoration in a single map) | inline `@components` is acceptable |
| **≥2** | **`.model` + `modelId` instances (default)** |
| Spawned at runtime (`SpawnByModelId`) | `.model` is required regardless of count |

**Why this is the default:**

- **Edit once, propagate everywhere** — change `SpriteRUID`/HP/`ActionSheet` in the model and every instance updates. Inline copies require touching N entities each time.
- **Smaller, reviewable `.map` diffs** — `modelId` instances carry only `Transform` overrides; inline copies bloat the map by hundreds of lines per entity.
- **Avoids drift** — five inline copies silently diverge (one gets `IsLegacy: true`, another forgets `SortingLayer: "MapLayer0"`). The model anchors the canonical values.
- **Required for `SpawnByModelId`** — without a registered model id, dynamic spawning fails.

**Workflow**:
1. Author `.model` under `RootDesk/MyDesk/Models/{Category}/{Name}.model` (see folder rule above).
2. Place each instance with `skills/msw-general/scripts/map/msw_map_builder.cjs` (`const map = MapBuilder.read(...); map.placeModel(...); map.write(...)`) so ids, paths, `componentNames`, origin metadata, and per-instance component overrides stay synchronized.
3. `refresh`.

Details and the inline-vs-modelId comparison: [references/entity.md "Two-Step Map Editing Workflow"](references/entity.md), [references/model.md §1](references/model.md).

---

## Entity Work Preflight — **MUST**

If the task involves an entity in any way, **you must read [references/entity.md](references/entity.md) first.** No exceptions.

---

## Model Work Preflight — **MUST**

If the task involves authoring or editing a `.model` file in **any** way — including any invocation of `skills/msw-general/scripts/model/msw_model_builder.cjs` (`ModelBuilder.read` / `snapshot` / `fromTemplate` / `write` and any other builder API), creating a new model from a template, mutating components/values/properties/children/event links on an existing model, or even a one-line tweak — **you must `Read` [references/model.md](references/model.md) IN FULL FIRST** (no `offset`/`limit`, no `cat`/`Get-Content`). No exceptions.

The builder's template catalog, the 3-identifier replacement rule (`EntryKey` / `Id` / `Name`), required value metadata, property/child/event-link API surface, and the typed save-folder layout under `RootDesk/MyDesk/Models/` live only in [`references/model.md`](references/model.md). Calling the builder without reading [`references/model.md`](references/model.md) first silently produces broken models (missing value metadata, mismatched identifiers, wrong save folder, default-value silent failures). Reading scattered template files or guessing the API from memory is **not a substitute** — re-confirm at the start of every new turn that touches a `.model`, even if a previous turn already loaded it.

---

## Map Work Preflight (do this BEFORE any map work)

Before starting **any** map-related task — entity placement, spawn, movement scripts, model authoring, tile edits, etc. — you **must** complete these two steps in order:

1. **Identify the target map** — its path (`./map/{mapname}.map`), its root entity, and its location in the Hierarchy.
2. **Use `MapBuilder.read(...).getTileMapMode()` to read `MapComponent.TileMapMode` as a number.** Keep the value in mind for the rest of the session.

| Value | Mode | Required Body | Runtime log on mismatch / missing Body |
|:--:|---|---|---|
| `0` | **TileMap** (MapleTile, side-view + Foothold) | `RigidbodyComponent` | `[LEA-3004] MissingComponent : Entity is missing 'RigidbodyComponent'.` |
| `1` | **RectTileMap** (RectTile, top-down) | `KinematicbodyComponent` | `[LEA-3004] MissingComponent : Entity is missing 'KinematicbodyComponent'.` |
| `2` | **SideViewRectTileMap** (SideViewRectTile, side-view tile) | `SideviewbodyComponent` | `[LEA-3004] MissingComponent : Entity is missing 'SideviewbodyComponent'.` |

**Never start map work without knowing the current `TileMapMode`.** The three modes differ completely in Body component, gravity, collision, and event stacks. A mismatch is almost never a compile-time error — it shows up either as a silent failure (entity doesn't move / passes through walls / invisible) or as one of the three `[LEA-3004] MissingComponent` runtime logs above. Whenever you see one of those three messages, suspect a **TileMapMode ↔ entity Body mismatch** first.

### Recommending the right mode — **MUST** when starting a new map or when the current mode is clearly wrong for the user's goal

Whenever the user describes what game / map they want to build (new map authoring, "make a side-scroller", "I want a top-down dungeon", or you read the current `.map` and find its `TileMapMode` does **not** fit the user's intended gameplay), you **must explicitly recommend the appropriate `TileMapMode` to the user and explain why** before proceeding with any further entity / model / script work.

Use this decision matrix as the source of truth:

| User's intended game / gameplay | Recommend | Why |
|---|---|---|
| MapleStory-style side-scrolling action · jump · ladder · freely placed footholds (platformer) | **`0` MapleTile** | Side-view + gravity, `FootholdComponent` line-segment platforms — non-grid, freely placed platforms |
| Top-down RPG · maze · board game · dungeon crawler · Bomberman-style · RTS-style · farming sim | **`1` RectTile** | Top-down 4-directional free move, no gravity, square-tile grid |
| Tile-based side-scrolling platformer · Mario-style pixel action · side-view puzzle (square-tile side-view) | **`2` SideViewRectTile** | Side-view + gravity **on a tile grid** (not freely placed footholds) |

**Procedure:**

1. If the user has not yet told you what kind of game they want, **ask** before recommending a mode (one short question is enough — e.g. "Is it top-down, or side-scrolling (jump/ladder)? And is the terrain based on freely placed footholds, or a square tile grid?").
2. Once the intent is clear, **state the recommendation** (mode number + name + one-sentence rationale) and the matching Body / map component the user will need ([`platform.md` §4 mapping table](references/platform.md)).
3. **Lock the choice in early** — switching `TileMapMode` later wipes terrain, forces every Body / movement script to be re-checked, and may force re-painting all tiles ([`platform.md` §4 "Cautions When Switching Map Type"](references/platform.md)).

### Changing `TileMapMode` — **user action in Maker, not an AI file edit**

**The AI must never flip `MapComponent.TileMapMode` by editing the `.map` JSON directly.** Mode switching requires swapping tile components, rebuilding footholds, converting tile-data formats, and resetting terrain — all internal Maker operations.

**Guide the user to do this in the Maker editor:**

1. Open the Maker editor's **Hierarchy** window.
2. **Right-click the target map entity** in the Hierarchy.
3. From the context menu, **choose the "Switch ..." option that matches the target mode** (Switch TileMap / RectTileMap / SideViewRectTileMap). Maker performs the conversion, swaps the tile component, and resets terrain as needed.
4. After the user confirms the switch is complete, call MCP **`refresh`**, then re-read `MapComponent.TileMapMode` to verify and re-check every dynamic entity's Body component against the new mode.

> The AI's role in mode changes: **recommend → wait for user to right-click-switch in Maker Hierarchy → refresh → fix Body components / scripts that no longer match.** Never write a new value to `TileMapMode` from a file edit.

The table above is a summary. **The mode-switch procedure, the post-Body-swap checklist, and the silent-failure symptom dictionary beyond LEA-3004** live only in [`references/platform.md` §4](references/platform.md) (mapping + check protocol + switching policy) and [`references/troubleshooting.md`](references/troubleshooting.md) (full symptom dictionary) — **you must Read them** when changing modes / swapping Body / debugging silent failures. Per-map-type detail patterns: [`platform-maple.md`](references/platform-maple.md) / [`platform-rect.md`](references/platform-rect.md) / [`platform-sideview.md`](references/platform-sideview.md). Tile painting: [`references/tile.md`](references/tile.md). Map Work Preflight: [`references/entity.md`](references/entity.md).

---

## Platform Rules Preflight — **MUST** when any of these triggers fire

If **any** of the following triggers matches your task, `Read` the corresponding reference **before** editing code or proposing a plan. These triggers are intentionally broad — when in doubt, read. The "8 Core Rules" in this SKILL.md are a summary only; the **symptom→cause→fix tables, per-map-type code patterns, the `MovementComponent` conversion formulas, and SortingLayer/SpriteRUID details live only in references**.

| Trigger (keyword / situation) | File to read |
|---|---|
| jump, gravity, movement, `MoveVelocity`, `InputSpeed`, `JumpForce`, `WalkSpeed`, `SpeedFactor`, foothold, patrol | **The matching map type's** [`references/platform-maple.md`](references/platform-maple.md) / [`platform-rect.md`](references/platform-rect.md) / [`platform-sideview.md`](references/platform-sideview.md) (in full) **+** [`references/platform.md`](references/platform.md) §10 |
| spawn / `_SpawnService` / `SpawnByModelId` / `SpawnByEntity` / "summon a monster" / "runtime creation" | [`references/platform.md`](references/platform.md) §8 + §8.5 |
| Screen coordinates / camera range / "is it on screen" / "pixel units" / OrthographicSize / world unit | [`references/platform.md`](references/platform.md) §5 |
| Occluded / invisible / "should render on top" / SortingLayer / OrderInLayer / Z value | [`references/platform.md`](references/platform.md) §6 + §7 |
| `LEA-3004` in the log / "won't move" / "floating in mid-air" / "stuck in wall" / "bouncing off" / "disappears off the map" / "falls off the foothold edge" | **[`references/troubleshooting.md`](references/troubleshooting.md) (in full) first**, then the matching map type's `platform-{type}.md` §7 |
| shader / material / outline / glow / blur / pixelate / rainbow / tint / grayscale / vignette / screen filter / lens distortion / wave / ripple / distortion / dissolve / additive / blend mode / hologram / mask / post-process / `MaterialID` / `MaterialId` / `ChangeMaterial` / `_MaterialService` / `.material` file | **[`references/material.md`](references/material.md) (in full)** — then drive shader catalog / property names / per-component compatibility via `mlua_Document_Retriever` + `mlua_API_Retriever` MCP lookups (do NOT memorize) |
| New map setup / new project / `.config` / CoreVersion verification / sector registration / folder metadata Refresh | [`references/platform.md`](references/platform.md) §2 + §15 + §16 |
| MapleTile (`TileMapMode = 0`) work — Foothold, `Gravity`, `WalkSpeed`, `PredictFootholdEnd` | [`references/platform-maple.md`](references/platform-maple.md) (in full) |
| RectTile (`TileMapMode = 1`) work — `SpeedFactor`, 4-directional movement, Movable tiles, dynamic tiles | [`references/platform-rect.md`](references/platform-rect.md) (in full) |
| SideViewRectTile (`TileMapMode = 2`) work — `JumpSpeed`/`JumpDrag`, wall detection (`Normal`), `EnableDownJump` | [`references/platform-sideview.md`](references/platform-sideview.md) (in full) |

> If two or more triggers match, read **all** of them. "I already saw the 8 Core Rules in SKILL.md" is not an excuse for skipping references.

---

## 8 Core Rules (must memorize)

1. If you don't align **TileMapMode ↔ Body mapping**, the entity will not move (no error) or raises `[LEA-3004] MissingComponent` at runtime → [`references/platform.md` §4](references/platform.md) (or if approaching by symptom, [`references/troubleshooting.md`](references/troubleshooting.md))
2. User scripts only work as a `.mlua` + `.codeblock` **pair** — `.codeblock` is generated by Maker Refresh
3. If `SpriteRUID` is an empty string, the entity is **invisible on screen** (no error)
4. When calling `SpawnByModelId`, not passing a map entity (`self.Entity.CurrentMap`) as `parent` causes a runtime error
5. Coordinates are in **world units** (1 unit = 100 px). Pixel values are off by 100x
6. Maker only scans `RootDesk/` — user files placed in `Global/` will not be recognized
7. **Do not modify** `.d.mlua` or `.codeblock`.
8. CoreVersion is `26.5.0.0` — do not work if there is a mismatch

---

## MCP Tool Quick Reference (msw-maker-mcp)

| Tool | Purpose |
|------|---------|
| **play** / **stop** | Enter / exit play mode |
| **refresh** | Sync Maker after file change (not allowed during play) |
| **logs** / **clear_logs** | Read / clear runtime and build logs |
| **screenshot** | Call only when explicitly requested by the user |
| **keyboard_input** / **mouse_input** | Simulate input in play mode |

> On MCP call failure / "MCP connection" / "API Key" requests → guide the user to the official setup docs: https://maplestoryworlds-creators.nexon.com/ko/docs?postId=1368

---

## Per-task routing — which reference to read

| File | Scope | When to read |
|------|-------|--------------|
| [workspace.md](references/workspace.md) | World instance / Room / DataStorage, folder layout, file paths, Play mode, `refresh`, mid-workflow failure recovery | Workspace / instance / mode-transition work |
| [platform.md](references/platform.md) (core) | 8 core rules, file authority + folder metadata, `.mlua`+`.codeblock` pair, TileMapMode↔Body mapping + LEA-3004, coordinate system / on-screen range, SortingLayer/OrderInLayer, SpriteRUID, `SpawnByModelId` usage / initialization order, `MovementComponent` per-map-type InputSpeed conversion formula, ECS, ID generation, `.config`, CoreVersion | TileMapMode mapping / mode switching / spawn / coordinates / RUID / SortingLayer / `.config` & CoreVersion / folder metadata — **rules common to all map types** |
| [platform-maple.md](references/platform-maple.md) | MapleTile (`TileMapMode = 0`) only — Foothold physics, `Gravity`/`WalkSpeed`/`WalkJump`, `PredictFootholdEnd`, `IsOnGround`, `DownJump`, FootholdEnter/LeaveEvent, MapleTile-only troubleshooting + checklist | Side-scrolling action / jump / ladder / freely placed footholds (MapleStory-style platformer) |
| [platform-rect.md](references/platform-rect.md) | RectTile (`TileMapMode = 1`) only — `KinematicbodyComponent`, `SpeedFactor`, free 4-directional movement, visual-only jump, Movable tile collision, `ToCellPosition`/`ToWorldPosition`, RectTileEnter/LeaveEvent, dynamic tiles (`SetTile`/`BoxFill`), RectTile-only troubleshooting + checklist | Top-down RPG / maze / board game / dungeon crawler / Bomberman-style / RTS / farming sim |
| [platform-sideview.md](references/platform-sideview.md) | SideViewRectTile (`TileMapMode = 2`) only — `SideviewbodyComponent`, `JumpSpeed`/`JumpDrag`, `EnableDownJump`, wall detection (`RectTileCollisionBeginEvent` + `Normal`), `GetUnderfootTile`, SideView-only troubleshooting + checklist | Tile-based side-scrolling platformer / Mario-style pixel action / side-view puzzle |
| [troubleshooting.md](references/troubleshooting.md) | Unified symptom dictionary — `LEA-3004` table / "won't move" / "won't render" / "floating in mid-air" / "stuck in wall" / "disappears off the map" / "falls off the foothold edge" / "100× off" / "doesn't show in Maker" / "client-only sync" and other silent-failure symptom→cause→fix unified index | **Symptom-first debugging** — go here first when the user reports the above or `[LEA-3004]` appears in the log |
| [authoring.md](references/authoring.md) | Shared authoring principles across 5 file types (schema consistency, hand-edit hazards) | Entry point before any file authoring |
| [tile.md](references/tile.md) | Tile painting — Maker UI domain, AI guides only | Tilemap work |
| [entity.md](references/entity.md) | `.map` builder-first placement, modelId vs inline, snapshot workflow, MapBuilder protocol, RUID, coordinate rules | `.map` editing / entity placement |
| [model.md](references/model.md) | `.model` builder-only authoring, template catalog, component/value/property/child/event link APIs | Writing / editing `.model` |
| [monster.md](references/monster.md) | Monster canonical 11 components, lowercase ActionSheet keys, mandatory `IsLegacy` / `SortingLayer` overrides | Authoring a monster model |
| [material.md](references/material.md) | `.material` file anatomy, shader category index (10+ categories), applying `MaterialID` on renderer components via `.model` / `.map` / runtime `ChangeMaterial`, `_MaterialService:ChangeMaterialProperty` (ClientOnly), and **the MCP-driven lookup loop (`mlua_Document_Retriever` / `mlua_API_Retriever`) that replaces memorizing the per-shader catalog** | Any shader / material / visual effect work — outline, glow, blur, vignette, rainbow, hologram, blend mode, post-process, hit-flash, screen filter, etc. |
| `msw-ui-system` skill (invoke via the `Skill` tool) | **Single UI entry point.** Design judgment (coordinates/anchors/pivot, UIGroup/CanvasGroup, component selection) + component property/method/event API + enum values + layout recipes + mlua runtime patterns (popup/toast/HP/grid/drag) + Runtime UI Caveats + UUID binding + **`.ui` CJS UIBuilder invocation protocol** (panel/text/sprite/button/slider/scroll/script/group/mask/grid/avatar/touch/skeleton/particle, anchor presets, component add/replace/patch/remove, write-time auto lint) | Any UI-related task / creating or editing `.ui` files — **read FIRST** |
| `msw-ui-system/references/templates` files | UI structure pattern templates by complexity (simple popup, minimal HUD, multi-tab, shop/purchase flow) with `.ui` + `.mlua` examples and button handler patterns | Adding new UI groups/popups/HUD, structuring button handlers, or choosing a UI layout pattern (read directly after `msw-ui-system`) |
| [dataset.md](references/dataset.md) | UserDataSet / LocaleDataSet runtime, `.userdataset` + `.csv` pair, **`_LocalizationService` is ClientOnly**, `serveronly` | Datasets / i18n / translation |

---

## Absolute Principles (apply to every task)

0. **If the task involves an entity, read [references/entity.md](references/entity.md) first.** No exceptions.
0-bis. **If the user's request mentions any UI element** (popup, HUD, button, toast, panel, dialog window, menu, tab, layout, screen, bar/gauge, slot) **OR involves writing/editing `.ui` files**, **BEFORE proposing any plan, options, or questions to the user**:
   1. **Invoke `msw-ui-system` via the `Skill` tool first** — the single UI entry point (design judgment, component API, enums, layout recipes, runtime patterns, UUID binding, builder invocation protocol unified in one skill).
   2. **All `.ui` mutations must go through `msw-ui-system`'s builder (`scripts/msw_ui_builder.cjs`)** — no direct raw JSON editing or grep. Read existing `.ui` files via the read-side builder (`UIBuilder.read/find/list_entities`) too.
   3. (Optional) If you need UI pattern templates (simple popup, minimal HUD, multi-tab, shop flow), `Read`/`Glob` the files under `msw-ui-system/references/templates/` directly ([`templates.md`](../msw-ui-system/references/templates/templates.md) + `style-N-*/` + [`ruid-map.md`](../msw-ui-system/references/templates/style-1-black/ruid-map.md) + `Popupbutton.mlua`).
   No exceptions.
0-ter. **If the task will create, modify, rename, or delete ANY `.mlua` file** — including new scripts, edits to existing scripts, adding/removing a `Component`/`@Logic`/`@Event`/`@State`/`@BTNode`, wiring lifecycle methods (`OnBeginPlay`/`OnUpdate`/...), or even small one-line fixes — you **MUST `Read` BOTH [`msw-scripting/SKILL.md`](../msw-scripting/SKILL.md) AND [`msw-scripting/references/verify-checklist.md`](../msw-scripting/references/verify-checklist.md) IN FULL FIRST** (no `offset`/`limit`, no `cat`/`Get-Content`). Reading `msw-general` plus scattered `.d.mlua` files is **not a substitute**. This applies even when a previous turn already loaded `msw-scripting` — re-confirm at the start of the new turn. **Trigger phrases are intentionally broad**: if there is any chance the turn will touch a `.mlua`, treat it as triggered. No exceptions, no "I already know this", no shortcut via memory.
0-quater. **If the task involves spawning, movement, jump/gravity, coordinate placement, layer/order debugging, MapleTile/RectTile/SideViewRectTile-specific logic, OR you observe any silent-failure symptom (`[LEA-3004]` log, "won't move", "won't render", "floating in mid-air", "stuck in wall", "disappears off the map", "falls off the foothold edge", "100× off", "doesn't show in Maker", "client-only sync"), you MUST `Read` the matching `references/platform*.md` / [`references/troubleshooting.md`](references/troubleshooting.md) IN FULL FIRST** (no `offset`/`limit`). The 8 Core Rules in this SKILL.md are summary only — **the symptom→cause→fix tables, per-map-type code patterns (Foothold patrol / RectTile 4-directional movement / SideView wall detection), the `MovementComponent` InputSpeed conversion formula, SpriteRUID, SortingLayer/OrderInLayer detail, `SpawnByModelId` initialization order, folder metadata Refresh policy, and CoreVersion policy live only in references**. **Trigger phrases are intentionally broad**: if there is any chance the turn touches one of these areas, treat as triggered. For the matching `Read` targets, follow the trigger table in the "Platform Rules Preflight — MUST" section above. No exceptions, no "I already know this from the 8 Core Rules", no shortcut via memory.
1. **Visual polish** — never leave `SpriteRUID` empty. Use `msw-search` to find resources.
2. **`refresh` after content file changes that Maker must ingest** (if in play mode, `stop` first). Folder-only changes do not need immediate refresh.
3. **Never modify `Environment/*.d.mlua`** — API definitions are read-only.
4. **Never create `.codeblock` by hand** — Maker `refresh` generates it from `.mlua`. Folder metadata is also generated from real folders during refresh.
5. **Do not create new user files in `Global/`** — Maker will not recognize them. User files belong under `RootDesk/MyDesk/`.
6. **Structured files prefer builders** — `.model`/`.ui` are builder-only. `.map` work uses `MapBuilder` first; direct `.map` JSON edits are allowed only for explicitly unsupported gaps, with a minimal scoped change and refresh/log verification.
7. **Entity reference binding (Entity/EntityRef property)** — the AI injects the UUID string directly. Do not ask the user to drag in Maker.
8. **Stop work on CoreVersion mismatch** — first verify `CoreVersion` in `Environment/config` is `26.5.0.0`.
9. **Call `screenshot` only when the user explicitly requests it.** Never call it automatically after task completion.
10. **If a workflow step fails mid-flow, stop later steps** — fix the root cause first.
11. **Two-or-more = make a model.** Whenever the same entity composition is placed ≥2 times in a map, author a `.model` first and instance it via `modelId`. Inline `@components` duplication is reserved for genuine one-off entities.
12. **Models live in typed subfolders.** Save new `.model` files under a category subfolder of `RootDesk/MyDesk/Models/` (e.g. `Models/Monsters/`, `Models/NPCs/`, `Models/Terrain/`, `Models/MapObjects/`, `Models/Particles/`, `Models/UI/`) — **never directly under `MyDesk/` or `Models/`**. When a needed subfolder does not exist, create the folder only; Maker Refresh will generate folder metadata later (see [references/platform.md §2](references/platform.md)).
13. **Translation is client-side only.** `_LocalizationService` and `Translator` methods (`GetText` / `GetTextFormat`) are all `ClientOnly`. For server-originated localized messages, send the key over RPC and let the client resolve it.
14. **Cross-platform tool selection — no shell for workspace exploration, use tools.** Use **the `Glob` / `Read` / `Grep` tools** for all workspace file/folder exploration, reading, and search. `Bash` commands like `ls` / `dir` / `Get-ChildItem` / `gci` / `cat` / `type` / `Get-Content` / `gc` / `head` / `tail` / `find` / `where` / `grep` / `findstr` / `Select-String` are **forbidden for workspace exploration** — they are not compatible across Windows (PowerShell/Git Bash) and macOS (bash/zsh), due to shell/path-handling differences (notably, in bash a path like `D:\path\foo` has its backslashes consumed as escapes and collapses to `D:pathfoo`). Use `Bash` only for **actual shell programs (`git` / `npm` / MCP / build scripts)**, and even then: (a) prefer **workspace-relative paths**, (b) if an absolute path is unavoidable, use **forward slashes + double quotes** (`"D:/msw-world-projects/.../map/"`, never pass `D:\...` form), (c) use **POSIX commands** only (`ls` / `mv` / `cp` / `rm`). If you see an error like `ls: cannot access 'D:msw-...': No such file or directory`, stop immediately and retry via `Glob` / `Read`.
15. **`.model` files are builder-only — and the builder requires [`references/model.md`](references/model.md) first.** Do not open or edit `.model` JSON directly for inspection or mutation. **Before using `skills/msw-general/scripts/model/msw_model_builder.cjs` (`ModelBuilder.read` / `snapshot` / `fromTemplate` / `write`), you MUST `Read` [references/model.md](references/model.md) IN FULL FIRST** (no `offset`/`limit`) — see the "Model Work Preflight — **MUST**" section above. Only then invoke the builder so identifiers, value metadata, properties, children, and event links stay consistent.
16. **`.map` files are builder-first.** Use `skills/msw-general/scripts/map/msw_map_builder.cjs` (`MapBuilder.read/snapshot/placeModel/write`) for covered inspection and mutation so entity ids, paths, component names, origin metadata, and model instance mirrors stay consistent. If `MapBuilder` explicitly does not cover the required operation, make the smallest direct `.map` edit possible, then `refresh` and verify.

    Load the builder from a script run at the workspace root (where `./map/` lives) with:

    ```javascript
    const { MapBuilder } = require("./skills/msw-general/scripts/map/msw_map_builder.cjs");
    const map = MapBuilder.read("map/map01.map");
    ```

    From `references/entity.md` snippets inside the skill, the relative form `require("../scripts/map/msw_map_builder.cjs")` is the one matching the skill's own layout; **always anchor the path relative to the script that calls `require`, not to the skill root**. Full API and per-operation patterns: [`references/entity.md`](references/entity.md#mapbuilder-protocol).
