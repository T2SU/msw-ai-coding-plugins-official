# MSW UI (Maker)

Covers the **UI groups, controls, and layouts** of MapleStory Worlds Maker. RPC paths (such as curl) for switching UI mode and manipulating entities used to be provided, but the **RPC paths have been removed**. Instead, the following three are the standard workflow.

1. **Edit `.ui` files in the `./ui/` folder directly** (JSON structure, flat entity array, `path` expresses hierarchy).
2. Use the **Maker editor's UI tools** to create, place, and manage groups visually.
3. After changes, use **MCP tools** (`refresh`, `screenshot`, etc.) to apply to the workspace, validate, and verify at runtime.

> The **`.ui` JSON schema, field semantics, and RUID notes** are documented inline below — see *`.ui` JSON Schema* and *UITransformComponent Essentials* sections.

---

## RPC Replacement Mapping (Workflow)

| Past RPC role | Current recommended method |
|----------------|----------------|
| `get_ui_mode` / `enter_ui_mode` / `exit_ui_mode` | Switch UI edit mode in Maker (manual). Agent only safely manipulates `.ui` files and scripts. |
| `list_ui_groups` / `select_ui_group` | List of `./ui/*.ui` files and filenames (group unit). Identify by root entity / `EntryKey`. |
| `create_ui_group` / `delete_ui_group` | Add a new `.ui` or delete the file. The built-in group (`DefaultType`) cannot be deleted. |
| `create_ui_control` / `delete_entity` | Add/remove entity JSON in the `ContentProto.Entities` array; keep `path`, `id`, and `componentNames` consistent. |
| `reorder_entity_child` / `list_entity_children` | Adjust **`displayOrder`** and array/DFS order of entities sharing the same parent `path` prefix. |
| `get_entity` / `set_entity_properties` | Read/edit the `@components` block of the matching `id` directly within `.ui`. |
| `select_entity` / `open_window` | Select / open windows in Maker UI. |

**Agent checklist**: edit `.ui` -> **MCP `refresh`** -> **`screenshot`** if needed -> **`play`**, then verify runtime via **`logs`**.

> **`refresh_workspace` is rejected during Play mode.** It returns `{ "status": "unavailable", "reason": "...refresh is disabled during Play Test...", "mode": "play" }` and your edits are silently not applied. Always use the order **`stop` -> `refresh_workspace` -> `play`**. If a UI change appears not to take effect, suspect that you are still in Play mode and the refresh was a no-op.

> **Entity `id` and `EntryKey` UUIDs must be hex-only.** Use only `0-9`, `a-f`, and hyphens. Non-hex characters (`g`-`z`, uppercase) cause the runtime to drop the entire `.ui` file silently with `[LEA-3054] CannotApply : Could not find any recognizable digits.` in the build log -- none of your edits will land. Generate UUIDs with `uuidgen` / `node -e "require('crypto').randomUUID()"` rather than typing memorable strings.

---

## FHD 1920x1080 Coordinate System

- **Reference resolution**: **1920** wide x **1080** tall (landscape UI baseline).
- **Origin**: screen **center** `(0, 0)` (when the root UIGroup is full screen).
- **Y axis**: **up is positive**, down is negative.
- **X axis**: right is positive, left is negative.
- Independent of the actual device resolution, **logical pixels (design coordinates)** are scaled. This is a **different system** from world map coordinates.

| Direction | X range (reference) | Y range (reference) |
|------|----------------|----------------|
| Horizontal | approx. `-960` to `+960` | -- |
| Vertical | -- | approx. `-540` to `+540` |

When laying out, **do not touch `Position` (Vector3).** The single source of truth for UI layout is **`UITransformComponent.anchoredPosition`** plus anchors, `OffsetMin`/`OffsetMax`, and `RectSize` (see *`.ui` JSON Schema* below).

---

## `.ui` JSON Schema

The `.ui` file is a flat array of entities. Hierarchy is expressed by `path` (using `/`). Each entity carries a `componentNames` string and a matching `@components` array. The sections below cover the core schema needed to author `.ui` files by hand.

### UITransformComponent — Fields and JSON

The core component on every UI entity. Determines position, size, anchors, rotation, and scale.

