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

**Workflow**: pick the closest template from the catalog → Read → replace the 3 identifiers (`EntryKey`, `Id`, `Name`) → customize `Components`/`Values` → **save under a typed subfolder of `RootDesk/MyDesk/Models/`** (e.g. `Models/Monsters/{Name}.model`, never directly under `MyDesk/`) → `refresh`. Detailed catalog and substitution procedure: [references/model.md §2](references/model.md).

> Every template includes a consistent `MODNativeType` assembly string — **this avoids the most common mistake of writing ValueType by hand and producing a silent failure.**

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
2. In `.map` `Entities[]`, each instance sets `modelId` + `origin.entry_id` to the same id, with **only `TransformComponent` (and any per-instance overrides)** in `@components`.
3. `refresh`.

Details and the inline-vs-modelId comparison: [references/entity.md "Two-Step Map Editing Workflow"](references/entity.md), [references/model.md §1](references/model.md).

---

## Entity Work Preflight — **MUST**

If the task involves an entity in any way, **you must read [references/entity.md](references/entity.md) first.** No exceptions.

---

## Map Work Preflight (do this BEFORE any map work)

Before starting **any** map-related task — entity placement, spawn, movement scripts, model authoring, tile edits, etc. — you **must** complete these two steps in order:

1. **Identify the target map** — its path (`./map/{mapname}.map`), its root entity, and its location in the Hierarchy.
2. **Open that `.map` file directly and read `MapComponent.TileMapMode` as a number.** Keep the value in mind for the rest of the session.

| Value | Mode | Required Body | Runtime log on mismatch / missing Body |
|:--:|---|---|---|
| `0` | **TileMap** (MapleTile, side-view + Foothold) | `RigidbodyComponent` | `[LEA-3004] MissingComponent : Entity에 'RigidbodyComponent'가 없습니다.` |
| `1` | **RectTileMap** (RectTile, top-down) | `KinematicbodyComponent` | `[LEA-3004] MissingComponent : Entity에 'KinematicbodyComponent'가 없습니다.` |
| `2` | **SideViewRectTileMap** (SideViewRectTile, side-view tile) | `SideviewbodyComponent` | `[LEA-3004] MissingComponent : Entity에 'SideviewbodyComponent'가 없습니다.` |

