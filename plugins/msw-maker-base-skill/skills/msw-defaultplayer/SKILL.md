---
name: msw-defaultplayer
description: "MSW DefaultPlayer (character) management. Use the msw-general ModelBuilder to inspect/patch DefaultPlayer.model and Player.model, add/remove components, configure movement speed / jump force / HP / camera, and per-map-mode movement components. Use for DefaultPlayer model, player components, movement speed, jump force, HP, camera, physics. Keywords: player, DefaultPlayer, speed, jump, HP, camera, gravity, revive, respawn, character."
---

# MSW DefaultPlayer

Use the `msw-general` ModelBuilder to inspect/patch the DefaultPlayer model file, manage components, and configure movement / physics / HP / camera.

> For **costume / avatar equipment**, see the `msw-avatar` skill. Costumes apply not only to DefaultPlayer but to any entity, so they live in a separate skill.

---

## DefaultPlayer overview

### What is DefaultPlayer?
The **player character model** provided by default in the MapleStory Worlds Maker workspace.
- When any user enters a world, a player entity is created based on this model.
- The model ID to use is specified by the `PlayerUri` property of `DefaultUserEnterLeaveLogic`.

### File location and structure
DefaultPlayer is made up of **two .model files**:

| File | Path | Role |
|------|------|------|
| **Player.model** | `./Global/Player.model` | Base model. Defines the Components list and Properties links |
| **DefaultPlayer.model** | `./Global/DefaultPlayer.model` | Inherits Player (`BaseModelId: "player"`). Overrides Values |

> **Important**: both files are located in `./Global/`. Custom script files are created under `./RootDesk/MyDesk/`.

### DefaultPlayer is patched through ModelBuilder
DefaultPlayer is managed through `skills/msw-general/scripts/model/msw_model_builder.cjs`, not raw JSON edits.
- Change a property value: `ModelBuilder.read("./Global/DefaultPlayer.model").value(...)`
- Add/remove a component: `component()` / `removeComponent()`
- Check the base component list: `ModelBuilder.snapshot("./Global/Player.model")`

---

## File structure detail

### Player.model (base)

```
Path: ./Global/Player.model
EntryKey: model://player
```

- `Components`: the full list of default components on the player (MOD.Core.* native components)
- `Properties`: model property → component property link definitions (properties editable from the inspector)
- `Values`: empty (defaults are provided by the engine)

### DefaultPlayer.model (override)

```
Path: ./Global/DefaultPlayer.model
EntryKey: model://defaultplayer
BaseModelId: "player"
```

- `Components`: only the components **added** on DefaultPlayer (e.g. `script.PlayerHit`, `script.PlayerAttack`)
- `Values`: the array of overridden setting values

---

## DefaultPlayer default component list

Native components inherited from Player.model:

| Component | Role |
|-----------|------|
| **TransformComponent** | Position, rotation, scale |
| **MovementComponent** | Movement speed and jump force control |
| **RigidbodyComponent** | Physics (gravity, footholds), MapleStory-style movement |
| **KinematicbodyComponent** | Up/down/left/right movement on a RectTileMap |
| **SideviewbodyComponent** | Side-scrolling movement on a SideViewRectTileMap |
| **StateComponent** | State machine (Walk, Jump, Dead, etc.) |
| **AvatarRendererComponent** | Avatar rendering, color, emotion |
| **AvatarStateAnimationComponent** | State → avatar animation mapping |
| **CostumeManagerComponent** | Equipment / costume management → **see the `msw-avatar` skill for details** |
| **CameraComponent** | Camera tracking settings |
| **PlayerControllerComponent** | Input-to-action mapping, condition handling |
| **PlayerComponent** | HP, death/revive, PVP, map travel |
| **ChatBalloonComponent** | Chat balloon |
| **NameTagComponent** | Name tag |
| **DamageSkinSettingComponent** | Damage skin |
| **DamageSkinSpawnerComponent** | Damage skin spawn |
| **HitEffectSpawnerComponent** | Hit effect spawn |
| **TriggerComponent** | Collision detection |
| **InventoryComponent** | Inventory |

Script components added in DefaultPlayer.model:

| Component | Role |
|-----------|------|
| **script.PlayerHit** | Player hit-handling logic |
| **script.PlayerAttack** | Player attack logic |

---

## Quick reference — key components

| Component | Role | Key properties / methods |
|-----------|------|--------------------------|
| **PlayerComponent** | HP, death/revive, PVP, map travel | `Hp`, `MaxHp`, `PVPMode`, `RespawnDuration`, `RespawnPosition`, `UserId`, `IsDead()`, `ProcessDead()`, `ProcessRevive()`, `MoveToMapPosition()` |
| **PlayerControllerComponent** | Input → action mapping, conditional control | `SetActionKey(key, actionName)`, `ActionAttack()`, `ActionJump()`, `LookDirectionX` |
| **MovementComponent** | High-level movement speed / jump interface | `InputSpeed` (default 1.0), `JumpForce` (default 1), `Jump()`, `Stop()` |
| **RigidbodyComponent** | Maple side-view physics (gravity / footholds) | `Gravity`, `WalkAcceleration`, `WalkSpeed`, `AddForce()`, `IsOnGround()` |
| **KinematicbodyComponent** | Top-view up/down/left/right movement on RectTile | (RectTile map-mode only) |
| **SideviewbodyComponent** | Side-view on SideViewRectTile | (SideViewRectTile map-mode only) |
| **AvatarRendererComponent** | Avatar rendering / color / emotion | `SetColor()`, `SetAlpha()`, `PlayEmotion()`, `PlayRate` |
| **StateComponent** | State machine (Walk/Jump/Dead) | `CurrentStateName`, `ChangeState()`, DeadEvent/ReviveEvent |
| **NameTagComponent** | Name tag | `Name`, `FontSize`, `FontColor`, `NameTagRUID` |
| **ChatBalloonComponent** | Chat balloon | `Message`, `ChatModeEnabled`, `ShowDuration` |
| **CameraComponent** | Camera tracking | `DeadZone`, `SoftZone`, `Damping`, `ScreenOffset` |
| **TriggerComponent** | Collision detection | `BoxSize`, `Offset`, CollisionGroup |

---

## DefaultPlayer Values structure

Format of each entry in the `Values` array of `DefaultPlayer.model`:

```json
{
  "TargetType": "<component name> or null",
  "Name": "<property name>",
  "ValueType": {
    "$type": "MODNativeType",
    "type": "<type info>"
  },
  "Value": <value>
}
```

### TargetType rules
- `null`: a model property defined in Player.model's Properties (linked through Properties to the actual component property)
- `"MOD.Core.<ComponentName>"`: directly override a property on a specific native component
- `"script.<ScriptName>"`: a property of a custom script component

### Model properties (TargetType: null)

Mapped to actual component properties through the links defined in Player.model's Properties.

| Model property name | Source component.property | Description | Default |
|---------------------|---------------------------|-------------|---------|
| speed | MovementComponent.InputSpeed | Movement speed | 1.0 |
| jumpForce | MovementComponent.JumpForce | Jump height | 1.0 |
| walkAcceleration | RigidbodyComponent.WalkAcceleration | Acceleration / deceleration | 1.0 |
| gravity | RigidbodyComponent.Gravity | Gravity | 1.0 |
| cameraDeadZone | CameraComponent.DeadZone | Camera dead zone | `{x: 0.052, y: 0.08}` |
| cameraSoftZone | CameraComponent.SoftZone | Camera soft zone | `{x: 0.268, y: 0.7}` |
| cameraDamping | CameraComponent.Damping | Camera smooth-follow | `{x: 2.5, y: 3.9}` |
| cameraScreen | CameraComponent.ScreenOffset | Dead-zone center point | `{x: 0.5, y: 0.655}` |
| cameraDutch | CameraComponent.DutchAngle | Camera rotation | 0.0 |
| cameraOffset | CameraComponent.CameraOffset | Camera position offset | `{x: 0.0, y: 0.0}` |
| nameTag | NameTagComponent.Name | Name tag | `""` |
| damageSkinId | DamageSkinSettingComponent.DamageSkinId | Damage skin type | DataRef |
| damageDelayPerAttack | DamageSkinSettingComponent.DelayPerAttack | Damage delay | 0.05 |
| triggerBodyBoxSize | TriggerComponent.BoxSize | Collision detection area size | `{x: 0.66, y: 0.7}` |
| triggerBodyBoxOffset | TriggerComponent.BoxOffset | Collision detection area offset | `{x: 0.0, y: 0.35}` |
| triggerBodyColliderOffset | TriggerComponent.ColliderOffset | Collider offset | `{x: 0.0, y: 0.35}` |
| maxHp | PlayerComponent.MaxHp | Max HP | 1000 |