```json
{
  "@type": "MOD.Core.UITransformComponent",
  "AnchorsMin": { "x": 0.0, "y": 0.0 },
  "AnchorsMax": { "x": 1.0, "y": 1.0 },
  "OffsetMin": { "x": 0.0, "y": 0.0 },
  "OffsetMax": { "x": 0.0, "y": 0.0 },
  "Pivot":     { "x": 0.5, "y": 0.5 },
  "anchoredPosition": { "x": 0.0, "y": 0.0 },
  "RectSize":  { "x": 100.0, "y": 100.0 },
  "AlignmentOption": 0,
  "UIScale":    { "x": 1, "y": 1, "z": 1 },
  "UIRotation": { "x": 0, "y": 0, "z": 0 },
  "Position":   { "x": 0, "y": 0, "z": 0 },
  "ActivePlatform": 255
}
```

| Field | Description |
|------|------|
| `AnchorsMin` | Anchor minimum point. `(0,0)` = parent bottom-left, `(1,1)` = top-right. **Normalized 0-1**. |
| `AnchorsMax` | Anchor maximum point. Equal to `AnchorsMin` => fixed point; different => stretch. |
| `OffsetMin` | Offset relative to `AnchorsMin` (left / bottom margin or corner). |
| `OffsetMax` | Offset relative to `AnchorsMax` (right / top margin or corner). |
| `Pivot` | Reference for rotation / scaling (0-1). **Match it to the anchors.** |
| `anchoredPosition` | **Center-point** offset relative to the anchor (parent local, pixels). |
| `RectSize` | UI rectangle size (pixels). |
| `AlignmentOption` | Anchor preset (`AlignmentType` integer; see *Anchor / AlignmentOption Selection Guide* below). |
| `UIScale` / `UIRotation` | UI local scale / Euler angles. |
| `Position` | **Derived cache** — leave at `(0, 0, 0)` (see *Position vs anchoredPosition* below). |
| `ActivePlatform` | `255`=All, `1`=PC, `2`=Mobile. **Recommended 255 for new entities.** |

**Summary**: keep `Position` at `(0,0,0)` in UI; layout is driven by **`anchoredPosition` + anchors + Offset**.

### Anchor Presets

Common anchor configurations and what they do when the parent rectangle resizes:

| Use | `AnchorsMin` | `AnchorsMax` | Sizing |
|------|-----------|-----------|----------|
| **Fill all** (Stretch) | (0, 0) | (1, 1) | Adjust margin via `OffsetMin`/`OffsetMax` |
| **Center fixed** | (0.5, 0.5) | (0.5, 0.5) | Fixed size; specify size via Offset |
| **Top-left** | (0, 1) | (0, 1) | Fixed size, top-left reference |
| **Top-right** | (1, 1) | (1, 1) | Fixed size, top-right reference |
| **Bottom-left** | (0, 0) | (0, 0) | Fixed size, bottom-left reference |
| **Bottom-right** | (1, 0) | (1, 0) | Fixed size, bottom-right reference |
| **Top stretch** | (0, 1) | (1, 1) | Horizontal stretch, vertical fixed |
| **Bottom stretch** | (0, 0) | (1, 0) | Horizontal stretch, vertical fixed |
| **Left stretch** | (0, 0) | (0, 1) | Horizontal fixed, vertical stretch |
| **Right stretch** | (1, 0) | (1, 1) | Horizontal fixed, vertical stretch |

For the integer `AlignmentOption` value (0-15) that pairs with each preset and the matching `Pivot`, see *Anchor / AlignmentOption Selection Guide* below.

### Fixed-Size Element (when anchors are equal)

When `AnchorsMin == AnchorsMax`, `OffsetMin` and `OffsetMax` together determine the rectangle's size and offset from the anchor:

```json
{
  "AnchorsMin": { "x": 0.5, "y": 0.5 },
  "AnchorsMax": { "x": 0.5, "y": 0.5 },
  "OffsetMin": { "x": -150, "y": -50 },
  "OffsetMax": { "x":  150, "y":  50 }
}
```

-> Size: 300 x 100, positioned at the parent's center (anchor (0.5, 0.5), centered around it).

### 4-Value Conversion Formula (point anchor)

`anchoredPosition`, `OffsetMin`, `OffsetMax`, `RectSize`, and `Pivot` describe **the same rectangle in different coordinates**. Updating one without the others leaves stale values; the runtime treats `OffsetMin`/`OffsetMax` as authoritative, so the UI keeps its old layout.

```
size      = OffsetMax - OffsetMin                        # equals RectSize
OffsetMin = anchoredPosition - pivot * RectSize
OffsetMax = anchoredPosition + (1 - pivot) * RectSize
```

