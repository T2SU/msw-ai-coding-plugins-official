---
name: msw-scripting
description: "Authoring MSW scripts (.mlua) plus integrated playtest and debugging. Covers mlua syntax, annotations (@Component/@Logic/@ExecSpace/@Sync), lifecycle, exec spaces, property sync, event system, file workflow, build-log inspection, error classification, and the test/debug loop. Keywords: script, mlua, lua, Component, Logic, annotation, ExecSpace, Sync, event, play, test, debug, lifecycle."
---

# MSW Scripting (.mlua) — Framework + File Workflow + Playtest & Debugging

mlua is Lua-based, but it has MSW-specific annotations, a lifecycle, and an execution-space model.
General Lua knowledge alone will not produce working code. All work is done by **editing files in the workspace directly**,
and code is validated in the order **build logs → runtime logs**.

---

## 1. Core Principles (must follow)

### 1.1 Existing Script First

- **Before** creating a new `.mlua`, you must search under `./RootDesk/MyDesk/` for **an existing script with the same or similar purpose**.
- Use **glob/keyword search (file names, symbols, comment keywords)** as your discovery method.
- Duplicate implementations raise maintenance cost and conflict risk. **Extending (modifying an existing file) is always the first choice.**

### 1.2 Folder Structure for New Scripts — Never Dump Files Flat

When extending an existing script is not possible and a new `.mlua` must be created, **organize it under a feature/category subfolder**. Do **not** drop scripts directly into `./RootDesk/MyDesk/`.

**Required path shape**: `./RootDesk/MyDesk/<FeatureFolder>/<ScriptName>.mlua` (or a deeper nested path when the feature has sub-systems).

- **Reuse an existing subfolder** if one already fits (e.g., `Player/`, `UI/`, `Combat/`, `Tower/`, `Inventory/`). Run a glob/list on `./RootDesk/MyDesk/` first to see what's already there.
- **If no fitting subfolder exists, create one** named for the feature/system (PascalCase, matching the surrounding project's casing). Examples:
  - `./RootDesk/MyDesk/Inventory/InventoryManager.mlua`
  - `./RootDesk/MyDesk/Combat/MeleeAttackComponent.mlua`
  - `./RootDesk/MyDesk/UI/Popup/RewardPopupLogic.mlua`
- **Group related scripts together** — Component, Logic, custom Event, and helper Struct for the same feature should sit in the same folder so the system is discoverable as a unit.
- **A single-file feature still gets its own folder.** Even one script belongs in `<FeatureFolder>/`, not at the root, so future additions have a home.
- **Naming**: folder = feature noun (`TowerDefense/`, `Quest/`); file = role-specific name reusing the feature noun where helpful (`TowerSpawnerLogic.mlua`, `QuestTrackerComponent.mlua`).
- **Do not** create generic catch-all folders like `Scripts/`, `Misc/`, `Common/`, `New/`, `temp/`. Pick a real feature name. If you genuinely have a project-wide utility, place it under a specific utility folder such as `Util/` or `Shared/` only if that pattern already exists in the project.

> **Why**: a flat `MyDesk/` quickly becomes unsearchable and makes the "search before creating" rule (1.1) impossible to follow. A consistent feature-folder layout is what lets future agents (and humans) discover what already exists.

### 1.3 Never Guess APIs or Syntax — Verify Before Writing Code

If you guess an MSW API name, parameter, or return type, **the call will silently fail at runtime**. Before writing code, verify the spec using one of the methods below.

**Method 1 — Read the `.d.mlua` definition file directly** (exact signatures):
The full engine API is defined as `.d.mlua` files under `./Environment/NativeScripts/`:

| Folder | Contents | Files | Example |
|------|------|:-------:|------|
| `Component/` | Engine components | 104 | `TransformComponent.d.mlua` |
| `Service/` | System services | 46 | `SpawnService.d.mlua` |
| `Event/` | Event types | 202 | `HitEvent.d.mlua` |
| `Logic/` | Built-in logic | 9 | `TweenLogic.d.mlua` |
| `Enum/` | Enumerations | 118 | `BodyType.d.mlua` |
| `Misc/` | Utility types | 135 | `Vector2.d.mlua` |

```
You know the API name → Read ./Environment/NativeScripts/{folder}/{name}.d.mlua
You don't know the name → Grep keywords in the NativeScripts folder
```

**Method 2 — `msw-search` skill** (detailed descriptions, examples, implementation guides):
When `.d.mlua` only contains signatures and lacks explanation, search for **parameter semantics, code examples, related APIs, and implementation guides**.

> **Required order**: confirm signature in `.d.mlua` → (if needed) look up details via `msw-search` → write code → LSP diagnose runs automatically (PostToolUse hook).

### 1.4 Lint (LSP diagnostics) — required after every script change

- Whenever you **create or modify** a `.mlua` file, the `mlua-diagnose` hook runs LSP `diagnose` automatically and feeds errors back.
- Repeat fix → re-edit **until error-severity diagnostics reach zero**.

### 1.5 `.codeblock` files

- `.codeblock` files are **generated automatically by Maker Refresh**.
- The agent **must never create, edit, or delete them manually**.

### 1.6 Refresh Timing

- After **creating, modifying, renaming, or deleting** a `.mlua`, you **must** call Maker MCP **`refresh`**.
- **`refresh` cannot run during play mode** — first call `stop` to return to edit mode.

### 1.7 MSW ≠ Unity — Do Not Reason From Intuition

MSW uses Lua + ECS + an MSW-specific execution-space model. **Applying Unity or generic game-engine patterns directly will compile fine but silently fail at runtime.** Common misconceptions:

| Unity / generic intuition | MSW reality | Correct path | Source |
|---|---|---|---|
| `MonoBehaviour.gameObject` / `this.transform` to access the owning entity | `@Logic` has no `self.Entity` (that is `@Component`-only) | Inject via `property Entity x = "uuid"` on the Logic, or use `_EntityService:GetEntityByPath(...)` | `Logic.d.mlua`, `Component.d.mlua:16` |
| `OnMouseDown` / `BoxCollider2D` is enough to receive clicks/touches | Physics colliders and Rigidbody **do not emit `TouchEvent`** | World: `TouchReceiveComponent` / UI: `ButtonComponent` or `UITouchReceiveComponent` | `EmitTouchEvent` in `TouchReceiveComponent.d.mlua`, §10 |
| `OnCollisionEnter` + Rigidbody for collision callbacks | Entity-to-entity collisions use a **separate** `TriggerComponent` + `TriggerEnter/Leave/Stay` | Attach `TriggerComponent`, then `ConnectEvent(TriggerEnterEvent, ...)` | `TriggerComponent.d.mlua:56-62` |
| UI `interactable` / `enabled` / `text` / `color` field names | UI component fields are MSW-specific; `ButtonComponent.Interactable` does not exist | Before every UI component field read/write, check [`msw-ui-system/references/component-api.md`](../msw-ui-system/references/component-api.md). Typical mappings: button disable -> `Enable`; text string -> `Text`; text color -> `FontColor`; sprite tint -> `Color`. | [`msw-ui-system/references/component-api.md`](../msw-ui-system/references/component-api.md) |
| Attach multiple Rigidbody/Collider freely | **One Body per map type** (MapleTile→Rigidbody, RectTile→Kinematicbody, SideViewRectTile→Sideviewbody) | Custom models include only the Body that matches the map type | [`msw-general/references/platform.md`](../msw-general/references/platform.md) §4. `DefaultPlayer` has all three with engine auto-activation. |
| Reference/modify UI objects from server code | **UI entities exist only on the client** — referencing them from server `@ExecSpace` returns nil | Server→UI must go through an `@ExecSpace("Client")` RPC | [`msw-ui-system/references/runtime-patterns.md`](../msw-ui-system/references/runtime-patterns.md) *Runtime UI Caveats §2-3* |
| Host a Server RPC on a UI-attached `@Component` (`@ExecSpace("Server")` / `"ServerOnly"` / `"Multicast"` declared on a Component sitting on a UI entity) | UI entities are client-only, so those methods **never run on the server**. Runtime emits `'<entity>' is client only. '<component>.<method>' doesn't work normally.` and the RPC silently no-ops; `@Sync` properties on the same component also do not propagate. Build/static analysis passes, so the failure surfaces only as a single runtime log line | Put server-side callables on a non-UI `@Logic` or a map-entity `@Component` (e.g. `_GameLogic:DoServerWork(...)`); the UI's `ClientOnly` handler calls that — never the other direction | [`msw-ui-system/references/runtime-patterns.md`](../msw-ui-system/references/runtime-patterns.md) *Runtime UI Caveats §1* |
| `Instantiate(prefab)` callable anywhere | `_SpawnService:SpawnByModelId(id, name, pos, parent)` — **`parent` is required**, server-only | Inside `ServerOnly`/`Server` RPC, pass `CurrentMap` as parent | `SpawnService.d.mlua:22` (no default for parent) |
| `static` classes / hand-rolled singletons | `@Logic` is itself an engine singleton | Call from other scripts as `_ScriptName:Method()` (e.g., `_TweenLogic`, `_UtilLogic`, `_ScreenMessageLogic`) — never instantiate | §3.2 |

**Rule**: any time you catch yourself thinking "Unity does it this way, so MSW probably does too", stop and verify against `Environment/NativeScripts/*.d.mlua` before writing code.

### 1.8 Builder Protocol Preflight — **MUST**

If this turn **creates or modifies** any `.map` / `.model` / `.ui` file — even when it looks like you are only touching `.mlua`, but you are writing spawn / entity-placement / model-authoring / UI-authoring code — **you must `Read` [`../msw-general/references/builder-protocol.md`](../msw-general/references/builder-protocol.md) first** (no `offset` / `limit`).

The call protocol for the three builders (`MapBuilder` / `ModelBuilder` / `UIBuilder`) is consolidated in one document. **Knowing only one builder and then invoking another bypasses that builder's write-side contract** (`componentNames` sync, value `typeKey` metadata, write-time auto-lint, child entity invariants, `placeModel`'s component mirroring) in full. The three builders are interlocked through cross-flow (model authoring → map placement → ui binding is one continuous flow).

