# UI Builder Protocol

Handles MSW `.ui` layouts via builder calls instead of direct JSON editing. This is the **builder call manual** within this skill (`msw-ui-system`) — bundled together with the design guides ([`ui-fundamentals.md`](ui-fundamentals.md), [`ui-hierarchy.md`](ui-hierarchy.md), [`component-api.md`](component-api.md), [`layout-recipes.md`](layout-recipes.md), [`runtime-patterns.md`](runtime-patterns.md)) of the same skill.

## ⚠️ Prerequisite: Read the Design Guide First

This document only covers **"how to call"** (how). Working only with the builder without reading the design guides will miss anchor/pivot/UIGroup hierarchy/component selection criteria, resulting in **layouts that look wrong or UI that breaks on resolution changes**.

**Before** opening this document, be sure to read first:

- [`SKILL.md`](../SKILL.md) — overall routing
- At least 1 of the sub-references matching the request ([`ui-fundamentals.md`](ui-fundamentals.md) / [`ui-hierarchy.md`](ui-hierarchy.md) / [`component-api.md`](component-api.md) / [`layout-recipes.md`](layout-recipes.md))

Role division (within the same skill):

| Document | Responsibility |
|------|------|
| Other refs ([`ui-fundamentals.md`](ui-fundamentals.md), [`component-api.md`](component-api.md), …) | UI knowledge — design decisions (which/when/why; see [`component-api.md`](component-api.md) §"Component Selection Guide"), component API fields & enum values (what), mlua runtime patterns |
| This document (`builder-protocol.md`) | Builder call protocol (**how to mutate**) — `.ui` mutations **must** go through the builder |

## Purpose

- Express UI entities like panel/text/button/sprite with compact declarations.
- Safely modify existing `.ui` files through a `load -> patch -> write` flow.
- Perform component add/replace/patch/remove without direct JSON manipulation.

## Basic Workflow

1. Determine the target `.ui` path and the scope of entities/components to modify.
2. If the file already exists, load it with `UIBuilder.load()` from `scripts/msw_ui_builder.cjs`.
3. For one-off modifications, call directly; for repeated/high-risk modifications, separate into `.builder-work/` temporary scripts.
4. Reopen the resulting `.ui` to verify hierarchy and rect/anchor.
5. If needed, use the preview script to check placement and touch guide warnings.

## Call Protocol

- Do not read the `.cjs` internal implementation every time. Call in the fixed order below.
- Basic order: `UIBuilder.read/load()` -> `find/snapshot()` -> `patch/entity/component API` -> `write()`
- Internal script inspection is limited to one-time, minimal scope only in exceptional situations (errors, unclear API).

## write() Auto-Lint (Default ON)

`write(filepath)` automatically runs `scripts/ui_lint.cjs` immediately after saving. Default behavior:

- 1 or more errors → **build failure** via `RuntimeError` (the file remains on disk but the caller must be aware of the failure).
- Warnings only → one-line summary output, details hidden.
- Nothing found → `✓ ui_lint: clean`.

`write(filepath)` overwrites the target `.ui` path. Do not delete and recreate `.ui` files; load or construct the intended state, then write once.

Flags:

| Argument | Default | Meaning |
|------|------|------|
| `lint` | `True` | Setting to `False` skips lint entirely. Use only for special paths like one-off dumps. |
| `strict` | `True` | If `False`, errors are printed but proceed without exception. |
| `lint_verbose` | `False` | If `True`, prints full text of all warnings/errors. |

Example:

```javascript
b.write("ui/PopupGroup.ui");                                   // default: strict + summary
b.write("ui/PopupGroup.ui", { lint_verbose: true });            // detailed warning output
b.write("ui/_scratch.ui", { lint: false });                     // skip lint
```

See `scripts/ui_lint.cjs` header for descriptions of applied rule IDs (`L001`~`L012`).

## pos/anchor Rules

Canvas 1920×1080, center origin `(0, 0)`. X: ±960, Y: ±540. All values are in **UI pixels**. For the coordinate model, 16 anchor presets (`top-left`~`stretch` and `AlignmentOption` mappings), and the basic `pos = ±(margin + size/2)` formula, see [`ui-fundamentals.md`](ui-fundamentals.md) §1~§6 — here only **builder-specific behavior** is covered.

### Builder's Auto-Pivot — Edge Placement Formula Becomes Simpler

When the builder is called without a `pivot` argument, it automatically assigns a **pivot identical to the anchor point** (`middle-left`→(0, 0.5), `top-right`→(1, 1), `stretch*`→(0.5, 0.5), etc.).