Mental model: from `pivot`, move down/left by `pivot * size` to reach the bottom-left corner (`OffsetMin`); move up/right by `(1 - pivot) * size` to reach the top-right corner (`OffsetMax`).

**Worked example** -- a 200x100 panel, 50px right of the parent's center anchor, pivot at center:

```
Pivot            = (0.5, 0.5)
RectSize         = (200, 100)
anchoredPosition = (50, 0)

OffsetMin = (50, 0) - (0.5, 0.5) * (200, 100) = (-50, -50)
OffsetMax = (50, 0) + (0.5, 0.5) * (200, 100) = (150, 50)
```

**Authoring flow**: decide `Pivot`, `RectSize`, `Anchors`, `anchoredPosition` first; then compute and write `OffsetMin`/`OffsetMax`; leave `Position` at `(0, 0, 0)`. Skipping the recompute is the most common cause of "I changed `anchoredPosition` but the UI didn't move."

### Position vs anchoredPosition

- `Position` is a **derived cache** the editor populates from `anchoredPosition + anchor canvas position + UIScale`. It is an output, not an author input.
- When hand-authoring `.ui`, leave `Position: (0, 0, 0)`. The editor will fill it in next time the file is opened in the UI editor.
- **Never set `Position` to position UI** -- it conflicts with the anchor / pivot system and the runtime falls back to inconsistent placement.
- Real placement is done exclusively via `anchoredPosition` + `Anchors` + `Pivot` + `OffsetMin`/`OffsetMax`.

> If you see non-zero `Position` values in someone else's `.ui` (e.g. `DefaultGroup.ui`'s `Button_Attack` saves `(785.1, -208, 0)`), that is the editor's cache. Treat it as read-only. Do not copy those values when authoring new entities.

### SortingLayer / OrderInLayer

- Within the same layer, larger `OrderInLayer` shows in front.
- UI always renders in front of world objects.

### Major UI Components — JSON Examples

#### UIGroupComponent

UI container. Groups child UI elements.

```json
{ "@type": "MOD.Core.UIGroupComponent", "DefaultShow": true, "GroupOrder": 0, "GroupType": 1 }
```

#### CanvasGroupComponent

Controls the group's transparency and interaction.

```json
{
  "@type": "MOD.Core.CanvasGroupComponent",
  "GroupAlpha": 1.0,
  "BlocksRaycasts": true,
  "Interactable": true
}
```

#### SpriteGUIRendererComponent

Renders UI images (see also the dedicated section below for `ImageRUID` sourcing).

```json
{
  "@type": "MOD.Core.SpriteGUIRendererComponent",
  "ImageRUID": { "DataId": "32-char-hex" },
  "Color": { "r": 1, "g": 1, "b": 1, "a": 1 },
  "Type": 0
}
```

`Type` (`ImageType`): `0`=Simple, `1`=Sliced, `2`=Tiled, `3`=Filled.

#### TextComponent

Displays text.

```json
{
  "@type": "MOD.Core.TextComponent",
  "Text": "Hello",
  "FontSize": 24,
  "FontColor": { "r": 1, "g": 1, "b": 1, "a": 1 },
  "Alignment": 4,
  "Overflow": 0
}
```

`Alignment` (`TextAlignmentType`): `0`=UpperLeft, `1`=UpperCenter, `2`=UpperRight, `3`=MiddleLeft, `4`=MiddleCenter, `5`=MiddleRight, `6`=LowerLeft, `7`=LowerCenter, `8`=LowerRight.

#### ButtonComponent

Button. Fires `ButtonClickEvent`.

```json
{
  "@type": "MOD.Core.ButtonComponent",
  "Interactable": true,
  "Colors": {
    "NormalColor":     { "r": 1,    "g": 1,    "b": 1,    "a": 1 },
    "PressedColor":    { "r": 0.78, "g": 0.78, "b": 0.78, "a": 1 },
    "DisabledColor":   { "r": 0.78, "g": 0.78, "b": 0.78, "a": 0.5 }
  },
  "Transition": 1
}
```

`Transition` (`TransitionType`): `0`=None, `1`=ColorTint, `2`=SpriteSwap.

> Full per-component property/method/event tables (including less common components) live in [ui/ui-components.md](ui/ui-components.md). Full enum value tables live in [ui/ui-enums.md](ui/ui-enums.md).

---

## Anchor / AlignmentOption Selection Guide

`AlignmentType` enum values map to `UITransformComponent.AlignmentOption`.

