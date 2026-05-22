# MSW Tile Map (Tile) — `.map` Tile Authoring

In MapleStory Worlds Maker, **map type (`TileMapMode`)**, **tileset / tile data**, **2D tile arrays**, and **player Body** are bundled as one set. Tile map state was previously queried and changed through RPC, but **RPC has been removed.** Tile management is now done through the **Maker tile painter UI**, with the AI in a guidance role.

---

## Policy: AI guides, user paints (MANDATORY)

**The AI must NOT directly write into the tile arrays (`TileMapComponent.Tiles` / `RectTileMapComponent.tileMap`) of a `.map` file.** Hand-authoring tile grids in JSON desyncs the tile palette index, breaks rule-tile face/corner `type` values, and produces silent visual gaps that are hard to diagnose.

Instead, **guide the user to place tiles themselves in the Maker editor**, using the official MSW Creator Center docs as the procedure source of truth:

| Map type | Official tile placement guide |
|----------|------------------------------|
| **MapleTile** (side-view, MapleRuleTile + Foothold) | https://maplestoryworlds-creators.nexon.com/ko/docs/?postId=747 |
| **RectTile / SideViewRectTile** (rect tile + tileset) | https://maplestoryworlds-creators.nexon.com/ko/docs/?postId=589 |

When a user asks the AI to "place tiles" / "fill tiles" / "draw the floor" / "build terrain":

1. **Stop before editing the `.map`.** Tell the user explicitly that tile painting is a Maker-UI task.
2. **Identify the map's `TileMapMode`** with `MapBuilder.read(...).getTileMapMode()`.
3. **Pick the matching official doc** from the table above and either link it directly or summarize the painter steps relevant to the user's goal (selecting tileset, choosing brush, paint / erase / fill, save).
4. **Offer pre-painting setup the AI CAN do** — choose / create the tileset (via the dedicated tileset skill if available), set `TileMapMode`, set `TileSetRUID`, prepare the `RectTileMap` / `TileMap` entity skeleton, configure player Body to match the mode.
5. **After the user reports they finished painting in Maker** → call MCP **`refresh`** so on-disk changes propagate, then verify by reading the tile arrays back (no edit) to confirm dimensions and `tileIndex` validity.

**Exception** — direct `.map` tile-array edits are permitted **only** when:
- Removing all tiles (`tileIndex: -1`) for a clean reset, **or**
- The user explicitly requests programmatic placement (e.g. procedurally generated terrain) **and** confirms the AI may write the array.

In every other case, route to the Maker UI.

---

## Workflow After RPC Removal

| Old RPC concept | Current equivalent |
|----------------|-----------|
| Get tile map mode | `MapBuilder.read(...).getTileMapMode()` |
| List/get/create tile data sets | `.tileset` files (browse the workspace via MCP or open directly) |
| Change tile placement | **User paints in the Maker tile editor UI** (see Policy section above and the official docs). AI does not edit the `Tiles` / `tileMap` arrays directly. |
| Apply changes | After the user finishes painting, run MCP **`refresh`** to apply on-disk changes to the editor |

**Summary**

1. **Change `TileMapMode`** → user performs Maker Hierarchy right-click Switch; AI verifies with `MapBuilder.read(...).getTileMapMode()` afterward.
2. **Tile placement** → guide the user to the Maker tile painter UI using the official docs above. Do **not** write `Tiles` / `tileMap` from the AI.
3. **Runtime tile manipulation from scripts** → use the engine API (see runtime docs and `msw-search` for prerequisites such as map/entity load).
4. **After Maker edits** → run MCP **`refresh`** to update the workspace/scene.

---

## TileMapMode (3 modes)

A single number in `MapComponent.TileMapMode` determines the Body, collision, movement, the type of tile map component, and the rendering stack. Lock in the mode early in map authoring. Changing it later may force a full rebuild of footholds, tiles, and entity Bodies.

> **TileMapMode ↔ Body mapping, check protocol, transition restrictions**: see [platform.md §4](platform.md).
>
> **Choosing the right mode for the user's game (recommendation matrix) + the Maker Hierarchy right-click switch procedure**: see the "Recommending the right mode" and "Changing `TileMapMode`" subsections in [../SKILL.md](../SKILL.md). For any new map (or when the current mode does not fit the user's intended gameplay), the AI must **recommend the appropriate mode first** and then guide the user to **right-click the map in the Maker Hierarchy → "Switch ..." menu** — never write a new `TileMapMode` value from a file edit.

### Tile-map-specific dependencies (per-mode tile system differences)

| System | MapleTile (0) | RectTile (1) | SideViewRectTile (2) |
|--------|-----------|----------|------------------|
| **Tile map component** | `TileMapComponent` | `RectTileMapComponent` | `RectTileMapComponent` |
| **Tileset resource** | `MapleTileSetData` family | `MODTileSetEntry` (`.tileset`) | `MODTileSetEntry` (`.tileset`) |
| **Rendering** | `UnityTileMap` (MapleRuleTile) | `UnityRectTileMap` | `UnityRectTileMap` |
| **Grid** | Fixed (product default grid) | Variable (default 1×1 world unit) | Variable (same) |
| **Foothold** | `FootholdComponent`-centric terrain | Optional | Optional |
| **Collision events** | Standard Rigidbody collisions | 4 RectTileCollision events | 4 RectTileCollision events |

### RectTile vs SideViewRectTile

**Tile map data structure, editing, storage, and rendering are identical.** The only differences are the **physics Body** and gravity / movement handling (see [platform.md §4](platform.md)).

**Shared:** `RectTileMapComponent`, `MODTileSetEntry`, `UnityRectTileMap`, the four RectTileCollision events, and the grid size setting.

### MapleTile is a separate system

