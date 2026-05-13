# `.map` File Schema

Map definition file. Contains physics settings, foothold chains, tile maps, and placed entities.

---

## Overall Structure

```json
{
  "Id": "",
  "GameId": "",
  "EntryKey": "map://map01",
  "ContentType": "x-mod/map",
  "Content": "",
  "Usage": 0,
  "UsePublish": 1,
  "UseService": 0,
  "CoreVersion": "26.5.0.0",
  "StudioVersion": "0.1.0.0",
  "DynamicLoading": 0,
  "ContentProto": {
    "Use": "Binary",
    "Entities": [ ... ]
  }
}
```

| Field | Description |
|------|------|
| `Id`, `GameId` | Keep as empty string (system fills in) |
| `EntryKey` | `map://{mapname_lowercase}` |
| `UsePublish` | 1 = included in publish |
| `DynamicLoading` | 0 = load at start, 1 = dynamic load |
| `ContentProto.Entities` | Array of all entities in the map (the core) |

---

## Entities Array — All Components of the Map

Entities is a **flat array**, but `path` expresses hierarchy.

### Default entity layout (typical map)

```
Entities[0] = Map root         (MapComponent + FootholdComponent)
Entities[1] = Background       (BackgroundComponent)
Entities[2] = MapLayer         (MapLayerComponent)
Entities[3] = TileMap          (TransformComponent + TileMapComponent)
Entities[4] = SpawnLocation    (TransformComponent + SpriteRendererComponent + SpawnLocationComponent)
Entities[5+] = Placed entities (monsters, NPCs, objects, etc.)
```

### Common entity shape

```json
{
  "id": "bdadf19a-cc27-4a45-99c6-7a439c858a1b",
  "path": "/maps/map01/EntityName",
  "componentNames": "MOD.Core.TransformComponent,MOD.Core.SpriteRendererComponent",
  "jsonString": {
    "name": "EntityName",
    "path": "/maps/map01/EntityName",
    "nameEditable": true,
    "enable": true,
    "visible": true,
    "localize": false,
    "displayOrder": 5,
    "pathConstraints": "///",
    "revision": 0,
    "modelId": null,
    "@components": [ ... ],
    "@version": 1
  }
}
```

| Field | Description |
|------|------|
| `id` | UUID v4 (with hyphens). Unique entity identifier |
| `path` | Hierarchy path. Root: `/maps/{mapname}`; child: `/maps/{mapname}/{entityname}` |
| `componentNames` | Comma-separated component list (outer field, synced with `@components` inside `jsonString`) |
| `displayOrder` | Sibling entity sort order |
| `pathConstraints` | Root `"//"`, child `"///"` |
| `modelId` | Referenced model id (null = inline definition) |
| `@components` | Component data array |

### path-based hierarchy

Parent-child relationships are determined by `path` prefix.

```
/maps/map01                    ← root (parent)
/maps/map01/Background         ← child
/maps/map01/TileMap            ← child
/maps/map01/SpawnLocation      ← child
/maps/map01/Monster01          ← child (entity added by AI)
```

---

## Map Root Entity — MapComponent

Defines the physics properties of the map.

```json
{
  "@type": "MOD.Core.MapComponent",
  "AirAccelerationXFactor": 1.0,
  "AirDecelerationXFactor": 1.0,
  "FallSpeedMaxXFactor": 1.0,
  "FallSpeedMaxYFactor": 1.0,
  "Gravity": 1.0,
  "IsInstanceMap": false,
  "TileMapMode": 0,
  "WalkAccelerationFactor": 1.0,
  "WalkDrag": 1.0,
  "Enable": true
}
```

### TileMapMode values

| Value | Mode | Viewpoint | Body component |
|:--:|------|------|--------------|
| 0 | `MapleTile` | side-view | `RigidbodyComponent` |
| 1 | `RectTile` | top-down | `KinematicbodyComponent` |
| 2 | `SideViewRectTile` | side-view | `SideviewbodyComponent` |

### Main physics properties

| Property | Default | Description |
|------|:------:|------|
| `Gravity` | 1.0 | Gravity multiplier (0 = zero gravity) |
| `WalkAccelerationFactor` | 1.0 | Ground acceleration multiplier |
| `WalkDrag` | 1.0 | Ground friction multiplier |
| `AirAccelerationXFactor` | 1.0 | Air horizontal acceleration multiplier |
| `AirDecelerationXFactor` | 1.0 | Air horizontal deceleration multiplier |
| `FallSpeedMaxXFactor` | 1.0 | Max horizontal fall speed multiplier |
| `FallSpeedMaxYFactor` | 1.0 | Max vertical fall speed multiplier |
| `IsInstanceMap` | false | Whether the map is an instance map |