Common interpretation:
- **`anchoredPosition`**: how far the **center of the UI rectangle** is from the anchor reference point (parent local, pixels).
- **`+x`**: right. **`-x`**: left. **`+y`**: up. **`-y`**: down.

### Center -- `AlignmentOption: 0`

| Item | Value |
|------|-----|
| Meaning | Parent **dead center** |
| Typical Anchors | `(0.5, 0.5)` / `(0.5, 0.5)` |
| Recommended Pivot | `(0.5, 0.5)` |

Examples: `(0, 0)` dead center, `(300, 0)` 300px right, `(0, 200)` 200px up.

> Combinations that only set `AlignmentOption: 0` and rely on auto-correcting anchors can drift. **Where possible, explicitly align the enum value below with Anchors.**

> **Concrete drift case** -- when `AlignmentOption` does not match `Anchors`, the runtime force-corrects `Anchors` to follow the AlignmentOption preset, and your `anchoredPosition` is reinterpreted relative to the new (wrong) anchor.
>
> ```jsonc
> {
>   "AlignmentOption": 8,                    // BottomRight
>   "AnchorsMin": { "x": 0.5, "y": 0.5 },   // Center  ← conflicts
>   "AnchorsMax": { "x": 0.5, "y": 0.5 },
>   "Pivot":      { "x": 0.5, "y": 0.5 },
>   "anchoredPosition": { "x": 0, "y": 0 }
> }
> ```
>
> -> AlignmentOption=8 overrides anchors back to `(1, 0)`, so `anchoredPosition (0, 0)` is now interpreted as "(0, 0) from the bottom-right anchor". The panel is pinned to the bottom-right corner regardless of what you write.
>
> **Refactoring trap**: relocating a panel from one corner to another (e.g. BottomRight -> Center), it is easy to update `Anchors` and `Pivot` and forget `AlignmentOption`. The stale enum then forces the anchor back. Always update `AlignmentOption`, `Anchors`, and `Pivot` together as a triplet.

### TopLeft -- `AlignmentOption: 4`

| Item | Value |
|------|-----|
| Typical Anchors | `(0, 1)` / `(0, 1)`, Pivot `(0, 1)` |

Example: `(80, -60)` -- 80px inward from the corner, 60px down.

### TopCenter -- `AlignmentOption: 3`

| Item | Value |
|------|-----|
| Typical Anchors | `(0.5, 1)` / `(0.5, 1)`, Pivot `(0.5, 1)` |

Example: `(0, -40)` top-center title.

### TopRight -- `AlignmentOption: 5`

| Item | Value |
|------|-----|
| Typical Anchors | `(1, 1)` / `(1, 1)`, Pivot `(1, 1)` |

Example: `(-80, -60)` typical top-right **close button**.

### BottomCenter -- `AlignmentOption: 6`

| Item | Value |
|------|-----|
| Typical Anchors | `(0.5, 0)` / `(0.5, 0)`, Pivot `(0.5, 0)` |

Example: `(0, 80)` bottom confirm button bar.

### BottomLeft -- `AlignmentOption: 7`

| Item | Value |
|------|-----|
| Typical Anchors | `(0, 0)` / `(0, 0)`, Pivot `(0, 0)` |

Example: `(120, 100)` bottom-left mini-map / virtual pad.

### BottomRight -- `AlignmentOption: 8`

| Item | Value |
|------|-----|
| Typical Anchors | `(1, 0)` / `(1, 0)`, Pivot `(1, 0)` |

Example: `(-120, 100)` bottom-right skill slot.

### Stretch / Axis Stretch

| `AlignmentOption` | Name | Use |
|-------------------|------|-----------|
| 9 | HorizontalTop | Horizontal stretch, top |
| 10 | HorizontalCenter | Horizontal stretch, vertical center |
| 11 | HorizontalBottom | Horizontal stretch, bottom |
| 12 | VerticalLeft | Vertical stretch, left (HP bars, etc.) |
| 13 | VerticalCenter | Vertical stretch, horizontal center |
| 14 | VerticalRight | Vertical stretch, right |
| 15 | StretchAll | **Fill the entire face** (background panels). Use `OffsetMin`/`OffsetMax` for margins |

If **Pivot direction is not aligned** with the anchor direction, you get position drift and offset errors in slider / bar UI.

---

## UIGroup Separation Principles

Group UI by **shared function, role, and display condition** into one group (file or root subtree).

**Good examples**
- `DefaultGroup`: always-visible HUD, chat, basic buttons.
- `PopupGroup`: only modals / confirm windows -- off at start, on only on event.
- `ToastGroup`: short notifications only.

