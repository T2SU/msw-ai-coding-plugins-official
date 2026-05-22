# MSW Monster — Builder-Only Authoring

This reference is for building a working monster model on MapleTile side-view maps. `.model` JSON is builder-managed; do not inspect or edit raw `.model` internals.

Use:

```javascript
const { ModelBuilder, vector2, collisionGroup, actionSheet } = require("../scripts/model/msw_model_builder.cjs");
```

## 1. Silent Failures to Avoid

| Symptom | Root cause | Builder-side fix |
|---|---|---|
| Monster invisible | Missing or wrong `SpriteRUID` | `value("SpriteRendererComponent", "SpriteRUID", standRuid, "string")` |
| Animations never change | Monster action keys are wrong | Use lowercase `stand`, `move`, `attack`, `hit`, `die`, `jump` |
| `[LWA-3019] ... Legacy` | Legacy AI/Hit defaults | Set `IsLegacy` to `false` on AI and Hit components |
| Monster behind tiles | Wrong sorting layer | Set `SortingLayer = "MapLayer0"` and suitable `OrderInLayer` |
| Hit or attack does nothing | Missing hit box / collision group | Set `HitComponent` box, offset, and monster collision group |
| Monster faces wrong direction | Sprite resources usually face left | Invert `TransformComponent.Scale.x` from movement direction, not `SpriteRendererComponent.FlipX`, so the sprite and collider stay aligned |

Avatar animation keys are uppercase; monster `StateAnimationComponent` keys are lowercase. Do not mix them.

## 2. Standard Monster Composition

A side-view monster usually needs:

- `TransformComponent`
- `StateAnimationComponent`
- `SpriteRendererComponent`
- `RigidbodyComponent` for MapleTile (`TileMapMode = 0`)
- `MovementComponent`
- `AIChaseComponent` or `AIWanderComponent`
- `StateComponent`
- `HitComponent`
- `DamageSkinSpawnerComponent`
- optional `script.Monster`
- optional `script.MonsterAttack`

`script.Monster` and `script.MonsterAttack` must already exist and be registered before they are placed in the model. Safe order: write `.mlua` → Maker `refresh` → build `.model` → Maker `refresh`.

## 3. Recommended Path

Start from `../models/MonsterCanonical.model`:

```javascript
const { ModelBuilder, vector2, collisionGroup, actionSheet } = require("../scripts/model/msw_model_builder.cjs");

const b = ModelBuilder.fromTemplate(
  "./skills/msw-general/models/MonsterCanonical.model",
  "Slime"
);

b.value("SpriteRendererComponent", "SpriteRUID", standRuid, "string")
  .value("SpriteRendererComponent", "SortingLayer", "MapLayer0", "string")
  .value("SpriteRendererComponent", "OrderInLayer", 2, "int")
  .value("StateAnimationComponent", "ActionSheet", actionSheet({
    stand: standRuid,
    move: moveRuid,
    attack: attackRuid,
    hit: hitRuid,
    die: dieRuid,
    jump: jumpRuid,
  }), "action_sheet")
  .value("HitComponent", "BoxSize", vector2(0.67, 1.42), "vector2")
  .value("HitComponent", "ColliderOffset", vector2(-0.005, 0.71), "vector2")
  .value("HitComponent", "CollisionGroup", collisionGroup("8992acd1e8cd45838db6f10a7b41df09"), "collision_group")
  .value("HitComponent", "IsLegacy", false, "bool")
  .value("AIChaseComponent", "IsLegacy", false, "bool")
  .value("MovementComponent", "InputSpeed", 1.5, "float")
  .value("MovementComponent", "JumpForce", 6.0, "float")
  .value("script.Monster", "MaxHp", 500.0, "double");

b.write("RootDesk/MyDesk/Models/Monsters/Slime.model");
```

If an action is missing from the resource pack, omit that action key. Set `SpriteRUID` to the same RUID as `ActionSheet.stand`.

## 4. Action RUID Mapping

| Resource action | Monster action key |
|---|---|
| `stand` | `stand` |
| `move` | `move` |
| `jump` | `jump` |
| `attack`, `attack1`, `attack2` | `attack` |
| `hit`, `hit1`, `hit2` | `hit` |
| `die`, `die1` | `die` |

Use `msw-search` to find animationclip RUIDs. Prefer animation packs with at least `stand`, `move`, `attack`, `hit`, and `die`.

## 5. AI Choice

| Want | Component |
|---|---|
| Chase nearest player | `AIChaseComponent` |
| Patrol/wander on footholds | `AIWanderComponent` |
| Stay still and only attack | Remove both `AIChaseComponent` and `AIWanderComponent` |

Both AI components depend on correct Body + Movement + State setup. On MapleTile maps, use `RigidbodyComponent`.

## 6. HP / Respawn

Default combat scripts may make low-HP monsters die quickly. Tune through builder values:

```javascript
b.value("script.Monster", "MaxHp", 500.0, "double")
  .value("script.Monster", "RespawnOn", true, "bool")
  .value("script.Monster", "RespawnDelay", 5.0, "double");
```

If you do not use the default `script.Monster`, attach your custom script at spawn time or follow the script registration order before adding it to the model.

## 7. Spawn Position

For MapleTile, spawn above the foothold so gravity lands the monster cleanly. A practical default is `footholdY + 0.4`. Spawning below footholds can make the monster fall forever and break AI behavior.

## 8. Placement

After writing the model:

1. Maker `refresh`.
2. Place instances in `.map` via `modelId`; see [`entity.md`](entity.md).
3. Do not partially override a system model through a map `modelId` instance. Bake monster defaults into a dedicated `.model`.
4. For repeated monsters, all instances should share one model and only differ in transform/position.

## 9. Verification

1. `refresh` and check build logs for model load errors.
2. `play` and check runtime logs.
3. Verify the monster appears, moves or idles as intended, takes hits, plays hit/die, and spawns damage numbers.
4. `stop` before further file changes.

## 10. Cross-References

| Doc | Why |
|---|---|
| [model.md](model.md) | Builder-only `.model` authoring rules and API |
| [entity.md](entity.md) | Placing a monster in a `.map` |
| [entity.md](entity.md#mapbuilder-protocol) | Builder-first `.map` inspection and model placement |
| [platform-maple.md](platform-maple.md) | MapleTile physics, `PredictFootholdEnd`, foothold AI patterns, MapleTile-specific troubleshooting and checklists |
| [platform.md](platform.md) §4 | TileMapMode↔Body mapping and LEA-3004 (common to all map types) |
| [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix reference ("falls off the foothold edge" / "floating in mid-air" etc.) |
| `msw-search` | Find monster animation packs (`POST /v3/search/resources` with `categories: ["mob","npc"]`) |
| `msw-scripting` | Authoring custom monster behaviors (`script.Monster` overrides, events) |
| [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model) | Verbatim copy source (paste, then swap RUIDs) |