### Direct component override (TargetType: specific component)

Values that directly override a component property rather than going through a model-property link:

| TargetType | Name | Description | Default |
|------------|------|-------------|---------|
| MOD.Core.CameraComponent | ZoomRatioMax | Camera max zoom ratio | 500.0 |
| MOD.Core.MovementComponent | JumpForce | Jump force (direct override) | 1.0 |
| MOD.Core.MovementComponent | InputSpeed | Movement speed (direct override) | 1.0 |
| script.PlayerHit | CollisionGroup | Hit collision group | CollisionGroup ID |
| script.PlayerHit | BoxSize | Hit collision area size | `{x: 0.45, y: 0.7}` |
| script.PlayerHit | ColliderOffset | Hit collision offset | `{x: 0.0, y: 0.35}` |

---

## Movement components per map mode

> See `msw-general/references/platform.md §4` for the TileMapMode↔Body mapping table. Depending on the map mode, one of RigidbodyComponent / KinematicbodyComponent / SideviewbodyComponent is active.

---

## Identifying a player (for script reference)
- `entity.PlayerComponent ~= nil` → whether the entity is a player
- `_UserService.LocalPlayer` → my player entity (client-only)
- `_UserService:GetUserEntityByUserId(userId)` → player entity for a specific user

### Key services at a glance (for script reference)
| Service | Role | Key API |
|---------|------|---------|
| **_UserService** | User management, enter/leave | `LocalPlayer`, `UserEntities`, `GetUserEntityByUserId()`, UserEnterEvent/UserLeaveEvent |
| **_TeleportService** | Teleport / map travel | `TeleportToEntity()`, `TeleportToMapPosition()`, `WarpUserToWorldAsync()` |
| **_CameraService** | Camera control | `SwitchCameraTo()`, `ZoomTo()`, `ZoomReset()` |
| **DefaultUserEnterLeaveLogic** | User enter/leave logic | `PlayerUri` (player model ID), `StartPoint` (starting map) |

---

## How to modify DefaultPlayer

### Changing property values (Values)

Load `./Global/DefaultPlayer.model` with `ModelBuilder.read()`, then update values with `value()`.

**Example: set movement speed to 2.0**

```javascript
const { ModelBuilder } = require("../msw-general/scripts/model/msw_model_builder.cjs");

const b = ModelBuilder.read("./Global/DefaultPlayer.model");

b.value(null, "speed", 2.0, "float")
  .value("MovementComponent", "InputSpeed", 2.0, "float")
  .write("./Global/DefaultPlayer.model");
```

> **Note**: both the model property (`TargetType: null`, `Name: "speed"`) and the direct component override (`TargetType: "MOD.Core.MovementComponent"`, `Name: "InputSpeed"`) can exist. Set both consistently through `value()`.

**Example: jump force 1.5 + HP 2000**

```javascript
const b = ModelBuilder.read("./Global/DefaultPlayer.model");

b.value(null, "jumpForce", 1.5, "float")
  .value("MovementComponent", "JumpForce", 1.5, "float")
  .value(null, "maxHp", 2000, "int")
  .write("./Global/DefaultPlayer.model");
```

### Adding a new Values entry

Use `ModelBuilder.value(targetType, name, value, typeKey)`. The builder generates the `ValueType` descriptor; do not hand-write type strings.

Common `typeKey` values: `bool`, `int`, `float`, `double`, `string`, `vector2`, `vector3`, `data_ref`, `collision_group`.

### Adding a component

Use `component()` on `./Global/DefaultPlayer.model`.

**Adding a custom script component**:
```javascript
const b = ModelBuilder.read("./Global/DefaultPlayer.model");

b.component("script.MyCustomComponent")
  .write("./Global/DefaultPlayer.model");
```