**Never start map work without knowing the current `TileMapMode`.** The three modes differ completely in Body component, gravity, collision, and event stacks. A mismatch is almost never a compile-time error — it shows up either as a silent failure (entity doesn't move / passes through walls / invisible) or as one of the three `[LEA-3004] MissingComponent` runtime logs above. Whenever you see one of those three messages, suspect a **TileMapMode ↔ entity Body mismatch** first.

### Recommending the right mode — **MUST** when starting a new map or when the current mode is clearly wrong for the user's goal

Whenever the user describes what game / map they want to build (new map authoring, "make a side-scroller", "I want a top-down dungeon", or you read the current `.map` and find its `TileMapMode` does **not** fit the user's intended gameplay), you **must explicitly recommend the appropriate `TileMapMode` to the user in Korean and explain why** before proceeding with any further entity / model / script work.

Use this decision matrix as the source of truth:

| User's intended game / gameplay | Recommend | Why |
|---|---|---|
| 메이플스토리식 횡스크롤 액션 · 점프 · 사다리 · 자유 위치 발판(플랫포머) | **`0` MapleTile** | Side-view + gravity, `FootholdComponent` line-segment platforms — non-grid, freely placed platforms |
| 탑다운(위에서 본) RPG · 미로 · 보드게임 · 던전 크롤러 · 봄버맨류 · RTS 풍 · 농장 시뮬레이션 | **`1` RectTile** | Top-down 4-directional free move, no gravity, square-tile grid |
| 타일 기반 횡스크롤 플랫포머 · 마리오식 픽셀 액션 · 사이드뷰 퍼즐(정사각 타일 사이드뷰) | **`2` SideViewRectTile** | Side-view + gravity **on a tile grid** (not freely placed footholds) |

**Procedure:**

1. If the user has not yet told you what kind of game they want, **ask in Korean** before recommending a mode (one short question is enough — e.g. "탑다운 시점인가요, 횡스크롤(점프/사다리)인가요? 그리고 지형이 자유 발판 기반인지, 정사각 타일 그리드 기반인지 알려주세요.").
2. Once the intent is clear, **state the recommendation in Korean** (mode number + name + one-sentence rationale) and the matching Body / map component the user will need ([§4 mapping table](references/platform.md)).
3. **Lock the choice in early** — switching `TileMapMode` later wipes terrain, forces every Body / movement script to be re-checked, and may force re-painting all tiles ([platform.md §4 "Cautions When Switching Map Type"](references/platform.md)).

### Changing `TileMapMode` — **user action in Maker, not an AI file edit**

**The AI must never flip `MapComponent.TileMapMode` by editing the `.map` JSON directly.** Mode switching requires swapping tile components, rebuilding footholds, converting tile-data formats, and resetting terrain — all internal Maker operations.

**Guide the user to do this in the Maker editor (Korean instructions are expected):**

1. Open the Maker editor's **Hierarchy** window.
2. **Right-click the target map entity** in the Hierarchy.
3. From the context menu, **choose the "Switch ..." option that matches the target mode** (Switch TileMap / RectTileMap / SideViewRectTileMap). Maker performs the conversion, swaps the tile component, and resets terrain as needed.
4. After the user confirms the switch is complete, call MCP **`refresh`**, then re-read `MapComponent.TileMapMode` to verify and re-check every dynamic entity's Body component against the new mode.

> The AI's role in mode changes: **recommend → wait for user to right-click-switch in Maker Hierarchy → refresh → fix Body components / scripts that no longer match.** Never write a new value to `TileMapMode` from a file edit.

Details: [references/platform.md §4](references/platform.md) (mapping + check protocol + switching policy), [references/platform.md §11](references/platform.md) (troubleshooting table), [references/entity.md "Map Work Preflight"](references/entity.md), [references/tile.md](references/tile.md).

---

## 8 Core Rules (must memorize)

1. If you don't align **TileMapMode ↔ Body mapping**, the entity will not move (no error) or raises `[LEA-3004] MissingComponent` at runtime → [references/platform.md §4](references/platform.md)
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

> Usage limits, parameters, async behavior detail → [references/mcp-tools.md](references/mcp-tools.md)
> On MCP call failure / "MCP connection" / "API Key" requests → `msw-env-setup` skill

---

## Per-task routing — which reference to read

| File | Scope | When to read |
|------|-------|--------------|
| [mcp-tools.md](references/mcp-tools.md) | msw-maker-mcp tool spec (parameters, constraints, async) | Calling any MCP tool |
| [workspace.md](references/workspace.md) | World instance / Room / DataStorage, folder layout, file paths, Play mode, `refresh`, mid-workflow failure recovery | Workspace / instance / mode-transition work |
| [platform.md](references/platform.md) | 8 core rules, TileMapMode↔Body, coordinate system, SortingLayer, SpriteRUID, spawn, per-map physics, MovementComponent, troubleshooting, ECS, .config/CoreVersion | Platform rules / physics / troubleshooting |
| [authoring.md](references/authoring.md) | Shared authoring principles across 5 file types (schema consistency, hand-edit hazards) | Entry point before any file authoring |
| [tile.md](references/tile.md) | Tile painting — Maker UI domain, AI guides only | Tilemap work |
| [entity.md](references/entity.md) (+ `entity/`) | `.map` entity placement, modelId vs inline, snapshot workflow, RUID, coordinate rules, schema | `.map` editing / entity placement |
| [model.md](references/model.md) (+ `model/`) | `.model` authoring, template catalog, Properties/Children, **`Values` serialization type rules (critical)**, CRUD, schema | Writing / editing `.model` |
| [monster.md](references/monster.md) | Monster canonical 11 components, lowercase ActionSheet keys, mandatory `IsLegacy` / `SortingLayer` overrides | Authoring a monster model |
| [ui.md](references/ui.md) (+ `ui/`) | `.ui` authoring, division of labor with Maker UI, schema, component API, enums, validated patterns | Writing `.ui` |
| `msw-ui-template` skill (file-based; `disable-model-invocation: true` — read its files directly with `Read`/`Glob`, do NOT invoke via `Skill` tool) | UI structure pattern templates by complexity (simple popup, minimal HUD, multi-tab, shop/purchase flow) with `.ui` + `.mlua` examples and button handler patterns | Adding new UI groups/popups/HUD, structuring button handlers, or choosing a UI layout pattern |
| [dataset.md](references/dataset.md) | UserDataSet / LocaleDataSet runtime, `.userdataset` + `.csv` pair, **`_LocalizationService` is ClientOnly**, `serveronly` | Datasets / i18n / translation |

---

## Absolute Principles (apply to every task)

0. **If the task involves an entity, read [references/entity.md](references/entity.md) first.** No exceptions.
0-bis. **If the user's request mentions any UI element** (popup, HUD, button, toast, panel, dialog window, menu, tab, layout, screen, bar/gauge, slot) **OR involves writing/editing `.ui` files**, read [references/ui.md](references/ui.md) AND the `msw-ui-template` skill's files directly (SKILL.md + `style-N-*/` templates + `ruid-map.md` + `Popupbutton.mlua`, located under `plugins/msw-maker-base-skill/skills/msw-ui-template/`) **BEFORE proposing any plan, options, or questions to the user**. Do **NOT** invoke that skill via the `Skill` tool — it has `disable-model-invocation: true` by design; access its files with `Read` / `Glob` instead. No exceptions.
1. **Visual polish** — never leave `SpriteRUID` empty. Use `msw-search` to find resources.
2. **`refresh` after every file change** (if in play mode, `stop` first).
3. **Never modify `Environment/*.d.mlua`** — API definitions are read-only.
4. **Never create or modify `.codeblock` by hand** — Maker `refresh` generates it from `.mlua`.
5. **Do not create new user files in `Global/`** — Maker will not recognize them. User files belong under `RootDesk/MyDesk/`.
6. **Edit large files partially** — never overwrite a `.map`/`.model`/`.ui` in full.
7. **Entity reference binding (Entity/EntityRef property)** — the AI injects the UUID string directly. Do not ask the user to drag in Maker.
8. **Stop work on CoreVersion mismatch** — first verify `CoreVersion` in `Global/WorldConfig.config` is `26.5.0.0`.
9. **Call `screenshot` only when the user explicitly requests it.** Never call it automatically after task completion.
10. **If a workflow step fails mid-flow, stop later steps** — fix the root cause first.
11. **Two-or-more = make a model.** Whenever the same entity composition is placed ≥2 times in a map, author a `.model` first and instance it via `modelId`. Inline `@components` duplication is reserved for genuine one-off entities.
12. **Models live in typed subfolders.** Save new `.model` files under a category subfolder of `RootDesk/MyDesk/Models/` (e.g. `Models/Monsters/`, `Models/NPCs/`, `Models/Terrain/`, `Models/MapObjects/`, `Models/Particles/`, `Models/UI/`) — **never directly under `MyDesk/` or `Models/`**. When a needed subfolder does not exist, create it together with a `.directory` file at the same level (see [references/platform.md §2](references/platform.md)).
13. **Translation is client-side only.** `_LocalizationService` and `Translator` methods (`GetText` / `GetTextFormat`) are all `ClientOnly`. For server-originated localized messages, send the key over RPC and let the client resolve it.