**Bad examples**
- Mixing popup layouts and persistent HUD into the **same physical file**, hiding by `displayOrder` alone.
- Cramming different contexts (inventory vs. settings vs. battle HUD) into **one UIGroup**.

**Principle**: split by **content unit**. If "are they toggled on/off together?" differs, they are split candidates.

---

## UI Entity Hierarchy (parent-child)

In `.ui` it is a **flat array**, but **`path`** uses `/` to express parent-child.

**When hierarchy helps**
- When **all children must follow** a panel as it moves.
- When grouping **item templates** and mask children inside a scroll area.
- When restricting the anchor reference to a **subregion** of the parent.

**When to avoid**
- Putting unrelated widgets under a **deep virtual parent** just to lengthen `path`.
- Toggling `Enable` redundantly with scripts on **each sibling** when hiding the parent alone would suffice.

### Hierarchy Example

A typical multi-group screen tree:

```
UIGroup (1920x1080, fill all)
+-- DefaultGroup (default UI)
|   +-- ScoreText (TextComponent)
+-- PopupGroup (popup)
|   +-- Background (SpriteGUIRendererComponent, translucent)
|   +-- Panel (UIGroupComponent)
|   |   +-- Title (TextComponent)
|   |   +-- Message (TextComponent)
|   |   +-- BtnOk (ButtonComponent)
|   |   +-- BtnCancel (ButtonComponent)
+-- ToastGroup (toast)
    +-- ToastPanel
        +-- ToastText (TextComponent)
```

- Top level: `UIGroup` (1920x1080).
- Split by function into groups (Default, Popup, Toast).
- Popups start with `Enable = false` and are activated when needed.

---

## Default UI Groups

| Group | Role |
|------|------|
| **DefaultGroup** | Default HUD, chat, and other persistent UI. `DefaultType` family. |
| **ToastGroup** | Short messages / notifications. |
| **PopupGroup** | Modal / confirm-cancel overlays. |

Pattern: the **root entity** carries `UIGroupComponent` + `CanvasGroupComponent` + a full-screen `UITransform`.

### Adding a custom UIGroup

The three groups above are not exhaustive. Any new `.ui` file mounts automatically as long as the root entity has the standard configuration -- there is **no separate registration step**, and Maker UI editor vs. direct `.ui` editing produce equivalent runtime behavior.

Required root-entity setup:

```jsonc
{
  "componentNames": "MOD.Core.UITransformComponent,MOD.Core.UIGroupComponent,MOD.Core.CanvasGroupComponent",
  "modelId": "uigroup",
  "origin": {
    "type": "Model",
    "entry_id": "uigroup",
    "sub_entity_id": null,
    "root_entity_id": null,
    "replaced_model_id": null
  },
  "@components": [
    { "@type": "MOD.Core.UITransformComponent",  /* full-screen stretch: AlignmentOption 15, Anchors (0,0)-(1,1), RectSize 1920x1080, all Offsets/Position 0 */ },
    { "@type": "MOD.Core.UIGroupComponent", "DefaultShow": true, "GroupType": 1, "GroupOrder": <int> },
    { "@type": "MOD.Core.CanvasGroupComponent" /* ... */ }
  ]
}
```

If a custom UIGroup does not appear, the cause is almost always one of: 4-value desync (see *`.ui` JSON Schema -> 4-Value Conversion Formula* above), `AlignmentOption` / `Anchors` mismatch (see *Anchor / AlignmentOption Selection Guide* above), or the root not being full-screen stretch -- **not** a registration issue.

---

## Default UI Entity Types and Components

| Type | Role | Representative `componentNames` (the `MOD.Core.` prefix may be omitted) |
|------|------|---------------------------------------------------|
| **Image** | Sprite display | `UITransformComponent`, `SpriteGUIRendererComponent` |
| **Button** | Click / state | `UITransformComponent`, `SpriteGUIRendererComponent`, `TextComponent` (optional), `ButtonComponent`, `script.*` (optional) |
| **Text** | Label | `UITransformComponent`, `TextComponent` (+ `SpriteGUIRendererComponent` if a background is needed) |
| **Input Text** | Input field | `UITransformComponent`, `TextComponent`, `TextInputComponent` |
| **Scroll View** | List / scroll | `UITransformComponent`, `SpriteGUIRendererComponent` (optional), `ScrollLayoutGroupComponent` |

