# MSW File Authoring

Authoring guide for **.map / .model / .ui / .dataset** files and tile map assets in MSW world creation. Each file type has its own reference file — read only the topics you need.

> ⚠️ **Schema consistency warning (important)**
> `.map` / `.model` / `.ui` / `.tileset` / `.userdataset` / `.localedataset` are all large files with strict schemas. Writing or modifying their JSON by hand easily produces **silent failures** like:
> - Missing `ValueType` metadata, duplicate UUIDs, broken Components / Values consistency
> - Mismatched tile map 2D array dimensions, `TileMapMode` ↔ Body mismatch, `tileIndex` offset
> - `.ui` anchor / pivot coordinate errors, missing RUID, parent-child `path` mismatch
> - Dataset row / column schema violations
>
> Check the schema and rules in the sibling reference for each file type before editing. **If a dedicated skill handles the file type (.map/.model/.ui/.tileset/.dataset) more safely, prefer that skill** — only fall back to direct local patching with the schema knowledge in this document when no such skill exists.
>
> **Entity reference binding (Entity/EntityRef property) is injected by the AI as a UUID string directly** — do not ask the user to drag in the Maker editor. Detail: `msw-scripting §7 Entity/Component reference properties`.

---

## Per-target Routing

| Task | File to read |
|------|--------------|
| Edit **tile map / tile set** in `.map` (TileMapMode, `tileMap` array, `.tileset`) | [tile.md](tile.md) |
| Create or modify a `.model` **template** (components, Properties, Values, Children) | [model.md](model.md) |
| Place **entities** in `.map`, spawn, parent-child, manage runtime components | [entity.md](entity.md) |
| `.map` JSON **schema detail** | [entity/map-schema.md](entity/map-schema.md) |
| `.model` JSON **schema detail** | [model/model-schema.md](model/model-schema.md) |
| `.ui` authoring (anchors, UITransform, SpriteGUIRenderer, button / text / input / scroll) | [ui.md](ui.md) |
| `.ui` component API (full tables), enums, real-world patterns | [ui/ui-components.md](ui/ui-components.md), [ui/ui-enums.md](ui/ui-enums.md), [ui/ui-patterns.md](ui/ui-patterns.md) (schema is now inside [ui.md](ui.md)) |
| `.userdataset` / `.localedataset` structure, types, runtime API | [dataset.md](dataset.md) |
| Template catalog when creating a new `.model` | [model.md §2.1](model.md) → `../models/*.model` |
| **Authoring a monster** (canonical components, `ActionSheet`, HitComponent, IsLegacy) | [monster.md](monster.md) → `../models/MonsterCanonical.model` |

### Keyword → File Map

- **tile, tile map, tileset, TileMapMode, RectTile, MapleTile, SideViewRectTile, tileIndex** → `tile.md`
- **model, .model, template, NPC model, player, Foothold, Ladder, Rope, Portal, MapObject, particle, Sound, UIButton, ValueType, Properties, Values, Children, BaseModelId** → `model.md` (+ `../models/` catalog)
- **create monster, monster ActionSheet, stand/move/attack/hit/die/jump, HitComponent, IsLegacy, CollisionGroup, AIChase, AIWander, script.Monster, script.MonsterAttack** → `monster.md` (+ `../models/MonsterCanonical.model`)
- **entity, .map, placement, spawn, SpawnService, CurrentMap, componentNames, modelId reference, hierarchy, Foothold** → `entity.md`
- **UI, button, text, image, canvas, UITransform, anchoredPosition, AlignmentOption, UIGroup, DefaultShow, GridView, popup, anchor** → `ui.md`
- **dataset, UserDataSet, LocaleDataSet, translation, table, .userdataset, .localedataset, DataService** → `dataset.md`

---

## Shared Principles (across all 5 file types)

### Absolute Principles

1. **Prefer the dedicated skill** — if a dedicated skill handles the file type better, use it. Otherwise, check the ValueType / UUID / anchor rules in the relevant reference and apply targeted local patches.
2. **Inject entity references as UUID strings directly** — do not ask the user to drag in Maker.
3. **MCP `refresh` after every file change** (if in play mode, `stop` first).
4. **Never modify `Environment/*.d.mlua`** — API definitions are read-only.
5. **Never create or modify `.codeblock` by hand** — Maker `refresh` generates it from `.mlua`.
6. **Edit large files partially** — never overwrite a file in full.
7. **Do not touch `Global/common.gamelogic` and the `common` entity** — these are special engine-managed entries. Do not edit the file's JSON directly, and do not attach components to the `common` entity (including via Maker `AddComponent` or runtime `AddComponent`). For global logic, **author a regular Logic script under `RootDesk/MyDesk/`** and wire up an entry point.

### UUID / ID Rules