→ With edge anchors, simply providing `pos = (margin, ...)` makes the element's **corresponding edge stick exactly at the margin position**:

```javascript
// auto pivot (recommended)
b.panel("Left", { anchor: "middle-left", pos: [20, 0], rect_size: [260, 80] });
// -> pivot=(0, 0.5), rect left edge = x+20

// explicit pivot=(0.5, 0.5) — center-based offset (ui-fundamentals default mode)
b.panel("Left", {
  anchor: "middle-left",
  pos: [20, 0],
  rect_size: [260, 80],
  pivot: [0.5, 0.5],
});
// -> rect left edge = x-110, outside parent boundary
```

**Two mode formulas**:
- Auto pivot (builder default): `pos = (±margin, ±margin)` — no need to add half the size
- Explicit `pivot=(0.5, 0.5)`: `pos = ±(margin + size/2)` — the general formula from ui-fundamentals §4

`ui_lint`'s `L005` rule detects edge overflow patterns where "pos absolute value < size/2".

**Breaking note**: Among `.ui` files generated with older builder versions that appeared to use edge anchor + center pivot, if the layout was intentionally center-based, restore it by explicitly specifying `pivot=(0.5, 0.5)`.

All public APIs (`panel / text / sprite / button / script / slider / scroll_layout / text_input`, etc.) and `patch()` accept `pivot=(x, y)`. `patch()` preserves the existing `Pivot` value when not explicitly specified.

## API Reference

`identifier` allows all three formats — they point to the same entity:

- Absolute path — `"/ui/<group>/Panel/Text"` (paths to other groups raise `ValueError`)
- Group name prefix — `"<group>"`, `"<group>/Panel/Text"` (starts with the root group name)
- Relative name — `"Panel/Text"` (from direct children under the root)

To refer to the root itself, use any of `"<group>"`, `"/ui/<group>"`, or `"/"`. An empty string raises `ValueError`.

### Hierarchy by Path

Builder creation methods do not take a separate `parent` argument. The parent is encoded in the `name` path:

```javascript
b.panel("Window", { rect_size: [700, 500] });                 // /ui/<group>/Window
b.sprite("Window/Bg", { anchor: "stretch" });                 // child of Window
b.button("Window/Card_SA", "A", { rect_size: [96, 132] });     // child of Window
```

All missing intermediate parents must be created explicitly before adding children. Use a flat structure only when it simplifies runtime lookup; nested structures are supported through slash-separated paths.

### Create / Load

```javascript
new UIBuilder(groupName, displayOrder = 1, defaultShow = true, defaultRuid = DEFAULT_SPRITE_RUID); // new
UIBuilder.load(filepath)  |  UIBuilder.read(filepath);     // load existing file
UIBuilder.snapshot(filepath);                              // returns compact entity view only
```

### Entity Lookup

```javascript
b.find(identifier);                         // raw entity dict or null (key structure below)
b.get_id(identifier);                       // UUID string or null
b.has_component(identifier, comp_type);     // boolean
b.get_component(identifier, comp_type);     // component object or null ({"@type": ..., ...})
b.list_entities();                         // tree output + return (name/path/depth/kind/pos/size/enable)
```

`find()` return dict keys — `@components` is one level deeper, so direct access raises KeyError:

```
{
  "id":             str,    # entity UUID
  "path":           str,    # absolute path "/ui/<group>/.../<name>"
  "componentNames": str,    # component @type CSV (auto-synced)
  "jsonString": {           # body — automatically normalized to dict on load
      "name", "path", "enable", "visible", "displayOrder", ...,
      "@components": [ {"@type": "MOD.Core.UITransformComponent", ...}, ... ],
      "@version": 1,
  },
}
```

When you only need component data, use `b.get_component(path, comp_type)` instead of unwrapping the raw structure:

```javascript
const btn = b.get_component("Panel/BtnOk", "MOD.Core.ButtonComponent");
if (btn?.Enable) {
  // use the component data
}
```

### Entity Creation (upsert — replaces if same path exists)

Tuple-shaped options (`pos`, `rect_size`, `cell_size`, `padding`, `spacing`, `softness`, …) accept `[a, b]`/`[a, b, c, d]` (preferred) or `{ x, y, z, w }`. Both normalize to the same value.

