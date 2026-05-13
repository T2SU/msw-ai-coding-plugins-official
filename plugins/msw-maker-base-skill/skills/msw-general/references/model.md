# MSW `.model` Files — Authoring Entity Templates

A `.model` file is the **template (blueprint)** of an MSW entity. It declares component composition, property aliases, default values, and child entities. Once defined, you can place it in maps any number of times or dynamically create instances at runtime via `SpawnByModelId`.

---

## 1. When to Create a `.model`

> **Default rule**: if the same entity composition will be placed **two or more times** anywhere — same map, multiple maps, or runtime spawn — **author a `.model`** and instance it via `modelId`. Inline `@components` is reserved for genuinely one-off cases.

| Situation | Choice |
|------|------|
| Same composition placed **≥2 times** in a single map (e.g. 5 monsters, 10 trees, 3 portals) | **Create `.model`** |
| Same composition placed **across multiple maps** | **Create `.model`** |
| **Dynamic spawn** at runtime via `SpawnByModelId` | **Create `.model`** (required) |
| Scripts/properties complex enough to need inspector exposure | **Create `.model`** |
| Truly one-off decoration that appears **exactly once** in a single map | Map-inline `@components` is acceptable |
| Use a system-provided monster/object | Copy `./Global/*.model` into `RootDesk/MyDesk/Models/{Category}/` and customize (do not edit `Global/` directly) |

**Why model + `modelId` is the default for repeated entities:**

- **Single source of truth** — change `SpriteRUID` / HP / `ActionSheet` once in the model and all instances update. Five inline copies require five edits and silently drift apart (one gets `IsLegacy: true`, another forgets `SortingLayer: "MapLayer0"`).
- **`.map` stays small and reviewable** — each `modelId` instance is ~20 lines (mostly `Transform`); each inline copy is hundreds of lines.
- **`SpawnByModelId` becomes available** — runtime spawning requires a registered model id.

> **Storage location**: Save under **`RootDesk/MyDesk/Models/{Category}/{Name}.model`** (typed subfolder, e.g. `Models/Monsters/`, `Models/NPCs/`, `Models/Terrain/`, `Models/MapObjects/`, `Models/Particles/`, `Models/UI/`).
> - **Do not** save directly under `RootDesk/MyDesk/` or directly under `RootDesk/MyDesk/Models/` — both make the workspace unscannable as it grows.
> - Files placed under `Global/` are **invisible to the Maker editor**; never put user models there.
> - When a needed subfolder does not exist, create it **together with a `.directory` file** at the same level ([platform.md §2](platform.md)).

---

## 2. Template Catalog — Starting Point for a New `.model`

When creating a new `.model`, **do not write a blank file from scratch.** The skill-local path `../models/` ships with **validated templates (.model)** for common entity types. **Pick the template closest to the entity you want to build, copy it**, then modify only the name and default values.

> Every template has its `Components` / `Properties` / `Values` filled in with consistent `ValueType` blocks, so **you almost never need to hand-construct `MODNativeType` assembly strings**. Only when adding new properties should you consult the table in §9 and extend the same pattern.

### 2.1 Templates by Use Case

#### Base / Most Empty Starting Point

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/TransformOnly.model`](../models/TransformOnly.model) | `TransformComponent` only | Empty entity with just a position, group container |

#### Characters / Players

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/Player.model`](../models/Player.model) | Full player set (3 Body types + controller + camera, etc.) | Need a new player variant |
| [`../models/DefaultPlayer.model`](../models/DefaultPlayer.model) | System default player | Customize the default player (typically inherit via `BaseModelId`; see `msw-defaultplayer`) |

#### Monster AI

> **Read [monster.md](monster.md) before authoring a monster.** The templates below leave `ActionSheet` empty and use defaults that silently fail (`SortingLayer = "Default"`, `IsLegacy = true`, no HitComponent box). [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model) is the verbatim copy source with all required values pre-filled.

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model) | All 11 monster components + `ActionSheet` placeholders + correct `IsLegacy`/`SortingLayer`/`HitComponent` defaults | **Default starting point for any new monster.** Replace 6 RUIDs and the 3 identifiers. |
| [`../models/ChaseMonster.model`](../models/ChaseMonster.model) | `AIChaseComponent` + Rigidbody/Movement/Hit, etc. | Monster that chases the player (sideview). Lacks pre-filled HitComponent / IsLegacy values — see monster.md §4 before using. |
| [`../models/MoveMonster.model`](../models/MoveMonster.model) | Patrol movement + state/animation | Monster that moves on a fixed pattern. Same caveat. |
| [`../models/StaticMonster.model`](../models/StaticMonster.model) | Fixed position + attack/hit | Stationary attacker, turret-style monster. Same caveat. |
| `*Education.model` | Simplified/educational variant of the same composition | Tutorials and educational content |