Triggers are intentionally broad — `Read` builder-protocol.md at the start of the turn whenever any of these match:

- `_SpawnService` / `SpawnByModelId` / `SpawnByEntity` / any code that creates or places new entities (entails a MapBuilder or ModelBuilder call)
- `.map` / `.model` / `.ui` file changes (new or existing)
- `require` or invocation of `msw_map_builder.cjs` / `msw_model_builder.cjs` / `msw_ui_builder.cjs`
- Any request shaped like "entity-shaped" work — new monster / NPC / projectile / map object / UI popup, etc.
- Any task that triggers §11 (Map Context and Entity Spawning) or §16 (Attaching Scripts to Entities) of this SKILL.md

Do not invoke a builder's `.cjs` without reading builder-protocol.md first. **Do not skip on the grounds that you saw it in a prior turn** — re-read every turn. Read it **alongside** the base-skill domain refs (`entity.md` / `model.md` / `msw-ui-system` design references) — they are not substitutes for each other.

### 1.9 Method Documentation Comments — Required, and **Inside the Body**

- **Every `method` declaration MUST have a description comment** explaining what the function does (purpose, parameters, return value, side effects — as applicable).
- The comment **MUST be written inside the method body**, as the first line(s) after `method ...`. **Never** place the description comment on the line(s) **above** the `method` declaration.
- This rule applies to **all** methods: lifecycle callbacks (`OnBeginPlay`, `OnUpdate`, ...), RPC handlers, event handlers, and user-defined methods.

**Why this placement matters**: mlua's parser/tooling associates leading comments differently from in-body comments. Placing the description inside the body keeps the comment reliably bound to the method and avoids it being parsed as a trailing comment of the previous declaration.

```lua
-- ❌ Wrong: comment ABOVE the method
-- Applies damage and triggers hit VFX.
method void ApplyDamage(Entity target, number amount)
    target:TakeDamage(amount)
end

-- ✅ Correct: comment as the FIRST line INSIDE the body
method void ApplyDamage(Entity target, number amount)
    -- Applies damage and triggers hit VFX.
    -- @param target : entity receiving damage
    -- @param amount : damage in HP units
    target:TakeDamage(amount)
end

-- ✅ Same rule for lifecycle / RPC handlers:
@ExecSpace("Server")
method void RequestBuyItem(string itemId)
    -- Client → Server RPC. Validates and grants the item; uses senderUserId.
end
```

> **Checklist before committing any `.mlua` change**: every `method` you added or modified has a description comment, and that comment is the **first statement inside** the method body — not a floating comment above the declaration.

---

## 2. Paths and File Roles

| Target | Path | Agent action |
|------|------|----------------|
| User scripts | `./RootDesk/MyDesk/**/*.mlua` | **Create / read / modify / delete directly** |
| Auto-generated artifacts | `*.codeblock` | **Do not touch** (Refresh manages them) |
| Engine API definitions | `./Environment/NativeScripts/**` | **Read-only** (do not modify) |
| Models (component lists) | `./RootDesk/MyDesk/*.model`, `./Global/*.model`, etc. | Edit `Components` **when attaching scripts** |
| Map instances | `./map/*.map` | Edit when attaching scripts to entities that exist only inside a map |

---

## 3. Script Types and Declarations

### 3.1 Component scripts (`@Component`)

Scripts attached to an Entity. Use `self.Entity` to access the owning entity.

```lua
@Component
script MyScript extends Component
    property number Speed = 5.0

    @ExecSpace("ServerOnly")
    method void OnBeginPlay()
        -- initialization (also: OnUpdate(delta), OnEndPlay)
    end
end
```

**Allowed parents**:
- `Component` — generic component
- `AttackComponent` — attack system (Shape, AttackFast, OnAttack)
- `HitComponent` — hit system (OnHit, HandleHitEvent)

### 3.2 Logic scripts (`@Logic`)

Global singletons. Run independently without an Entity. Use for game managers, UI managers, utilities, etc.

```lua
@Logic
script GameManager extends Logic
    @Sync property integer Score = 0

    @ExecSpace("ServerOnly")
    method void OnBeginPlay()
        -- global initialization (also: OnUpdate, OnEndPlay)
    end
end
```

- One per world (singleton)
- Accessed from other scripts as `_GameManager` — underscore prepended to the **exact script name**, no suffix stripping. `TDHUDLogic.mlua` is exposed as `_TDHUDLogic` (NOT `_TDHUD`), `TowerDefenseConfig.mlua` is `_TowerDefenseConfig`. Heuristics like "drop the Logic suffix" silently return `nil` at the call site.
- Supports `@Sync` properties — server→client sync behaves the same way

> ⚠️ **Warning — `@Logic` does NOT have `self.Entity`**
>
> The public members of the `Logic` parent class (`Environment/NativeScripts/Logic/Logic.d.mlua`) are **only** `ConnectEvent` / `DisconnectEvent` / `IsClient` / `IsServer` / `SendEvent`. There is no `Entity` property, `GetOwner`, or `Owner`. `self.Entity` is **`@Component`-exclusive** (`readonly property Entity Entity` in `Component.d.mlua`).
>
> Code like `self.Entity.xxx` inside a Logic **compiles but produces a nil-access at runtime and silently fails**. If a Logic needs to operate on a specific world entity, use one of these:
>
> ```lua
> property Entity spawnPoint = "uuid-string"   -- (1) inject UUID directly
> property EntityRef bossEntity = ""           -- survives map transitions
> -- (2) service lookup:
> local map = _EntityService:GetCurrentMap()
> local e   = _EntityService:GetEntityByPath("/maps/Main/Entities/Boss")
> -- also: _EntityService:FindEntityByName(...)
> ```
>
> - **Property injection** (recommended): hard-code the UUID of an entity already placed in the map into the property default.