```javascript
b.panel(name, { anchor: "middle-center", pos: [0, 0], rect_size: [1920, 1080], enable: true, pivot: null });
b.text(name, text, {
  size: 24,
  color: null,
  bold: false,
  alignment: 4,      // 0=UpperLeft .. 4=MiddleCenter(default) .. 8=LowerRight
  overflow: 0,       // 0=Overflow, 1=Truncate, 2=Ellipsis
  bestfit: false,
  min_size: 10,
  max_size: null,
  outline: false,
  outline_color: null,
  outline_width: null,
  anchor: "middle-center",
  pos: [0, 0],
  rect_size: null,   // auto-calculated when omitted
  enable: true,
  pivot: null,
});
b.sprite(name, { anchor, pos, rect_size, color, alpha: 1.0, fill_method: 0, sprite_type: 0, raycast: false, enable: true, image_ruid: null, pivot: null });
b.button(name, text, { rect_size: null, pos, anchor, font_size: 24, color: "#000000", enable: true, image_ruid: null, pivot: null });
b.slider(name, { min_val: 0, max_val: 1, value: 0, direction: 0, use_handle: true, use_integer: false, anchor, pos, rect_size: [200, 30], enable: true, image_ruid: null, pivot: null });
b.scroll_layout(name, { layout_type: 0, spacing: 0, cell_size: [100, 100], use_scroll: true, padding: [0, 0, 0, 0], anchor, pos, rect_size: [400, 600], enable: true, pivot: null });
b.text_input(name, { placeholder: "", char_limit: 0, content_type: 0, line_type: 0, font_size: 24, color: "#000000", anchor, pos, rect_size: [300, 50], enable: true, image_ruid: null, pivot: null });
b.script(name, scriptName, { anchor: "stretch", pos: [0, 0], rect_size: [1920, 1080], enable: true, pivot: null });

// Child UIGroup — popup/overlay subgroup
b.group(name, { default_show: true, group_order: 0, group_type: 1, blocks_raycasts: true, group_alpha: 1.0, interactable: true, anchor: "stretch", pos: [0, 0], rect_size: [1920, 1080], enable: true, pivot: null });

// Clipping mask
b.mask(name, { shape: 0, padding: [0, 0, 0, 0], softness: [0, 0], anchor: "middle-center", pos: [0, 0], rect_size: [200, 200], color: null, alpha: 0.0, image_ruid: null, enable: true, pivot: null });

// Virtualized grid
b.grid_view(name, { total_count: 0, cell_size: [100, 100], fixed_count: 1, fixed_type: 0, spacing: [0, 0], padding: [0, 0, 0, 0], use_scroll: true, scroll_bar_visible: 1, scroll_bar_thickness: 10.0, anchor, pos, rect_size: [400, 600], enable: true, pivot: null });

// Avatar / Touch / Skeleton / Particle
b.avatar(name, { color: null, flip_x: false, flip_y: false, play_rate: 1.0, preserve_avatar: 0, raycast: true, material_id: "", anchor, pos, rect_size: [200, 300], enable: true, pivot: null });
b.touch_receive(name, { anchor: "stretch", pos: [0, 0], rect_size: [1920, 1080], enable: true, pivot: null });
b.skeleton(name, { skeleton_ruid: "", animations: null, skins: null, color: null, flip_x: false, flip_y: false, loop: true, play_rate: 1.0, preserve_mode: 0, raycast: true, anchor, pos, rect_size: [200, 200], enable: true, pivot: null });
b.area_particle(name, { particle_type: 0, area_size: [100, 100], area_offset: [0, 0], color: null, local_scale: [1, 1], play_speed: 1.0, particle_size: 1.0, particle_speed: 1.0, particle_count: 1.0, particle_lifetime: 1.0, loop: true, play_on_enable: true, prewarm: false, auto_random_seed: true, random_seed: 0, anchor, pos, rect_size: [100, 100], enable: true, pivot: null });
b.basic_particle(name, { particle_type: 0, color: null, local_scale: [1, 1], play_speed: 1.0, particle_size: 1.0, particle_speed: 1.0, particle_count: 1.0, particle_lifetime: 1.0, loop: true, play_on_enable: true, prewarm: false, auto_random_seed: true, random_seed: 0, anchor, pos, rect_size: [100, 100], enable: true, pivot: null });
b.sprite_particle(name, { particle_type: 0, sprite_ruid: "", apply_sprite_color: false, color: null, local_scale: [1, 1], play_speed: 1.0, particle_size: 1.0, particle_speed: 1.0, particle_count: 1.0, particle_lifetime: 1.0, loop: true, play_on_enable: true, prewarm: false, auto_random_seed: true, random_seed: 0, anchor, pos, rect_size: [100, 100], enable: true, pivot: null });

// Virtual joystick (mobile controls)
b.joystick(name, { dynamic_stick: true, axis: 1, up_arrow: 273, down_arrow: 274, left_arrow: 276, right_arrow: 275, anchor: "bottom-left", pos: [200, 200], rect_size: [300, 300], image_ruid: null, color: null, alpha: 1.0, enable: true, pivot: null });

// Soft mask (UGUI SoftMask style)
b.soft_mask(name, { invert_mask: false, invert_outsides: false, anchor: "middle-center", pos: [0, 0], rect_size: [200, 200], color: null, alpha: 0.0, image_ruid: null, enable: true, pivot: null });

// Chat UI
b.chat(name, { use_chat_balloon: false, expand: true, use_chat_emotion: true, chat_emotion_duration: 5.0, enable_voice_chat: true, hide_world_chat_button: false, message_align_bottom: false, anchor: "bottom-left", pos: [200, 200], rect_size: [400, 300], image_ruid: null, color: null, alpha: 0.0, enable: true, pivot: null });

// Line / Polygon renderer (HUD lines, guidelines, speech bubble tails, custom shapes)
b.line(name, { points: [{ pos: [0, 0], color: "#FFFFFF", width: 2.0 }, /* ... */], is_flexible: true, flexibility: 3.0, is_smooth: false, loop: false, material_id: "", anchor, pos, rect_size: [100, 100], enable: true, pivot: null });
b.polygon(name, { points: [[0, 0], [100, 0], [50, 100]], color: null, use_custom_uvs: false, uvs: null, material_id: "", anchor, pos, rect_size: [100, 100], enable: true, pivot: null });
```