#### NPC / Interaction

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/StaticNPC.model`](../models/StaticNPC.model) | Includes `ChatBalloonComponent`, `NameTagComponent` | Static NPC with dialogue and name tag |

#### Platformer Terrain (MapleTile/SideViewRectTile)

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/Foothold.model`](../models/Foothold.model) | `FootholdComponent` | Foothold (MapleTile only) |
| [`../models/Ladder.model`](../models/Ladder.model) | Ladder component | Climbable ladder |
| [`../models/Rope.model`](../models/Rope.model) | Rope component | Rope-climbing terrain |
| [`../models/Portal.model`](../models/Portal.model) | Portal/teleport trigger | Portal between maps |

Each template ships with an `*Education.model` variant.

#### Map Objects / Decoration

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/MapObject.model`](../models/MapObject.model) | Sprite + base components | Generic decorative object |
| [`../models/ParticleMapObject.model`](../models/ParticleMapObject.model) | + particles | Object that plays particles alongside |
| [`../models/SkeletonMapObject.model`](../models/SkeletonMapObject.model) | + skeletal animation | Skeleton-based animated object |
| [`../models/ItemAsset.model`](../models/ItemAsset.model) | Item display | Pickable/usable item |

#### Particles / Effects

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/BasicParticle.model`](../models/BasicParticle.model) | Basic particle | Generic effect |
| [`../models/SpriteParticle.model`](../models/SpriteParticle.model) | Sprite-based particle | Sprite-sheet effect |
| [`../models/AreaParticle.model`](../models/AreaParticle.model) | Area particle | Area-of-effect visuals |
| [`../models/AnimationPlayer.model`](../models/AnimationPlayer.model) | Plays an animation once | One-shot effects like explosions or hits |

#### Sound

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/Sound.model`](../models/Sound.model) | Position-based sound | Ambient sound, BGM trigger |
| [`../models/SoundEffect.model`](../models/SoundEffect.model) | Effect sound | One-shot SFX |

#### Tilemap Containers

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/TileMap.model`](../models/TileMap.model) | `TileMapComponent` | Tile entity for MapleTile maps |
| [`../models/RectTileMap.model`](../models/RectTileMap.model) | `RectTileMapComponent` | Tile entity for RectTile/SideViewRectTile maps |
| [`../models/MapleMapLayer.model`](../models/MapleMapLayer.model) | Maple layer | Layer separation in Maple-style maps |
| [`../models/MapEmpty.model`](../models/MapEmpty.model) | Empty map container | Starting point for an empty map |

#### External Media / UI

| Template | Composition | When to Use |
|--------|------|----------|
| [`../models/WebSprite.model`](../models/WebSprite.model) | External image URL | Display a web image |
| [`../models/YoutubePlayerWorld.model`](../models/YoutubePlayerWorld.model) | YouTube player | Embed a YouTube video |
| [`../models/UIButton.model`](../models/UIButton.model) | `UITransformComponent` + `ButtonComponent` | UI button |
| [`../models/UIText.model`](../models/UIText.model) | UI text (legacy) | UI text (simple) |
| [`../models/UITextGUIRenderer.model`](../models/UITextGUIRenderer.model) | UI text (GUI-renderer based) | UI text (recommended) |
| [`../models/UISprite.model`](../models/UISprite.model) | UI image | UI sprite |
| [`../models/UIGroup.model`](../models/UIGroup.model) | UIGroup container | UI group/panel |
| [`../models/UIEmpty.model`](../models/UIEmpty.model) | Empty UI node | Starting point for a UI container |

> Authoring UI models is usually better done by editing the `.ui` file directly — see [ui.md](ui.md).

### 2.2 Template → New Model (4 Steps)

#### Step 1 — Read the Template

Pick the template closest to the entity you want to build from the table above and **first inspect its contents with the Read tool**.

