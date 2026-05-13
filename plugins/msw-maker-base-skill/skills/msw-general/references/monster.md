# MSW Monster — Authoring a Side-View Monster `.model`

The reference for building a working monster on **MapleTile** (side-view) maps. Read this **first** before creating any monster, before consulting [model.md §2.1](model.md) — the catalog templates leave key fields blank, and getting them wrong silently breaks the monster.

The canonical truth is the `Model_monster-*.model` file Maker emits when a creator places a monster from the editor. The verbatim skeleton with full `MODNativeType` strings is shipped at [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model). Use it as your copy source.

---

## 1. Why This Doc Exists (Symptoms)

These are the silent failures you avoid by following this doc:

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Monster invisible (no error) | `SpriteRUID` empty / wrong | Set `SpriteRUID` to the **stand** animation RUID |
| Animations never change with state | `ActionSheet` keys are uppercase (`IDLE`, `MOVE`, ...) | Monster keys are **lowercase** (`stand`, `move`, `attack`, `hit`, `die`, `jump`) |
| `[LWA-3019] NotRecommendedValue ... Legacy` warning | `IsLegacy = true` on `HitComponent` / `AIChaseComponent` / `AIWanderComponent` | Set `IsLegacy: false` |
| Monster placed on map renders behind tiles | `SortingLayer` left at `"Default"` | Use `"MapLayer0"` |
| Hit / attack does nothing | Wrong / missing `CollisionGroup`, `BoxSize`, `ColliderOffset` on `HitComponent` | Copy values from §3 |
| `LEA-3046 InternalError` at runtime when overriding a system model via `modelId` | Partial component overrides on a model-referenced entity reset other fields and break dependent components | Bake values into a dedicated `.model` (no `modelId` reference + override pattern) |
| Monster spawns with only `TransformComponent` — no sprite, no AI, no collider — even though the `.model` is correct | `componentNames` left as `""` and `@components` only contains the `TransformComponent` override on a `modelId` instance. **A `modelId` instance is not a thin pointer**: the map's `@components` *is* the runtime component list, and missing entries are treated as removed. | Mirror every component from the model into `componentNames` (full comma-joined list) and `@components` (one entry per component, each with at least `Enable: true`). See [entity/map-schema.md "Model-referenced entity"](entity/map-schema.md). |
| Player attacks one-shot the monster, then dead state stays | Default `script.Monster` HP = 100 vs. `PlayerAttack` damage = 50; dead handler sets `IsDead = true` and disables; no `RespawnOn = true` | Set `MaxHp` higher or set `RespawnOn = true` |
| Monster faces the wrong direction while chasing/patrolling | MSW sprite resources are authored **facing left** by default; custom AI scripts that call `MovementComponent:MoveToDirection` don't auto-flip the sprite | Update `SpriteRendererComponent.FlipX` on direction change (`FlipX = velocity.x > 0`), or rely on native `AIChaseComponent` / `AIWanderComponent` which flip automatically. Never use `TransformComponent.Scale.x` to flip — it breaks colliders. See [msw-search/SKILL.md "Sprite Orientation"](../../msw-search/SKILL.md). |

> **Avatar ActionSheet vs. Monster ActionSheet** — `AvatarStateAnimationComponent` (for players) uses **uppercase** keys (`IDLE`, `MOVE`, `ATTACK`, ...). `StateAnimationComponent` on monsters uses **lowercase action names** (`stand`, `move`, `attack`, `hit`, `die`, `jump`). Mixing the two conventions = animations silently fail to switch.

---

## 2. Canonical Monster Components (11)

A monster placed by Maker emits this exact set:

```json
"Components": [
  "MOD.Core.TransformComponent",
  "MOD.Core.StateAnimationComponent",
  "MOD.Core.SpriteRendererComponent",
  "MOD.Core.RigidbodyComponent",
  "MOD.Core.MovementComponent",
  "MOD.Core.AIChaseComponent",          // or AIWanderComponent for patrol
  "MOD.Core.StateComponent",
  "MOD.Core.HitComponent",
  "MOD.Core.DamageSkinSpawnerComponent",
  "script.Monster",
  "script.MonsterAttack"
]
```