> **Decision: @Component vs @Logic — pick by lifetime/scope, not just "is it global?"**
>
> | Scope of the feature | Pick | Why |
> |---|---|---|
> | World-wide, must survive every map transition (login/account state, world event bus, global UI manager) | **`@Logic`** | Engine global singleton; lives for the whole world session. |
> | **Map-scoped** — only meaningful inside a specific map (that map's quest controller, wave spawner, puzzle, mini-game, in-map dialog flow) | **`@Component` attached to the map entity** (add to that `.map`'s `@components`, or `AddComponent` after spawn) | Participates in the map's `OnBeginPlay`/`OnEndPlay`/`OnMapEnter`/`OnMapLeave`; auto-cleaned when the map unloads. **Do not put map-scoped content in `@Logic`** — the singleton stays alive after the player leaves, leaking state/timers/events into other maps. |
> | Behavior on one actor (monster AI, item pickup, player skill) | **`@Component`** on that entity (via `.model` or `AddComponent`) | Per-instance lifecycle tied to the entity. |
>
> Rule of thumb: *"Should this still be running after the player walks into another map?"* → **Yes** ⇒ `@Logic`. → **No, only in this map** ⇒ `@Component` on the map entity. → **No, only on this actor** ⇒ `@Component` on the actor.
>
> A Logic's `OnUpdate` runs **before** Components' `OnUpdate`.
>
> ⚠️ **`OnMapEnter` / `OnMapLeave` do NOT fire on `@Logic`** — they are dispatched only to Components attached to a map entity (or to entities living inside that map). Writing `method void OnMapEnter(Entity m) ... end` inside a Logic compiles cleanly but the method is **never invoked** at runtime (silent dead code). For per-map setup/cleanup either (1) move the behavior to a `@Component` on the map entity, or (2) inside the Logic, poll `_UserService.LocalPlayer.CurrentMap` from `OnUpdate` and react when it changes. See §5.

### 3.3 Extend scripts (extending an existing component)

```lua
@Component
script PlayerAttack extends AttackComponent
    -- Override AttackComponent's methods
    -- Call parent via __base:MethodName()
end
```

### 3.4 Other script types

| Annotation | Purpose | Notes |
|-----------|------|------|
| `@Event` | Define a custom event type | Declare event parameters |
| `@Item` | Define an item type | Inventory system |
| `@BTNode` | Behaviour Tree node | AI behavior trees |
| `@State` | Define a state type | State machines |
| `@Struct` | Struct / user type | Composite data types |

---

## 4. mlua Language Extensions (vs. plain Lua)

mlua is based on Lua 5.3 but differs in the following ways.

### Added keywords / operators

| Feature | Syntax | Notes |
|------|------|------|
| **continue** | `continue` | Skip to next iteration in a loop (not in standard Lua) |
| **Compound assignment** | `+=`, `-=`, `*=`, `/=`, `//=`, `%=`, `^=`, `..=` | Multi-assign (`a, b += 1, 2`) is invalid; cannot be used as a function arg (`print(a += 1)`) |
| **Bitwise operators** | `&`, `\|`, `<<`, `>>` | Compound forms also valid: `&=`, `\|=`, `<<=`, `>>=` |

### Restrictions

| Restriction | Description |
|------|------|
| **No global variables** | The `global` keyword is not allowed. Values shared across scripts must be declared as Properties. |
| **No coroutines** | Lua's `coroutine.create/resume/yield` is not available. |
| **`__base` instead of `super`** | Call parent methods with `__base:MethodName()`, not `super`. |

### Built-in utility functions

| Function | Signature | Purpose |
|------|----------|------|
| `log()` | `log(any... args)` | Info-level log output |
| `log_warning()` | `log_warning(any... args)` | Warning-level log output |
| `log_error()` | `log_error(any... args)` | Error-level log output |
| `wait()` | `wait(number seconds)` | Pause script execution for the given seconds |
| `isvalid()` | `isvalid(any object) → boolean` | Validity check (handles deletion / nil) |
| `enum()` | `enum(table t) → table` | Swap a table's keys and values |
| `beginscope()` / `endscope()` | `beginscope(string name)` / `endscope()` | User profiling scopes |

---

## 5. Lifecycle

Component and Logic share most of the lifecycle. **Exception**: `OnMapEnter` / `OnMapLeave` are dispatched **only to Components**, not to Logics — writing them on a `@Logic` compiles but produces silent dead code (see §3.2).

```
OnInitialize → OnBeginPlay → OnUpdate(delta) → OnEndPlay → OnDestroy
```

Components additionally receive `OnMapEnter` / `OnMapLeave` on every map transition.

| Method | When it fires | Where it fires | Purpose |
|--------|------|------|------|
| `OnInitialize` | Right after creation | Component + Logic | Initialize internal variables (rarely used) |
| `OnBeginPlay` | Game start / activation | Component + Logic | **Wire up events, start timers, initial setup** |
| `OnUpdate(delta)` | Every frame | Component + Logic (Logic first) | Movement, animation, input handling |
| `OnMapEnter` | Entering a map | **Component only** | Per-map initialization |
| `OnMapLeave` | Leaving a map | **Component only** | Per-map cleanup |
| `OnEndPlay` | Game end / deactivation | Component + Logic | **Disconnect events, clear timers (mandatory!)** |
| `OnDestroy` | On removal | Component + Logic | Final cleanup (rarely used) |

**Required pattern**: anything connected in `OnBeginPlay` must be released in `OnEndPlay`.

```lua
property any eventHandler = nil   -- EventHandlerBase from ConnectEvent (must be 'any')
property integer timerId = 0

method void OnBeginPlay()
    self.eventHandler = self.Entity:ConnectEvent(SomeEvent, self.OnSomeEvent)
    self.timerId = _TimerService:SetTimerRepeat(self.Tick, 1/60)
end

method void OnEndPlay()
    if self.eventHandler then self.Entity:DisconnectEvent(SomeEvent, self.eventHandler) end
    if self.timerId then _TimerService:ClearTimer(self.timerId) end
end
```

**`ConnectEvent` returns** an `EventHandlerBase`. Store it in an `any` property — declaring `integer` makes `DisconnectEvent` fail.

---

## 6. Execution Space (ExecSpace)

MSW is a server-client architecture. Every method must declare where it runs.

| ExecSpace | Runs on | Direction | Use case |
|-----------|----------|----------|------|
| `ServerOnly` | Server | Server-internal only | Damage calc, state changes, spawning |
| `ClientOnly` | Client | Client-internal only | UI updates, effects, sounds |
| `Server` | Server | Client→Server RPC | Client requesting the server (attack, item use) |
| `Client` | Client | Server→Client RPC | Server notifying a client (result UI, effects) |
| `Multicast` | All clients | Server→all clients | Global events (announcements, boss spawn) |
| *(unspecified)* | Caller side | Server→Server, Client→Client | Shared functions executed locally on either side |

### ExecSpace constraints on lifecycle methods

| Method | Allowed ExecSpace |
|--------|---------------|
| `OnSyncProperty` | **`ClientOnly` only** |
| `OnInitialize`, `OnBeginPlay`, `OnUpdate`, `OnEndPlay`, `OnDestroy`, `OnMapEnter`, `OnMapLeave` | `ServerOnly`, `ClientOnly`, or **unspecified** |
| All event handlers | `ServerOnly`, `ClientOnly`, or **unspecified** |
| Custom user methods | Any of `Server`, `Client`, `ServerOnly`, `ClientOnly`, `Multicast` |

### Key rules

```lua
-- ServerOnly: client call is silently ignored (no error!)
@ExecSpace("ServerOnly")
method void TakeDamage(number amount) self.Hp = self.Hp - amount end

-- Server RPC: client call → runs on server (network latency applies)
@ExecSpace("Server")
method void RequestAttack() end

-- Client RPC: server call → runs on the targeted client
@ExecSpace("Client")
method void ShowDamageEffect(number damage) end
```