#### Step 2 — Replace 3 Identifiers

`.model` files use **lowercase alphanumeric identifiers** as the standard (not UUIDs — UUIDs apply only to `.ui` / `.map` entities; see [platform.md §14](platform.md)). If your new model is named `MyMonster`:

| Location | Old (e.g., ChaseMonster) | New |
|------|--------------------------|--------|
| `EntryKey` | `"model://chasemonster"` | `"model://mymonster"` |
| `ContentProto.Json.Id` | `"chasemonster"` | `"mymonster"` |
| `ContentProto.Json.Name` | `"ChaseMonster"` | `"MyMonster"` (PascalCase recommended) |

> Pick a new name that **does not collide with other identifiers** in the same workspace. This is also the key called by `SpawnByModelId("mymonster", ...)`.
>
> Leave the top-level `Id` / `GameId` fields **as empty strings `""`** — Maker fills them in at runtime.

#### Step 3 — Customize Components and Values

For your purpose:

- **Add/remove components**: Edit the `Components` array. When adding a component, also add its default-value entries to `Values` so the intended behavior takes effect.
- **Change defaults**: Match by `Name` in `Values` and modify only `Value` — keep the `ValueType` block intact.
- **Add inspector exposure**: Add an entry to `Properties` to make it editable in the Maker inspector. The safest approach is to **copy** the `MODNativeType` strings of `Type` / `Link.Target` from another `.model` in the same workspace.

> ⚠️ **Do not put custom script components (`script.XXX`) in the `.model` Components array**
>
> If at the time the `.model` is deserialized the `scriptTypes` from the `.codeblock` are not yet registered in the engine load order, `script.XXX` is **silently dropped** and the component is not attached in Maker (the engine logs a warning and removes it from the Components array). When Maker re-saves the model, the dropped state is **persisted permanently**.
>
> **Recommended pattern**: Attach custom script components **at runtime via `AddComponent` immediately after spawn**. If initial values are required, set the properties directly after attachment. For the same reason, do not put `script.XXX` Values entries in the `.model` either — set them in code after spawn.
>
> However, some catalog templates above (such as `ChaseMonster.model`) already include entries like `script.Monster` / `script.MonsterAttack`. They work normally as long as the corresponding script files exist alongside in the workspace — used without those scripts, the warning above applies.