All creation method return values = UUID (`str`) of the created/updated entity.

Use `button()` as the default for any colored or imaged rectangle that needs centered text and click handling. It creates the clickable tile as one entity instead of requiring a separate `sprite()` plus `text()` pair.

Important button color rule:
- `button(..., { color })` controls `TextComponent.FontColor` only. It is the button text color, not the background color.
- The button background is the same entity's `SpriteGUIRendererComponent.Color` and `ImageRUID`.
- If you set `button(..., { color: "#FFFFFF" })` and do not darken or replace the background sprite, the result is white text on the default white button background.
- For dark buttons, keep `color: "#FFFFFF"` and patch the sprite color. For light buttons, use dark text such as `color: "#111827"`.

```javascript
// Dark button with readable white text
b.button("BtnAttack", "Attack", {
  anchor: "bottom-center",
  pos: [-220, 80],
  rect_size: [400, 120],
  font_size: 30,
  color: "#FFFFFF", // text color
});
b.patch_component("BtnAttack", "MOD.Core.SpriteGUIRendererComponent", {
  Color: { r: 0.12, g: 0.16, b: 0.22, a: 1.0 }, // background color
});

// Light button with readable dark text
b.button("BtnRun", "Run", {
  anchor: "bottom-center",
  pos: [220, 80],
  rect_size: [400, 120],
  font_size: 30,
  color: "#111827", // text color
});
b.patch_component("BtnRun", "MOD.Core.SpriteGUIRendererComponent", {
  Color: { r: 0.90, g: 0.94, b: 1.0, a: 1.0 }, // background color
});
```

#### New Method Enum Table

| Method | Argument | Enum | Values |
|--------|------|------|---|
| `mask` | `shape` | `MaskShape` | `Rect=0` (currently the only option) |
| `grid_view` | `fixed_type` | `GridViewFixedType` | `ColumnCountFixed=0` (vertical scroll), `RowCountFixed=1` (horizontal) |
| `grid_view` | `scroll_bar_visible` | `ScrollBarVisibility` | `AlwaysShow=0`, `AutoHide=1`, `Hide=2` |
| `avatar` | `preserve_avatar` | `PreserveSpriteType` | `None=0`, `AspectOnly=1`, `NativeSize=2` |
| `group` | `group_type` | `UIGroupType` | `DefaultType=0`, `UIType=1` (recommended), `EditorType=2` |
| `skeleton` | `preserve_mode` | `PreserveSpriteType` | `None=0`, `AspectOnly=1`, `NativeSize=2` |
| `area_particle` | `particle_type` | `UIAreaParticleType` | `None=0`, `FogCalm=1`, `FogHeavy=2`, `FogLively=3`, `CalmStarField=4`, `StarFieldSimple=5`, `StarFog=6`, `StarFogFlow=7` |
| `basic_particle` | `particle_type` | `UIBasicParticleType` | `None=0` plus 1~45 (fireworks/lightning/sparks/aurora/flamethrower, etc.) |
| `sprite_particle` | `particle_type` | `UISpriteParticleType` | `None=0`, `BurstBig=1`, `SpawnField=2`, `BurstNova=3`, `SimpleSpawn=4`, `Burst=5`, `Stream=6`, `StreamSharp=7`, `AdditiveColor=8` |
| `joystick` | `axis` | `AxisType` | `Axis_4=0`, `Axis_8=1` (default) |
| `joystick` | `up_arrow`/`down_arrow`/`left_arrow`/`right_arrow` | `KeyboardKey` | Integer key codes. defaults: `UpArrow=273`, `DownArrow=274`, `RightArrow=275`, `LeftArrow=276` |