---

## FootholdComponent — Footholds (MapleTile only)

Defines walkable footholds in MapleTile mode. Attached to the map root entity.

### FootholdsByLayer structure

```json
{
  "@type": "MOD.Core.FootholdComponent",
  "FootholdsByLayer": {
    "1": [
      {
        "Id": 1,
        "NextFootholdId": 2,
        "PreviousFootholdId": 0,
        "groupID": 1,
        "layer": 1,
        "sortingLayerName": "MapLayer0",
        "Length": 5.0,
        "StartPoint": { "x": -5.0, "y": 0.0 },
        "EndPoint": { "x": 0.0, "y": 0.0 },
        "Variance": { "x": 1.0, "y": 0.0 },
        "OwnerId": "tilemap-entity-uuid",
        "attribute": {
          "walk": 1.0,
          "force": 0.0,
          "drag": 1.0,
          "isBlockVertical": false,
          "isDynamic": false,
          "isCustomFoothold": false,
          "inertiaOption": 0
        }
      }
    ]
  }
}
```

### Foothold field details

| Field | Type | Description |
|------|------|------|
| `Id` | int | Foothold unique id (sequential int per map, starting at 1) |
| `NextFootholdId` | int | Next foothold id (0 = chain end) |
| `PreviousFootholdId` | int | Previous foothold id (0 = chain start) |
| `groupID` | int | Group number. Same group = one platform |
| `layer` | int | Layer number it belongs to |
| `sortingLayerName` | string | Render sorting layer |
| `Length` | number | Segment length (StartPoint→EndPoint distance) |
| `StartPoint` | Vector2 | Foothold start point (world coord) |
| `EndPoint` | Vector2 | Foothold end point (world coord) |
| `Variance` | Vector2 | Direction vector (normalized) |
| `OwnerId` | string | Owning entity UUID (typically the TileMap entity) |

### attribute fields

| Field | Default | Description |
|------|:------:|------|
| `walk` | 1.0 | Walk speed multiplier (2.0 = faster, 0.5 = slower) |
| `force` | 0.0 | Wind / conveyor force (positive = right) |
| `drag` | 1.0 | Friction |
| `isBlockVertical` | false | Block vertical pass-through (true = cannot jump up through it) |
| `isDynamic` | false | Whether the foothold is dynamic |
| `isCustomFoothold` | false | Custom foothold |

### Foothold chain pattern

Footholds are connected as a **doubly linked list**. Footholds with the same `groupID` form one platform.

**Simple floor (3 footholds)**:
```
[Id:1] ──→ [Id:2] ──→ [Id:3]
 Prev:0     Prev:1     Prev:2
 Next:2     Next:3     Next:0
```

**U-shaped border (left wall + floor + right wall)**:
```
Left wall (vertical)   Floor (horizontal)        Right wall (vertical)
        ↓                       →                          ↓
Id:34→33→...→27→1→2→...→18→19→...→26
```

**Rules when adding footholds**:
1. New `Id` = max existing `Id` + 1
2. To insert into an existing chain: update Next/Previous of the surrounding footholds
3. New chain (separate platform): assign a new `groupID`, build an independent chain
4. `Length` must equal the StartPoint↔EndPoint distance
5. `OwnerId` is the UUID of the TileMap entity

---

## TileMapComponent — Visual Tiles

Visual representation of footholds. Attached to the TileMap entity.

```json
{
  "@type": "MOD.Core.TileMapComponent",
  "TileSetRUID": { "DataId": "9dfea3808bbd49a5877d8624df21b1c7" },
  "SortingLayer": "MapLayer0",
  "OrderInLayer": 1,
  "Tiles": [
    { "type": 5, "position": { "x": -16, "y": -4 }, "tileIndex": 0 },
    { "type": 0, "position": { "x": -15, "y": -5 }, "tileIndex": 0 }
  ],
  "DefaultAttribute": {
    "walk": 1.0,
    "force": 0.0,
    "drag": 1.0,
    "isBlockVertical": false,
    "isDynamic": false,
    "isCustomFoothold": false,
    "inertiaOption": 0
  }
}
```