- `TileMapComponent` + MapleRuleTile + MapleTileSetData
- Terrain centers on **`FootholdComponent`** linked-list footholds
- Do not confuse it with the **RectTileMap** coordinate / `tileMap` description below.

### RectTileCollision events (RectTile / SideViewRectTile only)

| Event | Meaning |
|--------|------|
| `RectTileCollisionBeginEvent` | Tile collision begins |
| `RectTileCollisionEndEvent` | Tile collision ends |
| `RectTileEnterEvent` | Tile cell entered |
| `RectTileLeaveEvent` | Tile cell exited |

**These events do not fire on MapleTile maps.**

---

## TileDataSet / Tileset Concept (MODTileSetEntry)

The **tile palette** used by RectTile / SideViewRectTile is expressed as a `.tileset` resource (**`MODTileSetEntry`**). In docs and tools, treat one entry at the **TileDataSet / MODTileSetData** level.

```
MODTileSetEntry
├── EntryKey: "tileset://{UUID}"     ← string-matches the map's TileSetRUID
├── ContentType: "x-mod/tileset"
└── datas[]: List<MODTileSetData>    ← tile palette (order is the index)
    ├── Id (GUID), Name, IsCollidable, sprite refs, etc.
    └── ...
```

- **`datas[].Id`**: the tile's **immutable identifier** (GUID).
- **0-based array index of `datas[]`**: the meaning of the **`tileIndex`** referenced by the map. Inserting, deleting, or reordering entries changes what each index means.
- **`IsCollidable`**: tile metadata such as Rect tile collision flag.

**Map linkage**

- `RectTileMapComponent.TileSetRUID` is a **`"tileset://..."` string** and must match the `EntryKey` of that `.tileset`.
- A single tileset may be referenced by **multiple maps** simultaneously.

**When editing a tileset externally**

- Reordering `datas[]` makes existing `tileIndex` values point at the wrong tile. The runtime does not auto-correct.
- When deleting, inserting, or reordering tiles, you must remap every `tileIndex` across all maps.

---

## 2D Tile Array Coordinate System

### Common: a single tile entry

Both MapleTile's `TileMapComponent.Tiles` and the Rect-family `RectTileMapComponent.tileMap` give each tile roughly this shape:

- **`position`**: `{ "x": int, "y": int }` — **cell coordinate on the tile grid** (not world meters).
- **`tileIndex`**: **0-based index** within the tileset. **`-1`** means an empty cell (no tile).
- **`type`**: in MapleTile, takes various values for face / corner rule tiles. In RectTileMap, normally **`0`** (default).

`type` examples for MapleTile `TileMapComponent` (rule tiles linked to foothold visuals):

| type | Meaning (summary) |
|:----:|------------|
| 0 | Fill (interior face) |
| 5 | Top face |
| 6 | Right face |
| 7 | Bottom face |
| 8 | Lower-left corner |
| 9 | Upper-left corner |
| 11 | Upper-right corner |

(Additional types may exist depending on project / assets.)

### RectTileMap ↔ World Units (player / entity placement)

**Tile `position` is a grid cell**; **entity `TransformComponent.Position` is in world units**. Mixing them desyncs spawn position, range, and movement.

Common conventions used with **default** RectTileMap (assuming default camera / grid):

| Item | Detail |
|------|------|
| One tile size | **1 × 1 world unit** (default grid) |
| x axis | Left `-` → right `+` |
| y axis | Down `-` → up `+` |
| Screen origin | Around **(0, 0)** in map-root space is normally screen center |

If you change `CameraComponent.Ratio` or the grid size of `RectTileMapComponent`, the world-unit ↔ screen-pixel mapping changes, so **revalidate placement and range constants**.

---

## Tile-Related Structure in `.map` Files

Map files live under the workspace **`./map/`** (e.g. `map/map01.map`).

### MapleTile (TileMap entity)

- Entity name normally **`TileMap`**
- Component: **`TileMapComponent`**
- Tile array key: **`Tiles`**
- **`TileSetRUID`**: object form `{ "DataId": "GUID" }`

### RectTile / SideViewRectTile (RectTileMap entity)

- Entity name normally **`RectTileMap`** (multiple per layer allowed)
- Component: **`RectTileMapComponent`**
- Tile array key: **`tileMap`** (warning: not `Tiles`)
- **`TileSetRUID`**: **`"tileset://..."` string**

A map may contain **multiple `RectTileMap`** entities (for layer separation), each referencing a different tileset.

---

## Related Skills

- **[`entity.md`](entity.md)** — `.map` entity / component common rules; [`MapBuilder Protocol`](entity.md#mapbuilder-protocol)
- **[platform.md](platform.md)** — TileMapMode ↔ Body, SpriteRUID, spawn rules (core)
- **[platform-maple.md](platform-maple.md)** / **[platform-rect.md](platform-rect.md)** / **[platform-sideview.md](platform-sideview.md)** — Per-map-type physics, events, and troubleshooting
- **`msw-defaultplayer`** — per-mode movement components (`KinematicbodyComponent`, `SideviewbodyComponent`, etc.)

---

## Summary Checklist

- [ ] Does `TileMapMode` (0/1/2) match the planned viewpoint and physics?
- [ ] Does the **Body** of player / NPCs match that mode?
- [ ] If Rect-family: **`RectTileMap` + `tileMap` + `tileset://`**; if MapleTile: **`TileMap` + `Tiles` + DataId object**?
- [ ] Does `tileIndex` point to the **0-based `datas[]`** of that `.tileset`? (`-1` = empty)
- [ ] Are tile-grid coordinates and **world-unit coordinates** kept distinct?
- [ ] **Was the tile painting handed off to the user (Maker UI + official docs)** instead of being written directly by the AI?
- [ ] After Maker edits, was **`refresh`** run?