### Typical server-client pattern

```
[Client]                    [Server]
  Detect input (ClientOnly)
       │
       └─── RequestAction() ──→ Validate + handle (ServerOnly)
                                     │
                                     ├─ State auto-syncs via @Sync
                                     │
       ←── ShowResult() ────────────┘  (Client RPC)
  Update UI (ClientOnly)
```

### `senderUserId` — verifying the requester on the server

When an `@ExecSpace("Server")` method is called from the client, the server side can read the **caller's UserId** from the local `senderUserId` variable. This is required for security checks.

```lua
@ExecSpace("Server")
method void RequestBuyItem(integer itemId)
    -- Verify caller — block requests not from the local client
    if senderUserId ~= self.Entity.PlayerComponent.UserId then return end
    self:ProcessPurchase(itemId)
end
```

### Sending a Client RPC to a specific client only

When the server invokes an `@ExecSpace("Client")` function, **adding a UserId as the last argument** at the call site routes execution to that user's client only.

```lua
@ExecSpace("Client")
method void ShowReward(string itemName) log(itemName) end

@ExecSpace("ServerOnly")
method void GiveReward(string playerId, string itemName)
    self:ShowReward(itemName, playerId)   -- last arg = target UserId
end
```

> Do **not** add the UserId parameter to the function **declaration**. Add it only as the **final argument at the call site**.

### Allowed parameter types across exec spaces

When functions are called across server↔client boundaries:
- **Allowed**: `string`, `integer`, `number`, `boolean`, `table`, `Vector2`, `Vector3`, `Vector4`, `Color`, `Entity`, `Component`, `EntityRef`, `ComponentRef`
- **Not allowed**: `any`
- **SyncTable generic parameters (k, v)** must also be one of the allowed types above.

---

## 7. Property System

### Basic property types

```lua
property number Speed = 5.0              -- float/double (NOTE: integers are 'integer')
property integer Count = 0
property string Name = "Player"
property boolean IsAlive = true
property Vector2 Direction = Vector2(0, 0)
property Vector3 Position = Vector3(0, 0, 0)
property Color Tint = Color(1, 1, 1, 1)  -- r,g,b,a in 0.0~1.0
property any CustomData = nil
```

### Entity / Component reference properties

```lua
property Entity targetEntity = ""                    -- linked by UUID string
property Entity popup = "94a274e4-4111-40f1-924d-c95a3a1f14d5"
property ButtonComponent btnOk = "uuid-string"       -- typed component ref
```

**AI automation principle — inject UUID strings directly**

The default value of an Entity/Component/EntityRef/ComponentRef property is a **UUID string**. The AI must NOT push the work onto the user (e.g., "drag it in the Maker editor"). Instead:

1. Look up the target entity's `id` (UUID) in the `.map` / `.ui` file.
2. Hard-code that UUID as a **string literal** into the `.mlua` property default.
3. Apply the same pattern to multiple-slot references (e.g., `wp0~wp7` array-style references) — inject each as a string.

```lua
@Logic
script WaypointPath extends Logic
    property Entity wp0 = "a1b2c3d4-...-000000000000"
    property Entity wp1 = "a1b2c3d4-...-000000000001"
    -- inject UUIDs read from the .map file as string literals; no drag needed.
end
```

> **Note**: drag-binding in the Maker editor is **a convenience for human authors only**. In an AI automation flow, UUID-string injection is the default path.

### Entity vs EntityRef

| Type | After map transition | Use case |
|------|:--------:|------|
| `Entity` | Reference is dropped (nil) | References within the same map |
| `EntityRef` | Reference persists | When the reference must survive a map transition |
| `Component` | Reference is dropped | References within the same map |
| `ComponentRef` | Reference persists | When the reference must survive a map transition |

> Multi-map games should prefer `EntityRef`/`ComponentRef`. `Entity`/`Component` is sufficient for single-map games.

### Sync annotations

| Annotation | Behavior |
|-----------|------|
| `@Sync` | Server → all clients |
| `@TargetUserSync` | Server → only that user's client |

Both **take no arguments**.

```lua
@Sync property number CurrentHp = 100         -- server change → all clients
@TargetUserSync property number PrivateScore = 0  -- → owning user's client only
```

**Core rules**:
- **Server → client, one direction only.** Changing a `@Sync` value on the client does NOT propagate back to the server.
- Sync has network latency — not instantaneous.
- **Cannot be synced**: `any`, `table` (use `SyncTable` instead).

**`@TargetUserSync` caveat**: only meaningful on a component attached to a PlayerEntity. If attached to any other entity, it behaves like a regular `@Sync`. It pays off (saving bandwidth) for **information that other users do not need to see**, such as personal currency, achievements, or consumable counts.

### SyncTable type

A table that can be synced. Supports both array and dictionary forms.

```lua
@Sync property SyncTable<number> Scores = {}            -- array form
@Sync property SyncTable<string, number> Stats = {}     -- dict form
```

- Use together with `@Sync`.
- Different from a plain `table` — only `SyncTable` is synchronized.

### Temporary properties (`_T`)

`self._T` exposes non-synced temporary properties created on the fly. No `property` declaration is required.

```lua
-- Non-synced, frame-local state; no property declaration needed
self._T.accumulatedDamage = 0
self._T.isCharging = false
```

- Cannot be `@Sync`'d — server and client each keep their own values.
- Convenient because no property declaration is needed, but it does NOT show up in the editor inspector.

### `OnSyncProperty` callback

A callback automatically invoked on the client when a `@Sync` property changes on the server.

```lua
@ExecSpace("ClientOnly")
method void OnSyncProperty(string name, any value)
    if name == "CurrentHp" then self:UpdateHpBar(value)
    elseif name == "IsDead" and value == true then self:PlayDeathEffect() end
end
```

**Rules**:
- **Fixed to `ClientOnly`** — ExecSpace cannot be changed.
- `name`: the changed property's name.
- `value`: the new value.
- Available on both Component and Logic.

### Property editor attributes

Control how the property is shown in the Maker editor inspector:

```lua
@DisplayName("Display Name") property string InternalName = ""
@Description("Used for ~")   property number Damage = 10
@MinValue(0) @MaxValue(999) @Delta(5) property integer Score = 0  -- step for mobile +/-
@MaxLength(20)               property string Nickname = ""
@HideFromInspector           property any InternalState = nil
```

---

## 8. Event System / RPC

### Static handler declaration (statically subscribed events)

```lua
@EventSender("Self")
handler HandleHitEvent(HitEvent event)
    local damage = event.TotalDamage
    -- Receives events emitted by my own entity
end
```

### `@EventSender` parameters

| 1st parameter | 2nd parameter | Purpose |
|---------------|---------------|------|
| `"Self"` | none | Events from my own entity |
| `"LocalPlayer"` | none | Events from the local player entity |
| `"Entity"` | entity ID (string) | Events from a specific entity |
| `"Model"` | model ID (string) | Events from a specific model |
| `"Service"` | service type name (e.g., `"InputService"`) | Service events |
| `"Logic"` | logic type name | Logic events |

```lua
@EventSender("Service", "InputService")
handler HandleKeyDown(KeyDownEvent event) end   -- key events from InputService
```

### Dynamic event connect / disconnect

```lua
-- OnBeginPlay: ConnectEvent returns EventHandlerBase
local eventHandler = entity:ConnectEvent(ButtonClickEvent, self.OnClick)
-- OnEndPlay (mandatory): pass the same handler object
entity:DisconnectEvent(ButtonClickEvent, eventHandler)
```

#### Closure handler for per-element captured state

Use a closure when many equivalent entities need different captured state (card IDs, slot indexes, etc.). Store the returned `EventHandlerBase` and disconnect in `OnEndPlay` just like `self.MethodName`.

```lua
for _, id in ipairs(cardIds) do
    local capturedId = id
    local e = _EntityService:GetEntityByPath("/ui/CardGroup/Card_" .. capturedId)
    if isvalid(e) then
        local h = e:ConnectEvent(ButtonClickEvent, function() self:OnCardClicked(capturedId) end)
        table.insert(self.clickHandlers, { entity = e, handler = h })
    end
end
```