| Component | Role | Required for |
|-----------|------|------|
| `TransformComponent` | Position / rotation / scale | All |
| `StateAnimationComponent` | Maps state name → animation RUID (the `ActionSheet`) | Visuals |
| `SpriteRendererComponent` | Renders the current sprite/animation; `SpriteRUID` is the **default** (stand) | Visuals |
| `RigidbodyComponent` | MapleTile gravity / foothold collision (Body for `TileMapMode = 0`) | Movement |
| `MovementComponent` | `InputSpeed`, `JumpForce` | Movement |
| `AIChaseComponent` *or* `AIWanderComponent` | Behavior tree (chase player / wander). Auto-adds `StateComponent` if absent. | AI |
| `StateComponent` | Logical state machine (`stand` → `move` → `hit` → `die`); receives `StateChangeEvent` | AI / animation |
| `HitComponent` | Damage receiver; defines collider | Combat |
| `DamageSkinSpawnerComponent` | Spawns the floating damage numbers on hit | Combat polish |
| `script.Monster` | HP / Dead / Respawn (in `RootDesk/MyDesk/Monster.mlua`) | Combat |
| `script.MonsterAttack` | Periodic attack loop (in `RootDesk/MyDesk/MonsterAttack.mlua`) | Combat |

> **`script.*` requirement** — the matching `.mlua` files **must already exist** in `RootDesk/MyDesk/` before refresh. The default workspace ships them; if you cleaned them out, do not list `script.Monster` / `script.MonsterAttack` in `Components` ([model.md §2.2 step 3 caveat](model.md)).

---

## 3. ActionSheet — Lowercase Action Keys (CRITICAL)

`StateAnimationComponent.ActionSheet` is a `MODSyncDictionary<string,string>` mapping **lowercase action name → animation clip RUID**:

```json
{
  "stand":  "<idle animationclip RUID>",
  "move":   "<walk animationclip RUID>",
  "jump":   "<jump animationclip RUID>",
  "attack": "<attack animationclip RUID>",
  "hit":    "<hit animationclip RUID>",
  "die":    "<die animationclip RUID>"
}
```

### Mapping from resource-pack `rel_path` / `action`

When `msw-search` returns a resource pack like:

```json
{
  "elements": [
    { "ruid": "...", "action": "stand",   "type": "animationclip" },
    { "ruid": "...", "action": "move",    "type": "animationclip" },
    { "ruid": "...", "action": "attack1", "type": "animationclip" },
    { "ruid": "...", "action": "hit1",    "type": "animationclip" },
    { "ruid": "...", "action": "die1",    "type": "animationclip" },
    { "ruid": "...", "action": "jump",    "type": "animationclip" }
  ]
}
```

map to the ActionSheet keys as follows:

| Resource-pack `action` | ActionSheet key |
|------------------------|-----------------|
| `stand` | `stand` |
| `move` | `move` |
| `jump` | `jump` |
| `attack`, `attack1`, `attack2`, … | `attack` (use `attack1` if multiple variants) |
| `hit`, `hit1`, `hit2`, … | `hit` |
| `die`, `die1` | `die` |

> If a pack lacks an action (e.g. no `jump` or no `attack`), **omit the key**. A missing key is fine; the component just won't switch animation for that state.

### Default sprite vs. ActionSheet

`SpriteRendererComponent.SpriteRUID` is the **fallback animation** that plays before any state transition. Set it to the **`stand`** RUID — same as `ActionSheet.stand`. Otherwise the monster appears with a placeholder (or invisible) until something triggers a state change.

---

## 4. Verbatim `Values` Block — What to Copy

Direct JSON authoring of `Values` requires the exact `ValueType` assembly strings. The full set the Maker emits is in [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model). The most error-prone entries:

### 4.1 ActionSheet (StateAnimationComponent) — `MODSyncDictionary`

