# `.map` Builder Protocol

`MapBuilder` covers the safe subset needed for common agent map work. It does not replace Maker. Use it first for covered operations; direct `.map` reads/writes are allowed only when the builder explicitly cannot cover the task.

Use `../../scripts/map/msw_map_builder.cjs` for inspection and mutation:

```javascript
const { MapBuilder } = require("../../scripts/map/msw_map_builder.cjs");

const map = MapBuilder.read("map/map01.map");
console.log(map.getMapInfo());
console.log(map.listEntities());

map.placeModel("Monster01", "RootDesk/MyDesk/Models/Monsters/Slime.model", {
  pos: [3, 1, 0],
});

map.write("map/map01.map");
```

## Required Workflow When Covered

1. `MapBuilder.read("map/{name}.map")`.
2. Inspect with `getMapInfo()`, `getTileMapMode()`, `listEntities()`, `find()`, `getTiles()`, or `getFootholds()`.
3. Mutate through builder APIs when the operation is covered.
4. `write()` the same map file.
5. Run MCP `refresh`; then verify with logs/play if runtime behavior matters.

## API

| Method | Returns | Purpose |
|---|---|---|
| `MapBuilder.read(path)` | `MapBuilder` | Load a `.map` file |
| `MapBuilder.snapshot(path)` | summary | Read-only summary without instantiating |
| `getMapInfo()` | summary | TileMapMode, gravity, instance flag, counts |
| `getTileMapMode()` | `0`/`1`/`2` | MapleTile / RectTile / SideViewRectTile |
| `listEntities()` | array | Compact entity list |
| `find(name)` | entity record | Lookup by relative name or `/maps/...` path |
| `component(name, compType)` | component object | Read a component on an entity |
| `placeModel(name, modelPath, opts)` | `MapBuilder` | Place a `.model` instance (`pos`, `componentOverrides`, …) |
| `sprite(name, opts)` | `MapBuilder` | Inline sprite entity (`ruid`, `pos`, `order`) |
| `empty(name, opts)` | `MapBuilder` | Empty/script-only entity (`pos`, `scripts`) |
| `entity(name, components, opts)` | `MapBuilder` | Low-level entity placement |
| `patch(name, updates)` | `MapBuilder` | Position/enable/rename in one call |
| `patchComponent(name, compType, fields)` | `MapBuilder` | Field-level component update |
| `upsertComponent(name, compType, body)` | `MapBuilder` | Add or replace a component |
| `removeComponent(name, compType)` | `MapBuilder` | Drop a component |
| `rename(oldName, newName)` | `MapBuilder` | Rename an entity |
| `remove(name)` | `MapBuilder` | Delete an entity |
| `getTiles()` / `getTileAt(x,y)` / `getTileBounds()` | tile data | Tile inspection |
| `getFootholds(layer)` / `getFootholdBounds(layer)` | foothold data | Foothold inspection |
| `build()` | JSON | In-memory map JSON |
| `snapshot()` | summary | Current builder state summary |
| `write(path)` | void | Save back to `.map` file |

Read-only inspection is `find()` + `component()`. To read raw entity JSON when the builder cannot cover the case, fall back to parsing the `.map` file's `ContentProto.Entities[*].jsonString` directly.

### Load / Inspect

```javascript
const map = MapBuilder.read("map/map01.map");
MapBuilder.snapshot("map/map01.map");

map.getMapInfo();       // TileMapMode, Gravity, IsInstanceMap, entity/tile/foothold counts
map.getTileMapMode();   // 0 MapleTile, 1 RectTile, 2 SideViewRectTile
map.listEntities();     // compact entity list
map.find("Monster01");  // entity by relative name or /maps/... path
map.component("Monster01", "MOD.Core.TransformComponent");
```

### Entity Placement

Prefer `.model` + `modelId` placement for repeated or runtime-spawned content.

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

## Coverage Gaps

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

## Map Mode Rules

Always inspect `TileMapMode` before any map work:

| Value | Mode | Required Body |
|:--:|---|---|
| `0` | MapleTile | `RigidbodyComponent` |
| `1` | RectTile | `KinematicbodyComponent` |
| `2` | SideViewRectTile | `SideviewbodyComponent` |

The builder may read the mode, but it must not be used to flip `TileMapMode` directly. Mode switching is a Maker Hierarchy right-click operation.

## Constraints

- Prefer `MapBuilder` for covered operations.
- Direct `.map` reads/writes are allowed only for uncovered operations; keep edits minimal and verify with `refresh` plus logs/play when behavior matters.
- Do not hand-write `Entities[]`, `componentNames`, `origin`, `pathConstraints`, or foothold chains when a builder API can do it.
- Use `.model` first for any composition placed more than once or spawned at runtime.