### Tile type values

| type | Shape | Description |
|:----:|------|------|
| 0 | Fill | Interior face (most common) |
| 5 | Top face | Upper edge |
| 6 | Right face | Right edge |
| 7 | Bottom face | Lower edge |
| 8 | Lower-left corner | Bottom-left vertex |
| 9 | Upper-left corner | Top-left vertex |
| 11 | Upper-right corner | Top-right vertex |

- `position`: grid coordinate (integer). Tile-grid index, not world coord
- `tileIndex`: variant number within the tileset (0..N, -1 = empty tile)

---

## SpawnLocation — Player Spawn Point

The location where players appear when entering the map.

```json
{
  "id": "spawn-uuid",
  "path": "/maps/map01/SpawnLocation",
  "componentNames": "MOD.Core.TransformComponent,MOD.Core.SpriteRendererComponent,MOD.Core.SpawnLocationComponent",
  "jsonString": {
    "name": "SpawnLocation",
    "enable": true,
    "@components": [
      {
        "@type": "MOD.Core.TransformComponent",
        "Position": { "x": 0.0, "y": 0.0, "z": 999.999 }
      },
      {
        "@type": "MOD.Core.SpriteRendererComponent",
        "SpriteRUID": { "DataId": "editor_icon_RUID" },
        "Enable": true
      },
      {
        "@type": "MOD.Core.SpawnLocationComponent",
        "Enable": true
      }
    ]
  }
}
```

- `Position.z = 999.999`: for render order (visible only in the editor)
- `SpawnLocationComponent`: marker component (no extra properties)
- Changing the position changes the player's start point

---

## BackgroundComponent — Background

```json
{
  "@type": "MOD.Core.BackgroundComponent",
  "Color": { "r": 0.518, "g": 0.773, "b": 0.882, "a": 1.0 },
  "TemplateName": "",
  "Enable": true
}
```

- `Color`: background color (RGBA, 0..1)
- `TemplateName`: background template (empty string = solid color)

---

## Adding an Entity to a Map

To add a new entity (monster spawn point, object, etc.) to a map, insert a new item into the `Entities` array.

### Basic entity template

```json
{
  "id": "freshly-generated-uuid-v4",
  "path": "/maps/map01/MyEntity",
  "componentNames": "MOD.Core.TransformComponent,MOD.Core.SpriteRendererComponent",
  "jsonString": {
    "name": "MyEntity",
    "path": "/maps/map01/MyEntity",
    "nameEditable": true,
    "enable": true,
    "visible": true,
    "localize": false,
    "displayOrder": 10,
    "pathConstraints": "///",
    "revision": 0,
    "modelId": null,
    "@components": [
      {
        "@type": "MOD.Core.TransformComponent",
        "Position": { "x": 0.0, "y": 1.0, "z": 0.0 },
        "Rotation": { "x": 0.0, "y": 0.0, "z": 0.0 },
        "Scale": { "x": 1.0, "y": 1.0, "z": 1.0 },
        "Enable": true
      },
      {
        "@type": "MOD.Core.SpriteRendererComponent",
        "SpriteRUID": { "DataId": "1705e3c5b2c146ac9a699f96fb067408" },
        "Color": { "r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0 },
        "SortingLayer": "MapLayer0",
        "OrderInLayer": 10,
        "Enable": true
      }
    ],
    "@version": 1
  }
}
```

### Model-referenced entity (using `modelId`)

Place an entity by referencing an existing `.model` file. **The Maker editor emits a fully populated entity even for a model reference** — `componentNames` is the full comma-joined list, and `@components` mirrors *every* component from the model. Authoring it any other way (empty `componentNames`, single-component `@components`) silently strips the missing components from the instance at runtime — the monster spawns without `HitComponent`, `AIChaseComponent`, etc., and looks "almost there but broken."

Verbatim example for a `chasemonster` instance (matches what Maker writes after placing one and saving):