##### `UIBasicParticleType` Full List (synced with Maker ParticlePrefab)

| Value | Name | Value | Name | Value | Name |
|---|---|---|---|---|---|
| 0 | None | 16 | LightningOrbSharp | 31 | DustStorm |
| 1 | Firework | 17 | LightningStrikeSharp | 32 | BigSplash |
| 2 | FireworkCluster | 18 | LightningStrikeSharpTall | 33 | Shower |
| 3 | FireField | 19 | LightningOrbSoft | 34 | Aura |
| 4 | FireFieldIntense | 20 | LightningBlast | 35 | Buff |
| 5 | ToonTallFire | 21 | LightningStrike | 36 | Charge |
| 6 | ToonFireTorch | 22 | LightningStrikeTall | 37 | ChargeOrb |
| 7 | ToonFireTorchIntense | 23 | SparkExplosion | 38 | CircleBurst |
| 8 | RoundFire | 24 | SparkLoop | 39 | Enchant |
| 9 | SoftFireBig | 25 | SparkRadialExplosion | 40 | PillarBurst |
| 10 | SoftTallFire | 26 | StarVortex | 41 | SpinField |
| 11 | SoftFireAdditive | 27 | UpperCylinder | 42 | FlamethrowerSharp |
| 12 | SoftFireAB | 28 | Nova | 43 | FlamethrowerSoft |
| 13 | SpikyFireBigAdditive | 29 | GoopSpray | 44 | FlamethrowerSpiky |
| 14 | SpikyFireAdditive | 30 | GoopSprayEffect | 45 | FlamethrowerToony |
| 15 | FireFlies | | | | |

#### Notes on group / mask / grid_view Usage

- **`group(default_show=False)` pitfall is the same as root** — If the group is saved in a hidden state, child scripts' `OnBeginPlay`/`OnUpdate` may not be called. Keep `default_show=True` for groups containing controller scripts, and toggle with child `Visible`/`Enable`.
- **`mask` requires `SpriteGUIRenderer`** — The builder automatically attaches it, but leaving `image_ruid` empty renders a placeholder (SpawnLocation pin shape). To hide the visual mask shape, keep the default `alpha=0`; to make it visible, specify `alpha`/`color`/`image_ruid`.
- **`grid_view`'s `ItemEntity` is a runtime prefab** — The builder only fills static fields like `TotalCount`/`CellSize`. The actual cell template must be injected in the script's `OnBeginPlay` via `self.Entity.GridViewComponent.ItemEntity = ...` followed by a `Refresh()` call. This is the only component that cannot be completed with the builder alone.

#### Notes on touch_receive / skeleton / particle Usage

- **`touch_receive` has no rendering** — Works without `RaycastTarget`. To create a visible area, place a `b.sprite(...)` or `b.panel(...)` at the same position, and put the touch receiver on the layer above. All 7 events (`UITouchEnter/Exit/Down/Up/BeginDrag/Drag/EndDrag`) are ClientOnly. Actions requiring server sync (e.g., inventory moves from drag results) should be delegated by calling `Server` ExecSpace methods.
- **`skeleton` is Spine 4.1 only** — RUIDs from other versions will fail to load. Track 1 is used internally by the engine, so passing 1 as the `trackIndex` argument in user code's `SetAnimation`/`AddAnimation`/`ClearTrack` will be ignored (use only 0, 2+). The `animations`/`skins` fields only set the initial track 0 animation and active skin list at builder time — runtime changes use ClientOnly methods (`SetAnimation`, `SetAttachment`, etc.).
- **`SkeletonRUID` is a plain string** — The builder serializes it as `"SkeletonRUID": "<ruid>"`. Don't confuse it with SpriteGUIRenderer's `ImageRUID: {"DataId": ...}` MODDataRef wrapping.
- **`area_particle` / `basic_particle` are preset-based** — The `ParticleType` value determines the visual appearance. `LocalScale`/`ParticleSize`/`ParticleSpeed`/`ParticleCount`/`ParticleLifeTime` are global tuning values multiplied on top of the preset. To change the shape itself, switch to a different `particle_type`.
- **Default particle Color is `(0.5, 0.25, 0.25, 1)`** (brown/sepia tone) — preserves the engine default. For white or high-saturation colors, specify `color="#FFFFFF"` / `color=(1,1,1)` explicitly.
- **`AreaSize` engine metadata default is `(0,0)`, which causes particles to emit from a point** — The builder uses `(100, 100)` as a usable default. To intentionally emit from a point, specify `area_size=(0, 0)` explicitly.
- **`play_on_enable=True` (default)** + `loop=True` → infinite playback starts immediately when the entity is enabled. To show the effect only once, use `loop=False`, or set `play_on_enable=False` and control the `Play()` call timing directly from script. `Play`/`Stop` are ClientOnly.