> ⚠️ **`ConnectEvent` is called on Entity / Logic / Service — NOT on a Component**
>
> Only **three** types expose `ConnectEvent` / `DisconnectEvent`:
> - `Entity` (`Misc/Entity.d.mlua:96-104`)
> - `Logic` (`Logic/Logic.d.mlua:7-15`)
> - `Service` (`Service/Service.d.mlua:8-16`)
>
> The public members of the `Component` parent (`Component.d.mlua`) are only `Enable` / `Entity` / `IsClient` / `IsServer`. So **no Component — including `ButtonComponent` and `TriggerComponent` — has its own `ConnectEvent`**. Components only *emit* events; the **entity** they are attached to is what *receives* them.
>
> ```lua
> -- ❌ Component has no ConnectEvent — runtime nil
> self.Entity.ButtonComponent:ConnectEvent(ButtonClickEvent, self.OnClick)
> -- ✅ Subscribe on the owning Entity (or Service / Logic)
> self.clickHandler = self.Entity:ConnectEvent(ButtonClickEvent, self.OnClick)
> self.keyHandler   = _InputService:ConnectEvent(KeyDownEvent, self.OnKeyDown)
> ```



> ⚠️ **`handler` vs `method void` — do not mix them up**
>
> | Declaration keyword | Use | Wiring |
> |-------------|------|----------|
> | `handler Name(Ev event)` | **Static** subscription — paired with the `@EventSender(...)` annotation. Engine wires it automatically. | Wired by declaration alone |
> | `method void Name(Ev event)` | **Dynamic** callback — wired at runtime via `ConnectEvent(EvType, self.Name)` | `self.Entity:ConnectEvent(...)` or `_InputService:ConnectEvent(...)` |
>
> Passing a `handler` as the callback to `ConnectEvent` **compiles but never fires** (E-V1-5). Conversely, putting a `method void` underneath an `@EventSender` won't get statically wired. Rules:
>
> - If `@EventSender` is also present → use `handler`.
> - If you will subscribe with `ConnectEvent(...)` → use `method void`.



### Defining and sending a CustomEvent — typed class style

The **only** way to author a CustomEvent is the typed-class form: `@Event` + `extends EventType` with `property` fields. There is no inline factory like `CustomEvent("Name", { ... })` in mlua. Always declare an event class.

```lua
-- 1) Define the event
@Event
script DamageDealtEvent extends EventType
    property number amount = 0
end

-- 2) Send: instantiate, set fields, pass to SendEvent (Entity / Logic / Service)
local dmg = DamageDealtEvent()
dmg.amount = 50
self.Entity:SendEvent(dmg)        -- to my own entity
targetEntity:SendEvent(dmg)       -- to another entity
_UserService:SendEvent(dmg)       -- via a service / Logic

-- 3) Receive: ConnectEvent first arg is the event Type (class itself)
self.Entity:ConnectEvent(DamageDealtEvent, self.OnDamage)

method void OnDamage(DamageDealtEvent event)
    log("amount: " .. event.amount)
end
```

### NativeEvent vs CustomEvent

| | NativeEvent | CustomEvent |
|------|-------------|-------------|
| Definition | Built into the engine (`.d.mlua`) | User-defined via `@Event ... extends EventType` |
| Examples | HitEvent, ButtonClickEvent, StateChangedEvent | UserLogEvent, DamageDealtEvent (any class you declare) |
| Parameters | Fixed (see per-event spec) | `property` fields you declare on the class |
| Reference | `Environment/NativeScripts/Event/` | User code |

### Common NativeEvent parameters

```lua
-- HitEvent:           event.TotalDamage / .AttackerEntity / .DamageType
-- ButtonClickEvent:   (no parameters; emitted by the entity)
-- StateChangedEvent:  event.PrevState / .CurState  (string)
-- PlayerActionEvent:  event.ActionName  (string)
```

---

## 9. Validity Checks and Method Override

### Validity checks

```lua
if isvalid(entity) then ... end                         -- entity deletion/inactive check
if isvalid(self.Entity.SomeComponent) then ... end      -- component presence check
```

**Caution**: accessing a deleted entity is a runtime error. Always use `isvalid()`.

### Method override

- Inside an `extends`-ing script, declaring a `method` with the **same signature** as the parent overrides it.
- Built-in engine components allow override only for methods **without** `---@sealed`.
- Call the parent original via `__base:MethodName(args)` (optional, position is flexible).

#### ⚠️ LEA-3014 `SignatureMismatch` — ExecSpace must match the parent

The "same signature" rule **includes `@ExecSpace`**. If the parent method's exec space differs from the override (even when the parameter list/return type are identical), the engine fails at play time:

```
[CLIENT] [LEA-3014] SignatureMismatch :
  The signature of ProjectileComponent.CalcDamage[integer CalcDamage(Entity, Entity, string) (ExecSpace=ServerOnly)]
  must match the overridden AttackComponent.CalcDamage.[integer CalcDamage(Entity, Entity, string) (ExecSpace=All)].
```

**Rule**: an override's `@ExecSpace` must be **byte-identical** to the parent. If the parent declares no `@ExecSpace` (engine default = `All`), the override must also **omit** `@ExecSpace` entirely. Adding `@ExecSpace("ServerOnly")` to "make it server-side" silently breaks compilation at runtime.

| Parent declaration | Correct override | Wrong override (LEA-3014) |
|---|---|---|
| `method integer CalcDamage(...)` *(no `@ExecSpace`, ExecSpace=All)* | `method integer CalcDamage(...)` | `@ExecSpace("ServerOnly") method integer CalcDamage(...)` |
| `@ExecSpace("ServerOnly") method void Foo()` | `@ExecSpace("ServerOnly") method void Foo()` | `method void Foo()` *(missing annotation)* |
| `@ExecSpace("Client") method void Bar()` | `@ExecSpace("Client") method void Bar()` | `@ExecSpace("ClientOnly") method void Bar()` |

**Common offenders** — the AttackComponent / HitComponent damage hooks (`CalcDamage`, `CalcCritical`, `GetCriticalDamageRate`, `GetDisplayHitCount`, `IsAttackTarget`, `IsHitTarget`, `OnAttack`) are all declared **without** `@ExecSpace` in the engine. Override them with **no** `@ExecSpace` annotation. They are still safe — these methods are only ever invoked from the server-side hit pipeline, so the body executes on the server even with `ExecSpace=All`.

**Workflow**: before overriding, look up the parent in `.d.mlua` (Method 1 in §1) and **copy its annotation block verbatim** — including the absence of one. When LEA-3014 appears, the fix is always to align the child's `@ExecSpace` with the parent's, never the other way around.

---

## 10. Input / Click Events — World vs UI (Do Not Confuse)

### World touch — two approaches

| Approach | Receiver | Event (+ Hold/Release variants) | Connect on |
|------|----------|------------------------------|----------|
| **Entity touch** | An entity with `TouchReceiveComponent` | `TouchEvent` | `entity:ConnectEvent(...)` |
| **Screen touch** | The whole screen (no component required) | `ScreenTouchEvent` | `_InputService:ConnectEvent(...)` |

- Both events carry `TouchId` (int32) + `TouchPoint` (Vector2, screen coords).
- **Entity touch**: control the touch area via `TouchReceiveComponent`'s `TouchArea`/`Offset`/`AutoFitToSize`. Suited for per-object interactions (NPCs, items).
- **Screen touch**: suited for coordinate-based interactions (tower placement, move target). For world coordinates, convert via `_UILogic:ScreenToWorldPosition(event.TouchPoint)`. Filter UI clicks with `_InputService:IsPointerOverUI()`.
- **If a map touch is not picked up by `TouchEvent`**: it may be a `TouchArea` or raycast-priority issue. Combining `ScreenTouchEvent` + `ScreenToWorldPosition()` is more robust without configuration.