- **`.model`'s `EntryKey` (`model://{uuid}`) and `ContentProto.Json.Id` are the same UUID.** Top-level `Id`/`GameId` are empty strings.
- **Entity `id` in `.map` is a UUID v4**, kept consistent with `path`, `componentNames`, and `jsonString.path`.
- **The id portion of `EntryKey` should be lowercase** (e.g., `model://mymonster`, `userdataset://itemtable`).
- When duplicating a file, **always generate a new UUID**: `python -c "import uuid; print(uuid.uuid4())"`.

### RUID Rules

- Resources are identified by an **RUID string**. If `SpriteRUID` is empty, the entity is **invisible on screen** (no error).
- In `.model` `Values` and `.map` `@components`, RUIDs appear as either a string or a `{ "DataId": "hex" }` object — **keep the existing pattern within the same file**.
- Use `msw-search` and `_ResourceService` for asset search. Replace temporary placeholders with real assets before deployment.

### ValueType / JSON Representation Consistency

- `.model`'s `Values` **require a `ValueType` (MODNativeType + assembly canonical name)**. **Copying** from an existing `.model` is safest — never shorten by hand.
- `.map`'s `@components` are inline **without `ValueType`**. The same logical value may have a **different JSON representation** in `.map` vs `.model` — keep each file's existing pattern.
- Detailed type table: [model.md §9](model.md).

### TileMapMode ↔ Body ↔ Entity

- The map root's `MapComponent.TileMapMode` (0/1/2) determines the **entire movement / gravity / collision / tile system**.
- If an entity's Body-family component does not match the map, it **does not move** (no error).
- Mapping table and check protocol: [platform.md §4](platform.md).

### Save Locations

- **New user models go under `RootDesk/MyDesk/`** (with a `Models/` subfolder + `.directory`).
- **Adding new `.model` files arbitrarily under `Global/` may cause Maker to not recognize them.**
- Maps: `./map/`, UI: `./ui/`, datasets: under `RootDesk/MyDesk/`.

### Validation Loop

- **`refresh` → `logs`** → if needed, **`play` → `logs` → `stop`**.
- If a step fails, **stop later steps** — fix the cause and retry.

---

## Per File Type Summary

### `.map` tile map — [tile.md](tile.md)

The 3 `TileMapMode` values (MapleTile/RectTile/SideViewRectTile) completely change the tile map component (`TileMapComponent` vs `RectTileMapComponent`), the array key (`Tiles` vs `tileMap`), and the `TileSetRUID` form (DataId object vs `tileset://` string). Do not confuse tile coordinates (grid cells) with entity coordinates (world units).

### `.model` template — [model.md](model.md)

The blueprint for an entity. Pick the closest template from the **`../models/` catalog** (validated starting points for monsters/NPCs/players/terrain/UI/particles/sound/tile maps, etc.), copy it, replace the 3 identifiers (`EntryKey`, `Id`, `Name`), and customize `Components`/`Properties`/`Values`/`Children`. Spawn at runtime via `SpawnByModelId`, or place in `.map` by `modelId`.

### `.map` entity placement — [entity.md](entity.md)

Add entity instances under `.map`'s `ContentProto.Entities`. Use the `modelId` form (template reference + minimal override) or the inline form (`@components` listed in full). `id`/`path`/`componentNames`/`jsonString.path` consistency is mandatory. Runtime spawn uses `self.Entity.CurrentMap` as the parent.

### `.ui` — [ui.md](ui.md)

Based on FHD 1920x1080 with the origin at center. Place via `UITransformComponent.anchoredPosition` + anchors (`AlignmentOption`, Anchors, Pivot) + `OffsetMin/Max` (do not touch `Position`). UIGroup separation principle, `DefaultShow`, Enable vs Visible, Connect / Disconnect event pairs. UI entities are **client-only** — server RPC / Sync do not work on them.

### `.dataset` — [dataset.md](dataset.md)

`UserDataSet` / `LocaleDataSet` each consist of a **`.userdataset`/`.localedataset` metadata wrapper + `.csv` sidecar pair**. The CSV holds the actual tabular data (all cells are strings); the wrapper holds the `EntryKey`, `name` (runtime lookup key), and `serveronly` flag. Required column rules for LocaleDataSet: `Key`/`Source`/`Note` + locale columns. Runtime APIs: **`_DataService:GetTable(name)` / `:GetCell` / `:GetRowCount`** for UserDataSet, **`_LocalizationService:GetText(key)`** (ClientOnly) for LocaleDataSet. Prefer Maker UI for create / delete.

---

## Related Skills / Documents

| Target | Purpose |
|--------|---------|
| [platform.md](platform.md) | TileMapMode ↔ Body, SpriteRUID, spawn, coordinates, `.directory` rules |
| [mcp-tools.md](mcp-tools.md) | MCP tool detail (refresh/play/stop/logs/screenshot) |
| [workspace.md](workspace.md) | Workspace / hierarchy / file path rules |
| `msw-scripting` | Component/Logic, properties, lifecycle, @ExecSpace |
| `msw-defaultplayer` | Player model, Values, Body components |
| `msw-search` | RUID / asset / document search |