> Custom scripts (.mlua) must be created under `./RootDesk/MyDesk/`. Write the script first, Maker `refresh`, then add `"script.<ScriptName>"` with the builder.

**Adding a native component** (e.g. SpriteRendererComponent):
```javascript
const b = ModelBuilder.read("./Global/DefaultPlayer.model");

b.component("SpriteRendererComponent")
  .write("./Global/DefaultPlayer.model");
```

### Removing a component

Use `removeComponent()` on `DefaultPlayer.model`. Related `Values` entries are removed by the builder.

> **Caution**: components inherited from Player.model (the base) are not in DefaultPlayer.model's Components. Removing base components requires patching `Player.model` through `ModelBuilder`, and is generally not recommended.

---

## Pitfalls (Common Pitfalls)

Common pitfalls when **adding to Components** and **changing Values** in DefaultPlayer.model.

### Component list pitfalls

| # | Pitfall | Symptom | Resolution |
|---|---------|---------|------------|
| C1 | A `script.XXX` you added disappears or doesn't apply | A script component that isn't registered in the matching `.codeblock` metadata in the same directory is silently dropped at load time; if saved in that state, it's lost permanently | After writing the `.mlua`, use **Maker Refresh** so the `.codeblock` is auto-generated. Or attach at runtime right after spawn via `entity:AddComponent("Name")` |
| C2 | Duplicate-adding a native component already on Player.model (e.g. `MOD.Core.MovementComponent`) | Only a duplicate-component warning is emitted, not blocked → workspace warnings accumulate, behavior becomes non-deterministic | Check the base component list (§65-89) before adding. If it's already there, just change settings via Values |
| C3 | Removing `script.PlayerHit` / `script.PlayerAttack` | These are the only extra scripts DefaultPlayer ships with. Removing them eliminates hit immunity / attack logic | If the goal is to disable, toggle the logic inside the script, or use Enable=false in Values |
| C4 | Disabling `AvatarRendererComponent` and adding `SpriteRendererComponent` (or other renderer swap) | If Avatar and Sprite renderers are active at the same time, you get z-fighting / costumes not applied | Only add Sprite after disabling Avatar (see the pattern at §395) |

### Values change pitfall — only `jumpForce` / `speed` need extra care

Most Values entries are in the `TargetType=null` (alias) form and can be set through `ModelBuilder.value(null, ...)`. **Only the two fields below are exceptions** — both an alias and a native entry (`TargetType="MOD.Core.MovementComponent"`) exist at the same time:

| Field | alias entry | native entry |
|-------|-------------|--------------|
| Jump force | `jumpForce` (`TargetType=null`) | `JumpForce` (`TargetType="MOD.Core.MovementComponent"`) |
| Movement speed | `speed` (`TargetType=null`) | `InputSpeed` (`TargetType="MOD.Core.MovementComponent"`) |

On entity spawn, Values are applied in array order and both write to the same native field; **the native entry appears later in the array, so the native value wins**.

- Wrong: editing only the alias side (`jumpForce` / `speed`) → overwritten by the later native entry and ignored
- Right: **edit both consistently to the same value**, or edit only the native side (`JumpForce` / `InputSpeed`)

Other alias-only entries (`walkAcceleration`, `gravity`, camera-related except `cameraDeadZone`, `nameTag`, `damageSkinId`, `damageDelayPerAttack`, `triggerBody*`, `maxHp`, etc.) can be modified through the alias as-is.

---

## Hiding DefaultPlayer

DefaultPlayer's components are inherited from the base model, so they **cannot be deleted**. Disabling them via `Enable=false` is the only option.

### Component keep/disable classification