`modelId` (`uigroup`, `uisprite`, `uibutton`, `uiempty`) is what the editor uses to fill in component presets. Using `uisprite` for a **text-only entity** attaches a **white background** that can occlude other UI, so for text-only prefer the **`uiempty` + `TextComponent`** pattern first.

---

## SpriteGUIRendererComponent

| Field | Description |
|------|------|
| **`ImageRUID`** | DataRef of the displayed image (**different name from world `SpriteRUID`**). |
| **`Type`** (`ImageType`) | `0` Simple, `1` Sliced, `2` Tiled, `3` Filled. |
| **`Color`** | Tint RGBA. With `Type: Filled(3)`, the **Color tint may behave unexpectedly** -- consider Simple + width adjustment for HP bars. |
| `OrderInLayer`, `SortingLayer` | Overlap within the same layer. UI is usually on the `"UI"` layer. |

> **ImageRUID source priority:**
> 1. **`msw-ui-template` skill → style-specific `ruid-map.md`** — read first. The skill is **file-based** (`disable-model-invocation: true`) — open the files with `Read`/`Glob` under `plugins/msw-maker-base-skill/skills/msw-ui-template/`, do NOT invoke it via the `Skill` tool. Each style folder (`style-1-black/`, `style-2-diary/`, `style-3-wood/`, `style-4-blue/`) has a curated RUID table by role (panel backgrounds, buttons, close icons, slots, gauges).
> 2. **`scripts/ruid-lookup.cjs` / `scripts/ui-structure.cjs`** — for ad-hoc queries (`--role`, `--entity`, `--grep`) beyond what `ruid-map.md` covers:
>    ```
>    node plugins/msw-maker-base-skill/skills/msw-ui-template/scripts/ruid-lookup.cjs --style <1-4> --role button
>    node plugins/msw-maker-base-skill/skills/msw-ui-template/scripts/ui-structure.cjs --style <1-4> --entity BasicPopup
>    node plugins/msw-maker-base-skill/skills/msw-ui-template/scripts/ui-structure.cjs --style <1-4> --grep ExitButton
>    ```
> 3. **Cross-style fallback** — if the chosen style's `ruid-map.md` lacks the role, check other styles' `ruid-map.md`. The visual won't match perfectly, but the role-appropriate RUID is reusable.
> 4. **Custom RUID from the user** — if no template style covers a UI frame role (button background, panel chrome, close icon, gauge frame), ask the user to provide one.
>
> **When to use `msw-search` vs not (for UI work):**
> - ✅ Use `msw-search` for **game content placed inside UI**: monster portraits, item icons, character avatars, equipment thumbnails, skill icons. These are world sprites that happen to be displayed in a UI.
> - ❌ Do NOT use `msw-search` for **UI frame/chrome**: button backgrounds, panel backgrounds, close icons, dividers, gauge frames. `msw-search` does not index these resources — use `ruid-map.md` instead.

> **Empty `ImageRUID` renders as fully transparent.** `Color` is a tint multiplied against the sprite texture; with `ImageRUID.DataId: ""` there is no texture, and the tint produces nothing -- the component is invisible regardless of `Color`. For solid-color rectangles (panels, dots, dividers, bars) use a plain rectangular sprite as a fallback texture and apply the color as a tint:
>
> ```jsonc
> "ImageRUID": { "DataId": "50ab06b1dcd4485bb021b0ff3634be86" },
> "Color": { "r": 0.0, "g": 0.5, "b": 0.0, "a": 0.85 }
> ```

---

## ScrollLayoutGroupComponent

- Lays out and scrolls child UI entities as **a single bundle**.
- **`Type`**: `Horizontal`, `Vertical`, `Grid` (`LayoutGroupType`).
- **`Spacing`**, **`Padding`**, **`ChildAlignment`**: list spacing, padding, alignment.
- **`UseScroll`**, scrollbar visibility, thickness, color, RUID.
- **Dynamic list**: set `"enable": false` on the child template entity, then `Clone` at runtime (however, `enable: false` has an issue where script **Entity property bindings end up nil**, so when bindings are needed, leave `.ui` as `true` and consider the pattern of setting `Enable = false` in `OnBeginPlay`).

---

## Per-Control Property Summary

### Image (`SpriteGUIRendererComponent`)
- `ImageRUID`, `Type`, `Color`, `PreserveSprite`, `FillAmount` (Filled).

### Button (`ButtonComponent` + sprite + text)
- `Interactable`, `NormalColor` / `PressedColor` / `DisabledColor`, transition type.
- Handle clicks with **`ButtonClickEvent`** or a connected `script`.