> ⚠️ **Warning — `BoxCollider2D` / physics colliders do NOT emit `TouchEvent`**
>
> If you reason from Unity's `OnMouseDown` / `OnPointerClick` and just attach `BoxCollider2D` / `Rigidbody` / `TriggerComponent` to an entity, **no touch input will arrive**. In MSW, world-entity touch reception is owned exclusively by **`TouchReceiveComponent`** (`Environment/NativeScripts/Component/TouchReceiveComponent.d.mlua` — `EmitTouchEvent` / `EmitTouchHoldEvent` / `EmitTouchReleaseEvent` exist only on this component).
>
> | Component | Role | TouchEvent |
> |---------|------|:---------:|
> | `BoxCollider2D`, `CircleCollider2D`, Rigidbody/Kinematicbody, etc. | Physics collision / raycast | ❌ |
> | `TriggerComponent` | Entity-entity overlap callbacks (`TriggerEnter/Exit`) | ❌ |
> | `TouchReceiveComponent` | **Touch-input reception** | ✅ |
>
> **Required setup** (`TouchReceiveComponent`):
> - `AutoFitToSize = true` — auto-fits `TouchArea` to the `SpriteRenderer`/`AvatarRenderer` scale. Skips manual math.
> - `TouchArea = Vector2(w, h)` — when set manually, leave **10–20% slack** beyond the sprite size (e.g., 1×1 sprite → 1.2×1.2). Too small leads to misaligned hit detection.
> - `Offset` — adjust only when the sprite pivot is not at center.
> - `RelayEventToBehind = true` (default) — forwards the event to entities behind. Set `false` only for standalone objects you want to block from passing through.
>
> **Symptoms → diagnosis order**:
> 1. Is `TouchReceiveComponent` actually attached to the target entity? (Check `.map` / `.model`.)
> 2. Is `TouchArea` zero, or is the entity outside the rendered area?
> 3. Is a front-most `TouchReceiveComponent` blocking with `RelayEventToBehind = false`?
> 4. Did you call `entity:ConnectEvent(TouchEvent, handler)` in `OnBeginPlay` and store the handler in `property any`? (If unstored, GC will collect it.)

> **Selection rule**: "Which entity was touched" → `TouchEvent`; "Where on the screen was touched (coords)" → `ScreenTouchEvent`.

### Clicks in UI

- For **UI entities**, use the **`ButtonComponent` + `ButtonClickEvent`** pattern.
- UI lives under `./ui/*.ui` and the `ui` tree of the hierarchy.

### What goes wrong if you mix them up

- Putting only UI button events on a world object, or only world-touch components on UI, results in **nothing happening**.
- Even if the requirement says "button," first decide whether it is a **world object or a UI panel button**.

---

## 11. Map Context and Entity Spawning

> **Builder Protocol Preflight (§1.8) trigger** — any invocation in this section entails a `.map` / `.model` mutation (`_SpawnService` itself is runtime, but authoring a spawnable model and placing it on the map must come first). **`Read` [`../msw-general/references/builder-protocol.md`](../msw-general/references/builder-protocol.md) before writing the call code** — `MapBuilder` / `ModelBuilder` snapshot workflow, `placeModel` signature, coverage gaps, model → map cross-flow (§4). Do not invoke one builder's `.cjs` while only knowing another builder's protocol.

### Prefer `Entity.CurrentMap`

- For map-dependent logic, **`Entity.CurrentMap`** is safer and more readable.

### Traversing children — `Children` / `GetChildByName` / `GetChildComponentsByTypeName`

`Entity` exposes a small lookup toolkit for "every X in the map" / "the child named Y" queries — required for RTS unit lists, inventory grids, spawn pools, dialog graphs, anything that iterates map content from a script.

| Member | Returns | Use |
|---|---|---|
| `Entity.Children` | `ReadOnlyList<Entity>` | Immediate children only |
| `Entity:GetChildByName(name, recursive=false)` | `Entity` | Find a child by name |
| `Entity:GetChild(id, recursive=false)` | `Entity` | Find a child by entity id (UUID) |
| `Entity:GetChildComponentsByTypeName(typename, recursive=false)` | `table<Component>` | All matching components on descendants |
| `Entity:GetFirstChildComponentByTypeName(typename, recursive=false)` | `Component` | First match (use this when you expect one) |

`typename` is a fully-qualified string and accepts both native (`"MOD.Core.SpriteRendererComponent"`) and user (`"script.MyUnit"`) component types. `recursive=true` walks the full subtree; default `false` is depth-1.

```lua
-- All script.MyUnit instances currently in the map:
local map = self.Entity.CurrentMap
local units = map:GetChildComponentsByTypeName("script.MyUnit", false)
for i = 1, #units do
    local u = units[i]                 -- u is the Component
    local e = u.Entity                  -- owning Entity
    log(e.Name)
end

-- A named child placed in the .map at authoring time:
local hq = map:GetChildByName("HQ", true)

-- Iterate immediate children — Entity.Children is a ReadOnlyList<Entity>, so use :ToTable()
-- (entity:GetChildren() does NOT exist; #entity.Children also does not work — convert first):
for _, child in ipairs(self.Entity.Children:ToTable()) do
    log(child.Name)
end
```

> The collection is `Children`, not `ChildList`, `Childs`, or `ChildEntities`. Using the wrong name compiles but is reported as `LIA-1114 UnresolvedMember` at Info level (the runtime still returns nil, so the loop silently does nothing).

> Runtime-spawned entities must be parented under `self.Entity.CurrentMap` (the `parent` arg of `_SpawnService:SpawnByModelId`) for these queries to find them.

### Native vs user components — different access patterns

`entity.SomeComponent` dot access only works for **engine-native** components (`TransformComponent`, `KinematicbodyComponent`, `SpriteRendererComponent`, `ButtonComponent`, …). For **user-defined `@Component` scripts**, dot access returns `nil` and shows `LIA-1114 UnresolvedMember` (Info) — the engine cannot auto-bind script-component names as entity fields.

| Access | Works on | Example |
|---|---|---|
| `entity.NativeComponent` (dot) | **Engine native components only** | `self.Entity.TransformComponent.WorldPosition` |
| `entity:GetComponentByTypeName(typename)` | Any component on **this** entity, including user `@Component` | `self.Entity:GetComponentByTypeName("script.MyUnit")` |
| `entity:GetFirstChildComponentByTypeName(typename, recursive)` | First match on descendants | `map:GetFirstChildComponentByTypeName("script.MyUnit", true)` |

User `@Component` typenames are **always prefixed with `script.`** — the script file `MyUnit.mlua` is `"script.MyUnit"`, not `"MyUnit"` and not `"script.MyUnit.MyUnit"`. The prefix is fixed; nesting under feature folders (`Combat/MeleeAttackComponent.mlua`) does **not** change it — the typename is still `"script.MeleeAttackComponent"`.

```lua
-- ❌ Wrong — user @Component is not auto-bound as a dot field
local unit = self.Entity.MyUnit                 -- nil, LIA-1114
unit.Hp = 0                                      -- runtime nil-access

-- ✅ Same entity — explicit type-name lookup
local unit = self.Entity:GetComponentByTypeName("script.MyUnit")
if isvalid(unit) then unit.Hp = 0 end

-- ✅ Sibling/descendant in the map
local hq = self.Entity.CurrentMap:GetFirstChildComponentByTypeName("script.HQ", true)
```

If you need to pass a user-component reference between scripts, declare a typed property (`property MyUnit unit = ""`) and inject the UUID, **not** a dot-access expression.

### Runtime entity spawning needs a model

- To create an entity at runtime, use `_SpawnService` (`SpawnByModelId` / `SpawnByEntity`, etc.). **A model (template) to spawn from must already exist.**
- If a brand-new kind of object is needed, follow this order: **design a `.model` → place it in a map or write spawn code**.

### `parent` parameter caveats