```json
{
  "id": "4a2dc902-4f14-41ad-9c35-359672e709f8",
  "path": "/maps/map01/MonsterSpawn",
  "componentNames": "MOD.Core.TransformComponent,MOD.Core.StateAnimationComponent,MOD.Core.SpriteRendererComponent,MOD.Core.RigidbodyComponent,MOD.Core.MovementComponent,MOD.Core.AIChaseComponent,MOD.Core.StateComponent,MOD.Core.HitComponent,MOD.Core.DamageSkinSpawnerComponent,script.Monster,script.MonsterAttack",
  "jsonString": {
    "name": "MonsterSpawn",
    "path": "/maps/map01/MonsterSpawn",
    "nameEditable": true,
    "enable": true,
    "visible": true,
    "localize": false,
    "displayOrder": 10,
    "pathConstraints": "///",
    "revision": 1,
    "origin": {
      "type": "Model",
      "entry_id": "chasemonster",
      "sub_entity_id": null,
      "root_entity_id": "4a2dc902-4f14-41ad-9c35-359672e709f8",
      "replaced_model_id": null
    },
    "modelId": "chasemonster",
    "@components": [
      {
        "@type": "MOD.Core.TransformComponent",
        "Position": { "x": 3.0, "y": 1.0, "z": 0.0 },
        "QuaternionRotation": { "x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0 },
        "Enable": true
      },
      { "@type": "MOD.Core.StateAnimationComponent", "Enable": true },
      {
        "@type": "MOD.Core.SpriteRendererComponent",
        "ActionSheet": {},
        "Enable": true
      },
      {
        "@type": "MOD.Core.RigidbodyComponent",
        "MoveVelocity": { "x": 0.0, "y": 0.0 },
        "RealMoveVelocity": { "x": 0.0, "y": 0.0 },
        "Enable": true
      },
      { "@type": "MOD.Core.MovementComponent", "Enable": true },
      { "@type": "MOD.Core.AIChaseComponent", "IsLegacy": false, "Enable": true },
      { "@type": "MOD.Core.StateComponent", "Enable": true },
      { "@type": "MOD.Core.HitComponent", "IsLegacy": false, "Enable": true },
      { "@type": "MOD.Core.DamageSkinSpawnerComponent", "Enable": true },
      { "@type": "script.Monster", "Enable": true, "IsDead": false },
      {
        "@type": "script.MonsterAttack",
        "Enable": true,
        "SpriteSize": { "x": 0.0, "y": 0.0 },
        "PositionOffset": { "x": 0.0, "y": 0.0 }
      }
    ],
    "@version": 1
  }
}
```

| Field | Required value |
|-------|---------------|
| `componentNames` | **Full comma-joined list** matching the model's `Components` array — never empty |
| `revision` | `1` for a freshly placed instance (bumps as Maker saves further edits) |
| `modelId` | lowercase model id (matches the model's `Id`) |
| `origin.type` | `"Model"` |
| `origin.entry_id` | same lowercase id as `modelId` |
| `origin.root_entity_id` | **same as the outer `id`** (self-reference for a top-level instance; sub-entities of a composite model carry the parent root's id instead) |
| `origin.sub_entity_id` / `replaced_model_id` | `null` unless this is a sub-entity or a model substitution |
| `@components` | **Mirror every component in the model's `Components` array**, in the same order, each with at minimum `Enable: true`. Repeat the model's per-component defaults (`IsLegacy: false` on `AIChase…` / `HitComponent` on `SpriteRendererComponent`, default `MoveVelocity`, `IsDead: false`, `SpriteSize`/`PositionOffset` zero-vectors on `script.MonsterAttack`, etc.). Apply per-instance overrides on the relevant entry — typically `Position` on `TransformComponent`. |

> **Why mirror everything?** A `modelId` instance is *not* a thin pointer that pulls components from the model at load time. The map's `@components` array *is* the runtime component list — Maker treats a missing entry as "this component is removed from this instance." Empty `componentNames` + single-component `@components` = an entity that has only `TransformComponent` at runtime, regardless of what the model defines.

### Add-time checklist

- [ ] `id`: generate a fresh UUID v4 (with hyphens)
- [ ] `path`: in the form `/maps/{mapname}/{entityname}`
- [ ] `componentNames`: in sync with the `@type` values of `@components`
- [ ] `displayOrder`: a value that does not collide with existing entities
- [ ] `pathConstraints`: `"///"` for child entities

---

## SectorConfig Integration

When you create a new map, you must register it in `Global/SectorConfig.config`.

```json
{
  "Sectors": [
    {
      "id": "sector01",
      "name": "sector01",
      "maxUserNo": 16,
      "entries": [
        "map://map01",
        "map://map02"
      ]
    }
  ]
}
```

- Add `map://{mapname}` to the `entries` array
- Multiple maps can be registered in one sector
- `maxUserNo`: max concurrent users for that sector