### Text (`TextComponent`)
- `Text`, `FontSize`, `FontType`, `Color`, `Alignment`, `OverflowMode`.

### Text Input (`TextInputComponent` + `TextComponent`)
- `ContentType`, `LineType`, value-change / submit events.
- Compose placeholder and background with sibling/parent `SpriteGUIRenderer`.

---

## UI Readability and Contrast (Color Combinations)

| Use | Background `Color` example | Foreground example | Note |
|------|-------------------|------------------------|------|
| Dark panel | `{r:0.1,g:0.1,b:0.12,a:0.95}` | `{r:1,g:1,b:1,a:1}` | Light text |
| Light panel | `{r:0.95,g:0.95,b:0.92,a:1}` | `{r:0.1,g:0.1,b:0.12,a:1}` | Dark text |
| Translucent overlay | `{r:0,g:0,b:0,a:0.55}` | `{r:1,g:1,b:1,a:1}` | Popup dim |
| Accent button | `{r:0.2,g:0.45,b:0.9,a:1}` | `{r:1,g:1,b:1,a:1}` | Single accent color |
| Disabled | Same tone | `{r:0.78,g:0.78,b:0.78,a:0.5}` | Consistent with `DisabledColor` |

**Avoid**: low-contrast pale-gray text on pale-gray background; pure red + pure green (color-vision issues).

---

## UIGroup Display Control and Script Integration

- **`UIGroupComponent.DefaultShow`**: whether to start on or off. `false` for popup-only.
- **`CanvasGroupComponent.Alpha` / `Interactable` / `BlocksRaycasts`**: fade and input blocking.
- **`Entity.Enable`**: turning off the group root controls all children.

**Pattern**: `PopupGroup` root `DefaultShow = false` -> when condition is met, `Enable = true` plus alpha animation.

### Why `DefaultShow` matters

- If on from the start, popups can **flash on the first frame** or **inputs collide**.
- Combined with `GroupOrder`, it determines **inter-layer occlusion**.

---

## Script Boundary: Layout vs. Runtime Control

| Area | `./ui` / Maker | Script (runtime) |
|------|---------------------------|-------------------|
| Anchor / resolution layout | Primary | Possible to change but costly |
| Initial strings / sprites | Recommended | Data injection possible |
| Button **event handling**, game state | Secondary | Primary |
| Dynamic list `Clone`, scroll position | Templates only | Primary |
| Show / hide, popup flow | Initial `DefaultShow` | `Enable`, `Alpha` |

**Principle**: **static stuff in `.ui`**, **state and game rules in scripts**. Single responsibility.

---

## File-Based Workflow Summary

0. **Adding new UI groups, popups, or HUD from scratch** → Read the **`msw-ui-template` skill's files directly** (`Read` / `Glob` under `plugins/msw-maker-base-skill/skills/msw-ui-template/` — do NOT invoke via the `Skill` tool; the skill has `disable-model-invocation: true`). Pick the style that matches the game genre, then use the template files as a structural reference.
1. Open **`./ui/<group-name>.ui`**.
2. In `ContentProto.Entities`, edit the root and child `path`, `id`, `displayOrder`, `componentNames`, `@components`.
3. Verify it does not violate the *`.ui` JSON Schema* section above (especially the 4-Value Conversion Formula and the Position/anchoredPosition rule).
4. Save, then **MCP `refresh`** -> **`screenshot`**.

For complex new UI, **create in the editor first, then fine-tune the JSON** (especially given `TextComponent` loading issues).

---

# Runtime UI Scripting

Separate from `.ui` file editing, the key patterns needed when **controlling UI from scripts**.

---

## Enable vs Visible

| Property | Scope | Hierarchy inheritance |
|------|----------|----------|
| `Enable` | Behavior + input + rendering, all of it | Parent false -> all children inactive |
| `Visible` | Rendering only | Parent false -> all children invisible |

```lua
entity:SetEnable(true)
entity:SetEnable(false)
entity:SetVisible(false)

-- SetEnable(enable, reset?, shouldSync?)
```

- `EnabledInHierarchy` / `VisibleInHierarchy` -- effective state with the parent chain applied (read-only).
- **Use `Enable` for UI popups / panels** -- because Enable=false also blocks input.

---

## Component Combination Recipes