- **`SpawnByModelId`'s `parent` is required** — there is no default, so you must pass a map entity. Passing `nil` leaves the entity orphaned (not parented), and the engine logs `NativeIssue_NotRecommendedValue`.
- In contrast, `SpawnByEntity` defaults `parent = nil` and may be omitted — **the two methods have different signatures**.
- Get the map entity via `self.Entity.CurrentMap` or `_EntityService:GetEntitiesByPath("/maps/MapName")`.

### Body components and direct Position writes

- On entities with a Body component (Kinematicbody/Rigidbody/Sideviewbody), setting `TransformComponent.WorldPosition` directly will be **overwritten by the physics engine on the next frame**. This is a top cause of "movement doesn't work."
- Per-frame movement: `MovementComponent:MoveToDirection(direction, deltaTime)`.
- Instant teleport: `MovementComponent:SetPosition(pos)` (local), or the Body's own `:SetPosition(Vector2)` (local) / `:SetWorldPosition(Vector2)` (world). For a `KinematicbodyComponent` on a RectTile map specifically, `body:SetWorldPosition(Vector2(x, y))` is the standard absolute-place call — direct `TransformComponent.WorldPosition` writes are silently reset every frame by the body.
- Direct `TransformComponent.WorldPosition` writes are limited to **entities without a Body** (decorations, effects, etc.).
- **Do NOT remove the Body component as a workaround** — tile collision and enter/leave events all become disabled, and the engine logs `NativeIssue_MissingComponent`.

---

## 12. Frequently Used Services / Logic

All services and logic are accessed via `_Name` (underscore + type name). Only the most common ones are listed.

| Service / Logic | Purpose |
|-------------|------|
| `_SpawnService` | Spawn entities (`SpawnByModelId`, `SpawnByEntity`). **There is no `Despawn` method** — remove spawned entities via `Entity:Destroy()` / `Entity:Destroy(delaySeconds)` (both `ControlOnly`). |
| `_TimerService` | Timers (`SetTimer`, `SetTimerRepeat`, `ClearTimer`) |
| `_EntityService` | Entity lookup (`GetEntity`, `GetEntities`, `GetEntitiesByPath`) |
| `_InputService` | Input state queries; receives `ScreenTouchEvent` |
| `_ResourceService` | Look up resource RUIDs |
| `_DataStorageService` | Persistent data (player saves) — **⚠️ Credit-billed. Do not call in `OnUpdate` / short timers; use `Batch*` in loops. Details: [references/datastorage.md](references/datastorage.md)** |
| `_UtilLogic` | Random, time, string, and math utilities |
| `_TweenLogic` | Tween animations (MoveTo, ScaleTo, RotateTo) |
| `_UILogic` | UI coordinate conversions (e.g., ScreenToWorldPosition) — ClientOnly |

> For the full list, read the `.d.mlua` files directly: `./Environment/NativeScripts/Service/` (46 files) and `./Environment/NativeScripts/Logic/` (9 files). For domain details, search via `msw-search`.

---

## 13. Math, Utilities, Reserved Words, Type Annotations

### Math / utility examples

```lua
local rand    = _UtilLogic:RandomDouble()             -- 0.0~1.0
local randInt = _UtilLogic:RandomIntegerRange(1, 10)  -- 1~10

-- Wall-clock seconds since the world instance started. Both keep ticking
-- across repeated play sessions in the Maker editor — they do NOT reset on
-- OnBeginPlay. For per-session countdowns, see "Per-session timers" below.
local elapsed       = _UtilLogic.ElapsedSeconds       -- since world init (server creation / client connection)
local serverElapsed = _UtilLogic.ServerElapsedSeconds -- since the server created the world

local rad = math.rad(angle)                           -- trig
local x, y = math.cos(rad) * dist, math.sin(rad) * dist

local diff = targetPos - myPos                        -- distance
local dist = math.sqrt(diff.x * diff.x + diff.y * diff.y)
```

### mlua utility classes

Collections / utility types beyond the Lua standard library:

| Class | Purpose | Notes |
|--------|------|------|
| `List` | Dynamic array (1-based index) | Add / remove / search / sort |
| `ReadOnlyList` | Read-only array | For data protection |
| `SyncList` | Network-synced array | Auto-sync server↔client |
| `Dictionary` | Hash table (key-value) | Fast lookup by unique key |
| `ReadOnlyDictionary` | Read-only hash table | For data protection |
| `SyncDictionary` | Network-synced hash table | Auto-sync server↔client |
| `DateTime` | Date/time | Format-string support |
| `TimeSpan` | Time span | Days/hours/minutes/seconds/milliseconds |
| `Regex` | Regular expression | Match / search / replace |
| `Translator` | Localization | Current language, translated text lookup |
| `Quaternion` | 3D rotation | Avoids gimbal lock; smooth rotations |
| `Vector2Int` | Integer 2D vector | Useful for grid coords |
| `FastVector2/3`, `FastColor` | High-performance vector / color | In-place ops without new objects (when perf matters) |
| `Item` | Inventory item | Quantity, icon RUID, data-table linkage |

> For detailed APIs, browse `Environment/NativeScripts/` or query the `msw-search` skill.

### Per-session timers — never anchor on `ElapsedSeconds`

A common trap is `self.deadline = _UtilLogic.ElapsedSeconds + 15` in `OnBeginPlay`. `ElapsedSeconds` (and `ServerElapsedSeconds`) measure the **world instance's** lifetime, and a single world instance in the Maker editor can survive multiple play sessions — so the saved deadline is often already in the past on the very first frame of the next play, firing immediately or even multiple times in a row.

For a per-session countdown, store the remaining time as a property reset in `OnBeginPlay` and decrement by `delta` in `OnUpdate`:

```lua
@Sync property number waveCountdown = 0

method void OnBeginPlay()
    self.waveCountdown = 15
end

method void OnUpdate(number delta)
    if self.waveCountdown > 0 then
        self.waveCountdown = self.waveCountdown - delta
        if self.waveCountdown <= 0 then
            self:StartWave()
        end
    end
end
```

If you genuinely need elapsed time relative to *this* session, capture a baseline in `OnBeginPlay` (`self.startTime = _UtilLogic.ElapsedSeconds`) and compute deltas as `_UtilLogic.ElapsedSeconds - self.startTime`. Never compare two raw `ElapsedSeconds` snapshots taken in different sessions.

### Type annotations (code hints)

`---@`-style annotations help editors with autocomplete and type inference. **They have no runtime effect** — editor assist only.

```lua
---@type string
local name = GetPlayerName()
---@type table<string, Entity>
local entityMap = {}

---@param target Entity
---@param damage integer
---@return boolean
local function ApplyDamage(target, damage) return target ~= nil end
```

### Reserved words

Using mlua keywords as identifiers produces a parse error.

**Forbidden as identifiers**: `handler`, `property`, `method`, `script`, `end`, `extends`, `self`, `nil`, `true`, `false`.

Do not use these words as local variables, parameters, properties, methods, event handlers, dot-field names (`rec.handler`), or bare table keys (`{ handler = value }`). If an external payload forces a reserved string key, use bracket syntax (`rec["handler"]`) and prefer renaming internal keys to `eventHandler`, `connHandler`, or another non-reserved identifier.

```lua
-- ❌ 'handler' is reserved — local, dot-field, and bare table key all fail
local handler = entity:ConnectEvent(...)
rec.handler = entity:ConnectEvent(...)
local rec = { handler = nil }

-- ✅ Rename, or bracket-quote when the string key is mandatory
local eventHandler = entity:ConnectEvent(...)
rec.eventHandler   = entity:ConnectEvent(...)
rec["handler"]     = entity:ConnectEvent(...)
```

---

## 14. External Tooling

| Need | Skill |
|------|------|
| Maker MCP (`refresh`, `logs`, `play`, `stop`, `screenshot`, etc.) | **`msw-general`** |
| MCP wiring, `.mcp.json`, API key setup | Share this link with the user: https://maplestoryworlds-creators.nexon.com/ko/docs?postId=1368 |
| Descriptions, examples, and implementation guides not in `.d.mlua` | **`msw-search`** |