#### Notes on joystick / soft_mask / chat / line / polygon Usage

- **`joystick` is for mobile input only** — Desktop uses keyboard mappings (`up_arrow`/`down_arrow`/`left_arrow`/`right_arrow`) for alternative input. With `dynamic_stick=true` (default), the stick follows the touch start position. The builder attaches both `SpriteGUIRenderer` and `Joystick`, but the engine automatically sets `SpriteGUIRenderer.RaycastTarget` to `false` at `BeginPlay`. If `image_ruid` is not specified, the builder default sprite is used.
- **`soft_mask` is an unpublish feature** — Gated by permission (`EnableUnpublishFeature`). Unlike `MaskComponent`, it supports soft edge clipping, and only `RawImageGUIRenderer`/`SpriteGUIRenderer` children are clipped. `invert_mask=true` clips inside the mask, `invert_outsides=true` clips outside the bounds.
- **`chat` is a world/session-level chat UI** — Typically only one per world. `use_chat_balloon=true` enables speech bubble mode (bubbles above other users' characters). `expand`/`use_chat_emotion`/`enable_voice_chat`/`hide_world_chat_button`/`message_align_bottom` are UI display details.
- **`line`'s `points`** — `[{ pos: [x, y], color: "#RRGGBB" | Color, width: float }, ...]` format. Empty array means nothing is drawn. If a single point contains `null`, the engine will not draw any of it. Corners are smoothed only when `is_flexible=true` + `flexibility>=1`.
- **`polygon`'s `points`** — `[[x, y], ...]` Vector2 array. Fewer than 3 points or self-intersecting polygons won't be drawn (`IsDrawable()` false). `uvs` is only used when `use_custom_uvs=true`, and its length must match `points`.

#### WorldUI Sort Fields (Common)

All 6 methods `sprite`/`text`/`button`/`slider`/`scroll_layout`/`text_input` support the same 4 sort fields. These are only meaningful when UITransform `UIMode=World(2)` (Screen UI ignores sort fields).

```javascript
b.text("BossName", "Boss", { world_ui: true, sorting_layer: "World", order_in_layer: 10 });
// world_ui: true → override_sorting=true, sorting_layer="UI" (default), order_in_layer=0, ignore_map_layer_check=false
// individual override: specify override_sorting / sorting_layer / order_in_layer / ignore_map_layer_check directly
```

`override_sorting=false` (default) means sort fields are emitted but follow the UI group's sorting. Only specify `world_ui: true` or `override_sorting: true` when independent WorldUI sorting is needed.

#### Notes on joystick / soft_mask / chat / line / polygon Usage

- **`joystick` is for mobile input only** — Desktop uses keyboard mappings (`up_arrow`/`down_arrow`/`left_arrow`/`right_arrow`) for alternative input. With `dynamic_stick=true` (default), the stick follows the touch start position. The builder attaches both `SpriteGUIRenderer` and `Joystick`, but the engine automatically sets `SpriteGUIRenderer.RaycastTarget` to `false` at `BeginPlay`. If `image_ruid` is not specified, the builder default sprite is used.
- **`soft_mask` is an unpublish feature** — Gated by permission (`EnableUnpublishFeature`). Unlike `MaskComponent`, it supports soft edge clipping, and only `RawImageGUIRenderer`/`SpriteGUIRenderer` children are clipped. `invert_mask=true` clips inside the mask, `invert_outsides=true` clips outside the bounds.
- **`chat` is a world/session-level chat UI** — Typically only one per world. `use_chat_balloon=true` enables speech bubble mode (bubbles above other users' characters). `expand`/`use_chat_emotion`/`enable_voice_chat`/`hide_world_chat_button`/`message_align_bottom` are UI display details.
- **`line`'s `points`** — `[{ pos: [x, y], color: "#RRGGBB" | Color, width: float }, ...]` format. Empty array means nothing is drawn. If a single point contains `null`, the engine will not draw any of it. Corners are smoothed only when `is_flexible=true` + `flexibility>=1`.
- **`polygon`'s `points`** — `[[x, y], ...]` Vector2 array. Fewer than 3 points or self-intersecting polygons won't be drawn (`IsDrawable()` false). `uvs` is only used when `use_custom_uvs=true`, and its length must match `points`.

#### WorldUI Sort Fields (Common)

All 6 methods `sprite`/`text`/`button`/`slider`/`scroll_layout`/`text_input` support the same 4 sort fields. These are only meaningful when UITransform `UIMode=World(2)` (Screen UI ignores sort fields).

```javascript
b.patch(identifier, { anchor, pos, rect_size, pivot, enable, visible, localize, display_order, new_name }); // UUID or null
b.rename(identifier, newName);  // updates all child paths
b.remove(identifier);           // deletes subtree (root not allowed)
```

### Component CRUD

```javascript
b.add_component(identifier, comp_type, comp_data = null);       // no-op if already exists
b.upsert_component(identifier, comp_type, comp_data = null);    // replaces if exists
b.patch_component(identifier, comp_type, updates);              // field merge
b.remove_component(identifier, comp_type);                      // rejects UITransform
b.set_component_enabled(identifier, comp_type, enabled);
```

`comp_data` defaults to `{"@type": comp_type, "Enable": True}` when omitted. The `componentNames` field is auto-synced.

### Output

```javascript
b.build();                                                   // completed JSON (not saved to file)
b.write(filepath, { lint: true, strict: true, lint_verbose: false, bind: null });
```

### Binding Injection (`.ui` UUID → `.mlua` property)

For `.mlua` scripts to reference entities created by the builder, the property default must contain the UUID. In the AI automation route, the builder updates the `.mlua` file in the same call right after `write()` — without drag binding.

#### Key Fact — A Single Entity UUID Is All You Need

The right side of `.mlua` property defaults is always a **single entity UUID string**. This is the same for component-typed properties.

```lua
property Entity popupGroup    = "<entity UUID>"   -- Entity / EntityRef
property TextComponent message = "<entity UUID>"  -- same for components
property ButtonComponent btnOk = "<entity UUID>"  -- same for components
```

The engine reads the property declaration type (`TextComponent`, etc.) and wraps it at runtime as `MODComponentRef("{uuid}:{TypeName}")` → resolves the component via `entity.GetComponent(typeId)`. Therefore, the builder only needs to pass **one kind: `get_id(path)`**. (The "extract component UUID separately" procedure from older guides was based on an incorrect assumption.)

#### `write(path, { bind: ... })` — write + injection in a single call

```javascript
b.write("ui/PopupGroup.ui", {
  bind: {
    mlua: "RootDesk/MyDesk/UIPopup.mlua",
    props: {
      popupGroup: "/ui/PopupGroup/Panel",       // property Entity popupGroup
      btnOk: "/ui/PopupGroup/Panel/BtnOk",      // property ButtonComponent btnOk
      btnCancel: "Panel/BtnCancel",             // relative path also OK
      message: "Panel/Message",
    },
  },
});
```

`props` = `{mlua property name → entity path}`. The builder converts each path → entity UUID, uses regex to replace the `property <Type> <name> = "..."` line default in the target `.mlua`, and saves as UTF-8.

Or as separate calls:

```javascript
b.write("ui/PopupGroup.ui");
b.inject_bindings("RootDesk/MyDesk/UIPopup.mlua", {
  popupGroup: "Panel",
  btnOk: "Panel/BtnOk",
});
```

#### Protected Failure Cases (RuntimeError)

- Entity path does not exist
- The target `.mlua` does not have that property name at all (typo/undeclared)
- The same property name is declared more than once in the `.mlua` (ambiguous)
- The target `.mlua` file does not exist → `FileNotFoundError`

Verify that the .mlua actually exists and the target property is declared before calling. `.codeblock` is not touched — Maker Refresh regenerates it.

#### Naming Convention (Recommended)

```
/ui/Popup/Panel/BtnOk       → btnOk    (or okBtn)
/ui/Popup/Panel/Message     → message  (or messageText)
/ui/Popup/Panel             → popupGroup / panel / root
```

Keep the last path segment in camelCase + role suffix (`Btn`/`Text`/`Panel`). When in doubt, **explicitly specify the injection table dict** and trust only that — do not auto-infer.

### Scope

- Adding panel / text / sprite / button / slider / scroll_layout / text_input / script
- Child UIGroup (`group`) — subgroup show/hide control
- mask / grid_view / avatar — clipping, virtualized lists, avatar rendering
- touch_receive — invisible drag/multi-touch receiver
- skeleton — Spine 4.1 skeleton UI renderer
- area_particle / basic_particle — area/point particles (preset-based)
- anchor / position / rect_size adjustment
- HUD / popup / menu layout modification
- entity rename / remove (including subtree)
- component add / replace / patch / remove
- path-based entity lookup

## Usage Notes

### Changing Fields Beyond the Signature — Use `patch_component` as a Workaround

Component fields not covered by the signature parameters of `text()` / `sprite()` / `button()` (e.g., `Font`, `LineSpacing`, `DropShadow`, `Padding`, `FillAmount`, `FillOrigin`, `OrderInLayer`, etc.) must be explicitly changed via `patch_component(path, comp_type, updates)`.

```javascript
// Font and line spacing
b.patch_component("Panel/Title", "MOD.Core.TextComponent",
                  { Font: 1, LineSpacing: 1.2 });

// Drop shadow
b.patch_component("Panel/Title", "MOD.Core.TextComponent",
                  { DropShadow: true,
                    DropShadowColor: { r: 0, g: 0, b: 0, a: 0.6 } });

// HP bar: SpriteGUIRenderer Filled mode
b.patch_component("HPBar/Fill", "MOD.Core.SpriteGUIRendererComponent",
                  { Type: 3, FillMethod: 0, FillOrigin: 0,
                    FillAmount: 1.0 });

// Button background color. Do this when button text uses a light color.
b.button("Panel/BtnOk", "OK", { color: "#FFFFFF" }); // text color
b.patch_component("Panel/BtnOk", "MOD.Core.SpriteGUIRendererComponent",
                  { Color: { r: 0.12, g: 0.16, b: 0.22, a: 1.0 } });
```

Design separation (intended forced values per entity):
- `button()` → `RaycastTarget` is always `True` (button = click area)
- `sprite(raycast=False)` is the default (sprite = decoration). Explicitly set `raycast=True` for modal dimmers and drag areas
- `text()`'s background sprite is fixed as a transparent sprite with `alpha=0`

For the full list of enum values such as Alignment, Overflow, ImageType, etc., refer to [`component-api.md`](component-api.md) §Enums (or the inline values in the field tables of [`component-api.md`](component-api.md)).

### `UITransformComponent.ActivePlatform` — UI Not Displayed When Missing from JSON

The `PlatformType` enum (`PC=1, Mobile=2, All=0xff(255)`) determines which platforms the UI is active on. If `ActivePlatform` is missing or set to `0`, the UI can be invisible on both PC and Mobile.

The builder automatically injects `ActivePlatform: 255` (all platforms) when creating a new UITransformComponent. Only watch out for these patterns:

- When partially modifying UITransform fields via `patch_component(identifier, "MOD.Core.UITransformComponent", updates)`, do not touch `ActivePlatform`.
- For mobile-only UI, explicitly change with `b.patch_component(name, "MOD.Core.UITransformComponent", { ActivePlatform: 2 })`. For PC-only, use `1`.
- Among **existing .ui** files loaded via `load()`, entries that lack the ActivePlatform field entirely are **not** auto-corrected. You must fill them in manually with `patch_component`.

### `default_show=False` Caution — Script Lifecycle Halted

The `UIBuilder` default is `default_show=True` (recommended). If you save the root UIGroup as hidden with `default_show=False`, `OnBeginPlay` / `OnUpdate` for scripts inside the group will not be called. This is a common cause of issues like "the popup doesn't appear even after leveling up."

**Standard Pattern** — Always keep the root UIGroup at `default_show=True`, and have scripts toggle the `Enable` property of child entities (`Enable` vs `Visible` difference is covered in [`ui-hierarchy.md`](ui-hierarchy.md) §5 — summary: always use `Enable`. `Visible=False` keeps clicks alive and OnUpdate still runs).

```javascript
const ui = new UIBuilder("LevelUpUI");          // defaultShow=true (default)
ui.sprite("dimmer", { ... });
ui.text("title", "Level Up", { ... });
// Script starts with child entities Enable=false in OnBeginPlay,
// then sets Enable=true to display at the trigger point.
```

Only use `default_show=False` when the group contains **no** controller script and the flow toggles the group's `Enable` at the maker/external level.

**Diagnosis** — When a popup doesn't appear: check root `UIGroupComponent.DefaultShow` → verify whether the controller's `OnBeginPlay` log is printed → if not, the group being hidden is the cause. Recreate with `default_show=True` and migrate to the child `Enable` toggle pattern.

## Out of Scope

- Map entity modification: `references/map.md`
- Model template modification: [`msw-general/references/model.md`](../../msw-general/references/model.md)
- Writing files other than `.ui`

## Resources

- Runtime module: `scripts/msw_ui_builder.cjs`
- Layout preview: `scripts/preview_ui_layout.cjs`