| Component | Fully hide | Hide avatar only | Notes |
|-----------|:----------:|:----------------:|-------|
| TransformComponent | **keep** | **keep** | Required |
| PlayerComponent | **keep** | **keep** | Required — disabling causes enter failures |
| StateComponent | **keep** | **keep** | Disabling causes other components to error |
| MovementComponent | **keep** | **keep** | Keep when movement is needed |
| CameraComponent | **keep** | **keep** | Keep when camera is needed |
| AvatarRendererComponent | **disable** | **disable** | Key — disabling this alone hides it |
| AvatarStateAnimationComponent | **disable** | **disable** | |
| CostumeManagerComponent | **disable** | **disable** | |
| PlayerControllerComponent | **disable** | keep | Depends on whether movement should be blocked |
| ChatBalloonComponent | **disable** | **disable** | |
| NameTagComponent | **disable** | **disable** | |
| DamageSkinSettingComponent | **disable** | **disable** | |
| DamageSkinSpawnerComponent | **disable** | **disable** | |
| HitComponent | **disable** | **disable** | |
| HitEffectSpawnerComponent | **disable** | **disable** | |
| TriggerComponent | **disable** | **disable** | |
| InventoryComponent | **disable** | **disable** | |
| RigidbodyComponent | **disable** | keep per map mode | When on a MapleTile map |
| SideviewbodyComponent | **disable** | keep per map mode | When on a SideViewRectTile map |
| KinematicbodyComponent | EnableShadow=false | EnableShadow=false | Removes the shadow only |

### Builder edit — add Enable=false to Values

Set the component values through `ModelBuilder.value()`. For components that don't yet have an Enable entry, the builder adds one.

```javascript
const { ModelBuilder } = require("../msw-general/scripts/model/msw_model_builder.cjs");

const b = ModelBuilder.read("./Global/DefaultPlayer.model");

b.enable("AvatarRendererComponent", false)
  .value("KinematicbodyComponent", "EnableShadow", false, "bool")
  .write("./Global/DefaultPlayer.model");
```

After saving, **Maker Refresh** is required.

---

## DefaultPlayer component extension patterns

- **Non-avatar player**: disable AvatarRendererComponent → add SpriteRendererComponent → set SpriteRUID.
- **Collision setup**: tweak ColliderType and CollisionGroup in TriggerComponent's Values.
- **SpawnLocation**: place a Special → SpawnLocation in the map (.map) file (revive position).

---

## Workflows

### Modifying basic player properties (movement speed, jump force, HP, etc.)
```
1. Load ./Global/DefaultPlayer.model with ModelBuilder.read()
2. Update values with value(targetType, name, value, typeKey)
3. If both the model property (TargetType: null) and the direct component override exist, set both consistently
4. write("./Global/DefaultPlayer.model")
```

### Adding a custom script to the player
```
1. Write a new .mlua script under ./RootDesk/MyDesk/ (see the msw-scripting skill)
2. Maker refresh so the script type is registered
3. Load ./Global/DefaultPlayer.model with ModelBuilder.read()
4. Add "script.<ScriptName>" with component()
5. If needed, add default property values for the script with value()
6. write("./Global/DefaultPlayer.model")
7. Request Maker Refresh
```

### Changing camera settings
```
1. Load ./Global/DefaultPlayer.model with ModelBuilder.read()
2. Set cameraDeadZone, cameraSoftZone, cameraDamping, cameraScreen, cameraDutch, cameraOffset with value()
3. write("./Global/DefaultPlayer.model")
```

---

## Boundaries and caveats

### In scope
- Inspect/patch the DefaultPlayer/Player model files through ModelBuilder
- Add/remove components through `component()` / `removeComponent()`
- Movement / physics / HP / camera settings through `value()`

### Out of scope
- Costume / avatar equipment → `msw-avatar` skill
- UI editor → .ui files under `./ui/` (dedicated skill)
- Map editing → .map files under `./map/` (dedicated skill, including NPC/monster spawn)
- General scripts / resources → each dedicated skill

### Constraints
1. **Careful with Global/**: DefaultPlayer.model and Player.model live in `./Global/`. This folder is reserved for engine default templates, so creating new files here is not recommended.
2. **Custom script location**: new script files must be created under `./RootDesk/MyDesk/`.
3. **Map mode caveat**: the active movement component differs depending on the map mode (MapleTile/RectTile/SideViewRectTile).
4. **ValueType correctness**: when adding a Values entry, use `ModelBuilder.value()` with an explicit `typeKey`; do not hand-write `ValueType`.
5. **Maker Refresh**: after adding/modifying scripts, Maker Refresh is required (.codeblock is auto-generated).