```json
{
  "TargetType": "MOD.Core.StateAnimationComponent",
  "Name": "ActionSheet",
  "ValueType": {
    "$type": "MODNativeType",
    "type": "MOD.Core.MODSyncDictionary`2[[System.String, mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089],[System.String, mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089]], MOD.Core, Version=26.5.0.0, Culture=neutral, PublicKeyToken=null"
  },
  "Value": {
    "$type": "MOD.Core.MODSyncDictionary`2[[System.String, mscorlib],[System.String, mscorlib]], MOD.Core",
    "stand":  "<RUID>",
    "move":   "<RUID>",
    "attack": "<RUID>",
    "hit":    "<RUID>",
    "die":    "<RUID>",
    "jump":   "<RUID>"
  }
}
```

The `$type` string inside `Value` is **shorter** than the one inside `ValueType.type` (no Version / Culture / PublicKeyToken). Both forms are required exactly as shown.

### 4.2 SpriteRendererComponent — Required overrides

```json
{ "TargetType": "MOD.Core.SpriteRendererComponent", "Name": "SpriteRUID",     "Value": "<stand RUID>"   }
{ "TargetType": "MOD.Core.SpriteRendererComponent", "Name": "SortingLayer",   "Value": "MapLayer0"      }
{ "TargetType": "MOD.Core.SpriteRendererComponent", "Name": "OrderInLayer",   "Value": 2                }
```

| Field | Default that breaks | Required |
|-------|---------------------|----------|
| `SortingLayer` | `"Default"` (renders behind tiles) | `"MapLayer0"` |
| `OrderInLayer` | `0` | `2` (above map deco) |

### 4.3 HitComponent — Required overrides

```json
{ "TargetType": "MOD.Core.HitComponent", "Name": "BoxSize",       "Value": { "x": 0.67, "y": 1.42 } }
{ "TargetType": "MOD.Core.HitComponent", "Name": "ColliderOffset","Value": { "x": -0.005, "y": 0.71 } }
{ "TargetType": "MOD.Core.HitComponent", "Name": "CollisionGroup","Value": { "$type": "MOD.Core.Physics.CollisionGroup, MOD.Core", "Id": "8992acd1e8cd45838db6f10a7b41df09" } }
{ "TargetType": "MOD.Core.HitComponent", "Name": "IsLegacy",      "Value": false }
```

- `BoxSize` / `ColliderOffset` are tuned to a typical 60–80 px sprite. Resize to fit your monster.
- The `CollisionGroup.Id` `8992acd1e8cd45838db6f10a7b41df09` is the project's standard **Monster** group (declared in `Global/CollisionGroupSet.collisiongroupset`). Players target this group via `CollisionGroups.Monster`. Do not invent a new id.
- `IsLegacy: false` switches HitComponent to the new system that supports rotation, scale, and `ColliderType`.

### 4.4 AIChaseComponent / AIWanderComponent — `IsLegacy: false`

```json
{ "TargetType": "MOD.Core.AIChaseComponent", "Name": "IsLegacy", "Value": false }
```

The legacy AI behavior tree is deprecated. The deprecation warning (`LWA-3019`) appears at runtime if this is left at default `true`.

### 4.5 MovementComponent — Tunables

```json
{ "TargetType": "MOD.Core.MovementComponent", "Name": "InputSpeed", "Value": 1.5 }
{ "TargetType": "MOD.Core.MovementComponent", "Name": "JumpForce",  "Value": 6.0 }
```

`InputSpeed` is **world units / second**. `1.5` ≈ a casual walk; `3.0` ≈ a brisk run. `JumpForce = 6.0` clears one foothold gap.

---

## 5. Two Authoring Paths

### Path A — Dedicated `.model` (recommended)

1. **Read** [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model).
2. Save as `RootDesk/MyDesk/Models/{MonsterName}.model`. (Create the `Models/` folder + paired `.directory` file if it doesn't exist; see [model.md §2.2 step 4](model.md).)
3. Replace the 3 identifiers (`EntryKey`, `Id`, `Name`) — see [model.md §2.2 step 2](model.md). Either keep the UUID-form id or use lowercase shorthand.
4. Replace the 6 `ActionSheet` RUIDs and the `SpriteRUID` with your monster's animations.
5. Resize `HitComponent.BoxSize` / `ColliderOffset` to fit the sprite.
6. Place an instance in `.map` via `modelId` reference — see [entity.md "Model-referenced entity"](entity.md).
7. `refresh`.

### Path B — Inline entity in `.map` (for one-off / quick test)

Inline all 11 components directly in the map entity's `@components`. **Do not mix this with `modelId`** — partial overrides on a model-referenced entity reset adjacent fields and produce `LEA-3046 InternalError` at runtime.

```json
{
  "id": "<uuid>",
  "path": "/maps/map01/<MonsterName>",
  "componentNames": "MOD.Core.TransformComponent,MOD.Core.SpriteRendererComponent,MOD.Core.StateAnimationComponent,MOD.Core.StateComponent,MOD.Core.RigidbodyComponent,MOD.Core.MovementComponent,MOD.Core.AIChaseComponent,MOD.Core.HitComponent,MOD.Core.DamageSkinSpawnerComponent,script.Monster,script.MonsterAttack",
  "jsonString": {
    "name": "<MonsterName>",
    "modelId": null,
    "@components": [
      { "@type": "MOD.Core.TransformComponent", "Position": { "x": 0.0, "y": 0.4, "z": 0.0 }, ... },
      { "@type": "MOD.Core.SpriteRendererComponent", "SpriteRUID": "<stand>", "SortingLayer": "MapLayer0", "OrderInLayer": 2, ... },
      { "@type": "MOD.Core.StateAnimationComponent", "ActionSheet": { "stand": "...", "move": "...", "attack": "...", "hit": "...", "die": "...", "jump": "..." } },
      { "@type": "MOD.Core.StateComponent" },
      { "@type": "MOD.Core.RigidbodyComponent" },
      { "@type": "MOD.Core.MovementComponent", "InputSpeed": 1.5, "JumpForce": 6.0 },
      { "@type": "MOD.Core.AIChaseComponent", "IsLegacy": false },
      { "@type": "MOD.Core.HitComponent", "IsLegacy": false, "BoxSize": { "x": 0.67, "y": 1.42 }, "ColliderOffset": { "x": -0.005, "y": 0.71 }, "CollisionGroup": { "$type": "MOD.Core.Physics.CollisionGroup, MOD.Core", "Id": "8992acd1e8cd45838db6f10a7b41df09" } },
      { "@type": "MOD.Core.DamageSkinSpawnerComponent" },
      { "@type": "script.Monster" },
      { "@type": "script.MonsterAttack" }
    ]
  }
}
```

> Inline `@components` use **plain JSON** (no `ValueType` wrapper). The `MODSyncDictionary` dictionary on `ActionSheet` does not need `$type` here — that wrapper is only required in `.model` `Values`.

---

## 6. AI Selection — Chase vs. Wander vs. Static

| Want | Component | Notes |
|------|-----------|-------|
| Chases nearest player within range | `AIChaseComponent` | Set `DetectionRange` (default ~5). `IsChaseNearPlayer = true` (default). |
| Patrols a foothold, flips at edges | `AIWanderComponent` | No setup needed; the BT auto-detects foothold ends. Falls off footholds without ledge handling — see `PredictFootholdEnd` in [platform.md §9.1](platform.md). |
| Stays put, attacks anything in range | Drop both `AIChaseComponent` / `AIWanderComponent` | Keep `script.MonsterAttack` for the attack loop. |

**Both `AIChaseComponent` and `AIWanderComponent` auto-add `StateComponent` if it's missing** — you can drop the explicit entry, but listing it is harmless.

---

## 7. HP / Damage Tuning (`script.Monster`)

`Monster.mlua` (in `RootDesk/MyDesk/`) ships these `@Sync` properties — override per-instance via `Values` with `TargetType: "script.Monster"`:

| Property | Default | Purpose |
|----------|--------:|---------|
| `MaxHp` | `100` | Initial HP cap (set in `OnBeginPlay`) |
| `Hp` | `0` | Current HP (set to `MaxHp` on play) |
| `RespawnOn` | `false` | If `true`, respawns after `RespawnDelay`s; otherwise `Destroy` on death |
| `RespawnDelay` | `5` | Seconds before respawn |
| `DestroyDelay` | `0.6` | Seconds the corpse stays (plays the `die` animation) |
| `IsDead` | `false` | Read-only flag set by the dead handler |

`PlayerAttack.mlua` ships with `CalcDamage = 50`. So a 100-HP monster dies in 2 hits. To make a tougher monster, raise `MaxHp`:

```json
{
  "TargetType": "script.Monster",
  "Name": "MaxHp",
  "ValueType": { "$type": "MODNativeType", "type": "System.Double, mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089" },
  "Value": 500.0
}
```

(For stand-and-respawn monsters, also set `RespawnOn` to `true`.)

---

## 8. Spawn Position (MapleTile)

`Position.y` must be **above** a foothold so the monster falls and lands. The foothold height in the canonical 0-row map is `y ≈ -0.04`; spawning at `y = 0.4` lands cleanly.

| Foothold y | Safe spawn y | Note |
|-----------:|-------------:|------|
| `-0.04` | `0.4` | Standard ground row |
| Any | `foothold.y + 0.4` | Half a sprite height clearance |

Spawning **below** any foothold = the monster falls forever and the AI emits errors.

---

## 9. Post-Build Verification

1. `refresh` — check `logs` (build category) for schema errors.
2. `play` — check `logs` (runtime) for:
   - `[LWA-3019] ... Legacy` → an `IsLegacy` was missed.
   - `[LEA-3046] InternalError` not your fault unless the count grows when the monster is enabled vs. disabled (toggle `enable: false` on the entity to isolate).
   - `monster change state to DEAD` log — fires every time HP drops to 0; expected once per death.
3. Watch the monster on screen — does it walk, idle-animate, react to player attacks, play hit / die?
4. `stop` to return to edit mode.

---

## 10. Cross-References

| Doc | Why |
|-----|-----|
| [model.md](model.md) | Generic `.model` authoring rules, `ValueType` details, child entities |
| [model/model-schema.md](model/model-schema.md) | Full `.model` JSON schema |
| [entity.md](entity.md) | Placing a monster in a `.map` (inline vs. `modelId`) |
| [entity/map-schema.md](entity/map-schema.md) | `.map` JSON schema, model-referenced entities |
| [platform.md §9.1](platform.md) | MapleTile physics, `PredictFootholdEnd`, foothold AI patterns |
| `msw-search` | Find monster animation packs (`POST /v3/search/resources` with `categories: ["mob","npc"]`) |
| `msw-scripting` | Authoring custom monster behaviors (`script.Monster` overrides, events) |
| [`../models/MonsterCanonical.model`](../models/MonsterCanonical.model) | Verbatim copy source (paste, then swap RUIDs) |