Core debug order: **build logs first → play → logs → stop → fix → diagnose → refresh → repeat**.

---

## 15. Script Authoring Workflow (essentials)

1. **Search**: scan `./RootDesk/MyDesk/**/*.mlua` → if a similar script exists, **modify it first**; do not create new.
2. **Verify spec**: Read the `.d.mlua` → if insufficient, use `msw-search`.
3. **Decide path** (see §1.2 — folder structure is mandatory): pick a feature/category subfolder. Reuse one if it already exists; otherwise create a new feature-named folder. Final path must look like `./RootDesk/MyDesk/<FeatureFolder>/<Name>.mlua` — **never write directly to `./RootDesk/MyDesk/` root**.
4. **Write**: create the file at the path chosen in step 3.
5. **Validate**: `mlua-diagnose` hook auto-runs on save — fix until errors hit zero.
6. **Refresh**: Maker MCP `refresh` (if MCP is not connected, point the user to the button).
7. **(If needed)** `play` → reproduce → `logs` → `stop`.

**Delete / rename**: still requires `refresh` after the file change. Also clean up references in `.model` / `.map`.

---

## 16. Attaching Scripts (Components) to Entities

> **Builder Protocol Preflight (§1.8) trigger** — every operation in this section is a `.model` or `.map` mutation. `Read` [`../msw-general/references/builder-protocol.md`](../msw-general/references/builder-protocol.md) before the call. Adding a component to a `.model` is `ModelBuilder.component()` / `addComponent()` / `upsertComponent()` (§2.3); adding to a `.map` instance is `MapBuilder.upsertComponent()` (§1.3) — do not touch the `Components` array as raw JSON.

- **Attach to a model template (`.model`) — recommended**: use `ModelBuilder` to add the script-component entry to the `Components` array. Map instances inherit it automatically.
- **Only for a specific map instance**: `MapBuilder.upsertComponent(name, "script.XXX", body)` to attach the component to that `.map` entity only.
- **Global models** (e.g., `DefaultPlayer` under `./Global/`): **affect the entire project** — confirm the blast radius before changing. `Global/*.model` is read-only by policy, so typically copy into `RootDesk/MyDesk/Models/` first and patch with ModelBuilder.

---

## 17. Playtesting and Debugging

The procedure for verifying behavior in **play mode** in Maker, then narrowing down bugs with **runtime logs, screenshots, and simulated input**.

> For the MCP tool list, play-mode constraints, and refresh rules, see `msw-general`.

### 17.1 Always Check Build Logs First (the first step of every playtest)

**Before entering play mode, you MUST inspect the build console (build logs) first.** If there are build errors, scripts will not load or will behave unexpectedly, making runtime debugging meaningless.

```
1. After refresh → call logs(category="build")
2. Are there build errors?
   ├─ YES → from the error messages, identify file and line → edit the .mlua → refresh → recheck build logs (repeat until errors are zero)
   └─ NO → enter play → run runtime tests
```

**If you run play with build errors:**
- Scripts with errors **fail to load entirely** — it behaves as if the component/logic isn't there.
- Build errors may not appear in the runtime logs, making **the cause extremely hard to find**.
- Most "the code looks correct but it doesn't work" reports come from missed build errors.

> This step is **mandatory in every workflow pattern** (general test, regression test, error analysis).

### 17.2 Error Classification Table (by log / symptom)

When reading `logs` (and the script stack), do a **first-pass classification** with the table below.

| Class | Common signs | Where to look |
|------|-----------|-----------|
| **Script error** | Stack trace with file name and **line number** | The exact line in the `.mlua`; event/timing order |
| **nil reference** | `attempt to index a nil value`, crash right before a field access | Init order, `isvalid`, 1-frame timing right after Spawn |
| **component missing** | Component field is nil; `GetComponent` fails | `Components` array in `.model`; typos in name/path |
| **network / sync** | Only client breaks; values mismatch; values converge after a delay | `@Sync`, only-on-server changes, `ExecSpace`, RPC flow |
| **`Info` LIA 1113 / 1114 / 1115** (static-analysis false positives) | `[INFO] LIA&...&1113&...` *UnresolvedSymbol* — a user `_LogicName` global reference. `&1114&...` *UnresolvedMember* — user `@Component` dot-property access. `&1115&...` *UnresolvedFunction* — user `@Component` method call. `logType: "Info"`; build still passes with `errors=0` / `warnings=0` | Static-analysis limitation on **user-defined cross-script references** — the calls resolve at runtime. Treat as noise and verify behavior with `log()` evidence. If they drown real issues, scope the next `logs` call to higher severities. |

**To narrow down a cause**: if logs alone are inconclusive, add `log()` outputs to the `.mlua` to inspect the relevant entity / component / property state.

### 17.3 Test-Result Report Format

When a playtest ends, summarize **briefly** in this format.

1. **Scenario name**: one-line description of what was verified.
2. **Environment**: map / mode (if known); whether a `refresh` happened before playing.
3. **Steps**: a summary of the execution order — input simulation, Lua runs, etc.
4. **Result**: **Pass / Fail / Blocked** (e.g., couldn't enter play).
5. **Evidence**: **one or two key lines** quoted from `logs`; whether a **screenshot** exists (only if the user asked for one).
6. **Next action**: candidate files to edit, repro conditions, whether to use `clear_logs` on the next run.

### 17.4 Workflow Patterns

#### 1) General playtest

1. Prepare scripts / maps / models in edit mode.
2. If the workspace was changed, call MCP **`refresh`**.
3. **Check build errors with `logs(category="build")` → if any, fix and refresh until clean.**
4. MCP **`play`** → enter play mode.
5. As needed, use **`keyboard_input`** / **`mouse_input`** to reproduce input or UI clicks.
6. As needed, use **`logs`** to inspect runtime state.
7. As needed, use **`logs(category="runtime")`** to inspect runtime logs.
8. MCP **`stop`** → return to edit mode.

#### 2) Regression test loop (fix loop)

1. Edit files based on the previous failure cause.
2. **`refresh`**.
3. **Check build errors with `logs(category="build")` → if any, fix and refresh until clean.**
4. For a clean repro, call **`clear_logs`** then **`play`**.
5. Replay the same scenario via input / Lua.
6. Use **`logs(category="runtime")`** to confirm regression status.
7. **`stop`**, then edit again if needed.

#### 3) Error-analysis workflow

1. **First check build errors with `logs(category="build")`** — fix them before any runtime analysis.
2. **`clear_logs`** (optional) → **`play`**.
3. Reproduce the issue via **`keyboard_input`** / **`mouse_input`** / in-game manipulation.
4. Collect **`logs(category="runtime")`** and map them to the **error classification table** above.
5. If logs are insufficient, add `log()` outputs in the `.mlua` to inspect entity / property state.
6. After **`stop`**, fix the code / `.model` / sync.
7. **`refresh`** → **recheck build logs** → **`play`** to re-verify.

#### 4) Runtime Lua debugging

1. Add `log()` calls in the `.mlua` for the values you want to inspect.
2. **If you don't know the API, look it up first**: search `.d.mlua` → `msw-search`.
3. **`refresh`** → **`play`** to enter play mode.
4. Collect output via **`logs`** and analyze.
5. After analysis, **`stop`** → edit → repeat.

### 17.5 Final Verification Before Completion (PASS/FAIL)

Before reporting "done" to the user, you **must** pass the following checklist:

> **Principle**: "No errors ≠ Pass." You need **positive `log()`-based evidence** that the intended logic actually executed.

Full checklist: **[references/verify-checklist.md](references/verify-checklist.md)**
(Step 1 Runtime Execution → Step 2 Code Review → Step 3 Log Evidence → Step 4 PASS/FAIL Verdict)

### 17.6 Related Skills

- **`msw-general`**: MCP tools, screenshot/logs policy, refresh rules, workspace and hierarchy.