For frequent native-component combinations, see [§4](#4-frequent-component-combinations).

#### Step 4 — Save + refresh

Save to: **`RootDesk/MyDesk/Models/{Category}/{Name}.model`** — always inside a **typed subfolder** of `Models/`, never directly under `MyDesk/` or directly under `Models/`.

| Category folder | Use for |
|---|---|
| `Models/Monsters/` | Monster `.model` files (`Slime.model`, `OrangeMushroom.model`, …) |
| `Models/NPCs/` | NPC, vendor, quest-giver |
| `Models/Players/` | Custom player variants (do not put `DefaultPlayer.model` here — it is a system override) |
| `Models/Terrain/` | `Foothold` / `Ladder` / `Rope` / `Portal` |
| `Models/MapObjects/` | Decoration, props, item assets |
| `Models/Particles/` | Particle / animation-player effects |
| `Models/Sound/` | Sound-emitter models |
| `Models/Tilemaps/` | `TileMap` / `RectTileMap` containers |
| `Models/UI/` | UI prefabs (`UIButton`, `UIText`, …) |
| `Models/Misc/` | Anything that does not fit the above (web sprite, youtube player, …) |

> Pick the closest existing folder; create a new typed folder only when the entity genuinely belongs to a new category.

When creating a new subfolder, also create a `.directory` file at the same level ([platform.md §2](platform.md)). The folder is invisible to Maker without it.

`.model` files are NOT saved to `Global/` — Maker will not detect them.

After saving, always call **MCP `refresh`**.

---

## 3. Real-World Template Examples

For full working examples, Read files like [`../models/ChaseMonster.model`](../models/ChaseMonster.model) directly — they include consistent `MODNativeType` strings, `Properties`/`Values` patterns, and battle-tested defaults like `OrderInLayer`/`CollisionGroup`.

When copying, just follow the four steps in §2.2:
1. Read the template
2. Replace the 3 identifiers (`EntryKey`, `Id`, `Name`)
3. Customize Components / Properties / Values
4. Save under `RootDesk/MyDesk/Models/{Category}/{Name}.model` (typed subfolder required) + `refresh`

> Copy `CoreVersion` (`26.5.0.0`) / `StudioVersion` from the template **as-is**. The top-level `"Id"`, `"GameId"` are always empty strings — Maker fills them.

---

## 4. Frequent Component Combinations

| Entity Type | Core Components |
|------------|--------------|
| Visual object (decoration) | `TransformComponent`, `SpriteRendererComponent` |
| Sideview moving monster | + `MovementComponent`, `RigidbodyComponent`, `StateComponent`, `HitComponent` |
| Top-down moving object | + `MovementComponent`, `KinematicbodyComponent` |
| Interactive NPC | + `SpriteRendererComponent`, `TouchReceiveComponent` |
| Attackable enemy | + `AttackComponent`, `HitComponent` |
| User script | + `script.ScriptName` (case-sensitive match) |

> **Body component must match TileMapMode** — the Body must match the map root's `TileMapMode` value. If they mismatch, movement does not work at all ([platform.md §4](platform.md)).

---

## 5. Properties — Inspector-Exposed Properties

```json
{
  "Name": "speed",
  "DisplayName": "Movement Speed",
  "ShowInInspector": true,
  "Link": {
    "Target": "MOD.Core.MovementComponent",
    "Property": "InputSpeed"
  }
}
```

- `Link.Target`: full path of the target component (or `script.ScriptName`)
- `Link.Property`: the component property name (case-exact)
- If `ShowInInspector: false`, it is hidden from the inspector (used for internal links)

In `Values`, the pattern of `TargetType: null` + `Name: "speed"` typically reaches the final component **through this Properties link** (see `Player.model` / `MoveMonster.model`).

### Composite Types and Special Cases

| Situation | Caution |
|------|------|
| Generic-type strings like `MODSyncDictionary` | The `Type` in `Properties` arrives as a long single-line assembly string — **never shorten it manually** |
| `OrderInLayer`, `SortingLayer` | Directly affects sprite layering and map layers |

---

## 6. Child Entities (Children)

```json
"Children": [
  {
    "Name": "WeaponSlot",
    "Components": [
      "MOD.Core.TransformComponent",
      "MOD.Core.SpriteRendererComponent"
    ],
    "Properties": [],
    "Values": [
      {
        "TargetType": "MOD.Core.TransformComponent",
        "Name": "LocalPosition",
        "Value": { "x": 0.5, "y": 0.0, "z": 0.0 }
      }
    ],
    "EventLinks": [],
    "Children": []
  }
]
```

A child's `TransformComponent` is in **parent-relative local coordinates**.

---

## 7. .directory File for New Subdirectories

When creating a new subdirectory like `RootDesk/MyDesk/Models/`, you must also create a **`.directory` file at the same level** for Maker to recognize it (see [platform.md §2](platform.md)).

---

## 8. CRUD Summary

### Create

1. **Pick the closest template from the catalog (§2.1)** → Read.
2. Replace 3 spots: `EntryKey` (`model://{lowercase-id}`), `ContentProto.Json.Id` (lowercase), `Name` (PascalCase).
3. Add/remove/modify `Components` / `Properties` / `Values` to match your purpose.
4. Keep top-level `Id`/`GameId` as empty strings ([model/model-schema.md](model/model-schema.md)).
5. Save to `RootDesk/MyDesk/Models/{Name}.model`. When creating a new subfolder, a paired **`.directory`** file is required.
6. `refresh`.

### Read / Update

- **Never arbitrarily shorten the `ValueType`** of an existing entry.
- For inheritance models using `BaseModelId`, place **only the overrides** in the child (`DefaultPlayer` pattern: `msw-defaultplayer`).

### Delete

- After deleting the file, remove or replace any **`.map` entries** that reference that `modelId` with a different model.
- After `refresh`, check `logs` for missing-reference errors.

---

## 9. Property Serialization Type Rules (`.model` `Values`) — **CRITICAL**

Incorrect type notation results in **silent failure** or **load failure**.

Each `Values` entry has the fields:

- `TargetType`: `null` (route via a model property link), `"MOD.Core.XXXComponent"`, or `"script.ScriptName"`
- `Name`: component property name (case-exact)
- `ValueType`: **`$type`: `"MODNativeType"`** + `type`: assembly qualified name string
- `Value`: the actual value

**The safest approach is to copy the `ValueType` string from an existing `.model` in the same workspace.** The `Version` number of `MOD.Core` may vary by engine version.

### Common ValueType Examples (reference — copying from real files is recommended)

| C# / Logical Type | ValueType.type Example (partial) | JSON `Value` Form |
|----------------|-----------------------------|---------------------|
| `float` / `single` | `System.Single, mscorlib, Version=4.0.0.0, ...` | `1.0` |
| `double` | `System.Double, mscorlib, ...` | `1.0` |
| `int` / `Int32` | `System.Int32, mscorlib, ...` | `10` |
| `long` / `Int64` | `System.Int64, mscorlib, ...` | `10` |
| `bool` | `System.Boolean, mscorlib, ...` | `true` / `false` |
| `string` | `System.String, mscorlib, ...` | `"text"` |
| `Vector2` / `MODVector2` | `MOD.Core.MODVector2, MOD.Core, Version=...` | `{ "$type": "MOD.Core.MODVector2, MOD.Core", "x": 0.0, "y": 0.0 }` |
| `Vector3` | `MOD.Core.MODVector3, MOD.Core, ...` | `{ "x", "y", "z" }` (+ `$type` if needed, follow existing files) |
| `Color` / `MODColor` | MOD.Core color type | `{ "r", "g", "b", "a" }` (0–1) |
| `MODDataRef` | `MOD.Core.MODDataRef, MOD.Core, ...` | `{ "$type": "MOD.Core.MODDataRef, MOD.Core", "DataId": "hex..." }` |
| `CollisionGroup` | `MOD.Core.Physics.CollisionGroup, MOD.Core, ...` | `{ "$type": "MOD.Core.Physics.CollisionGroup, MOD.Core", "Id": "hex..." }` |
| Enum (render settings, etc.) | The qualified name of the enum | Same numeric/string notation as existing models |

### `Type` + `Link` in the Properties Array

Each `ContentProto.Json.Properties` entry defines an **alias** to expose in the inspector.

- `Type`: the MODNativeType that decides the editing UI in the inspector (copy from an existing model).
- `Link.Target`: full type name of the target component (often an object with `$type`).
- `Link.Property`: the actual component property to bind to.

---

## 10. Components Array Editing Rules

1. Add/remove strings from the `.model`'s `"Components": [ "..." ]`.
2. Add the component's defaults to the `.model`'s `Values`.
3. For map-inline entities, add/remove the `@components` JSON object and update the `componentNames` string ([entity.md](entity.md)).
4. For script components, the **`script.ScriptName`** must match the `.mlua` filename in case.
5. After `refresh`, check `logs` to confirm there are no errors.

> **Caution**: Adding a custom component to `.model` without the script present causes a load failure. If unstable, consider the runtime `AddComponent` pattern ([model/model-schema.md](model/model-schema.md)).

---

## 11. Post-Creation Checklist

- [ ] Did you Read **the closest template** from the §2.1 catalog?
- [ ] Did you replace `EntryKey`, `ContentProto.Json.Id`, and `Name` with the new identifier (lowercase id + PascalCase Name, no collision in workspace)?
- [ ] Are top-level `Id`/`GameId` empty strings `""`?
- [ ] Is the save location under `RootDesk/MyDesk/` (verify it is not `Global/`)?
- [ ] When creating a new subdirectory, did you also create the `.directory` file?
- [ ] Are all required components included in `Components`?
- [ ] Did you pick the Body component matching `TileMapMode`? ([platform.md §4](platform.md))
- [ ] If `SpriteRendererComponent` is present, is `SpriteRUID` set in `Values`? (use `msw-search` to obtain a RUID)
- [ ] Are the `ValueType` blocks of any added `Values` consistent? (copy from an existing `.model`)
- [ ] Does the model appear in Maker after calling `refresh`?
- [ ] Did you check `logs` for any load errors?

---

## 12. Related Docs

| Doc | Purpose |
|------|------|
| [model/model-schema.md](model/model-schema.md) | Full `.model` schema details |
| [entity.md](entity.md) | Place created models in maps, spawn, runtime validation |
| `msw-scripting` | Authoring `.mlua` scripts to attach to models |
| `msw-search` | Resource lookup such as `SpriteRUID` |
| [platform.md](platform.md) | File location rules, `.directory`, TileMapMode |