| Use | Required components |
|------|-------------|
| Root UIGroup | UITransform + UIGroup + CanvasGroup |
| Empty container | UITransform |
| Image | UITransform + SpriteGUIRenderer |
| Text + background | UITransform + SpriteGUIRenderer + Text |
| Button | UITransform + SpriteGUIRenderer + Text + Button |
| Scroll list | UITransform + SpriteGUIRenderer + ScrollLayoutGroup |
| Mask area | UITransform + SpriteGUIRenderer + Mask |
| Text input | UITransform + SpriteGUIRenderer + TextInput |
| Slider | UITransform + SpriteGUIRenderer + Slider |

---

## Event Handling

### Button click

```lua
property ButtonComponent btnOk = "uuid"
property any clickHandler = nil   -- ConnectEvent return: EventHandlerBase object

@ExecSpace("ClientOnly")
method void OnBeginPlay()
    self.clickHandler = self.btnOk.Entity:ConnectEvent(ButtonClickEvent, self.OnClick)
end

method void OnClick()
    -- handle click
end

method void OnEndPlay()
    self.btnOk.Entity:DisconnectEvent(ButtonClickEvent, self.clickHandler)
end
```

### Text input

```lua
property TextInputComponent input = "uuid"
property any submitHandler = nil

method void OnBeginPlay()
    self.submitHandler = self.input.Entity:ConnectEvent(TextInputSubmitEvent, self.OnSubmit)
end

method void OnSubmit(TextInputSubmitEvent event)
    local text = event.text
end
```

### Slider

```lua
property SliderComponent slider = "uuid"
property any sliderHandler = nil

method void OnBeginPlay()
    self.sliderHandler = self.slider.Entity:ConnectEvent(SliderValueChangedEvent, self.OnValueChanged)
end

method void OnValueChanged(SliderValueChangedEvent event)
    local value = event.Value
end
```

### Touch / drag

```lua
-- attach UITouchReceiveComponent
entity:ConnectEvent(UITouchDownEvent, handler)
entity:ConnectEvent(UITouchDragEvent, handler)
entity:ConnectEvent(UITouchUpEvent, handler)
```

**Required: always DisconnectEvent in OnEndPlay** -- otherwise memory leaks.

---

## Open / Close Popup

```lua
property Entity popupGroup = "uuid"

method void Open()
    self.popupGroup.Enable = true
end

method void Close()
    self.popupGroup.Enable = false
end
```

For a fade, interpolate `CanvasGroupComponent.GroupAlpha` from 0 to 1 (details: [ui/ui-patterns.md](ui/ui-patterns.md)).

---

## GridView (Virtualization for Large Lists)

```lua
property GridViewComponent gridView = "uuid"

method void OnBeginPlay()
    self.gridView.TotalCount = 100
    self.gridView.OnRefresh = function(index, entity)
        entity.TextComponent.Text = "Item " .. tostring(index)
    end
    self.gridView.OnClear = function(index, entity)
        -- clean up off-screen items
    end
    self.gridView:Refresh(true, true)
end
```

---

## Runtime UI Caveats

1. **Use anchoredPosition** -- never set Position directly.
2. **UI entities are client-only** -- if an @Component on a UI entity defines `@ExecSpace("Server")`, `@ExecSpace("ServerOnly")`, or `@ExecSpace("Multicast")` methods, a runtime warning (`'<entity>' is client only. '<component>.<method>' doesn't work normally.`) is emitted and **RPCs do not work**. `@Sync` properties are also not synchronized. When UI-to-server communication is needed, **route through an @Logic outside the UI entity, or a map entity @Component**, then call the Server RPC.
3. **No UI entity access from server** -- UI entities exist only on clients. Referencing a UI entity in `@ExecSpace("Server")` / `@ExecSpace("ServerOnly")` methods returns **nil**. For server-to-UI updates, route through an `@ExecSpace("Client")` RPC.
4. **Always disconnect events in OnEndPlay** -- DisconnectEvent.
5. **UIGroup DefaultShow=false** -- not visible until Enable=true.
6. **Do not attach UI components (ButtonComponent, etc.) to map entities** -- UI-only.

---

## Reference Documents

- [ui/ui-components.md](ui/ui-components.md) -- per-component property / method / event API (full tables)
- [ui/ui-enums.md](ui/ui-enums.md) -- complete UI enum list
- [ui/ui-patterns.md](ui/ui-patterns.md) -- real-world patterns: popups, toasts, HP bars, tabs, drag-and-drop, etc.
- **`msw-search`** -- UI implementation guide and component API details

> The previous `ui/ui-schema.md` has been merged into this file (sections *FHD 1920x1080 Coordinate System* and *`.ui` JSON Schema*).
