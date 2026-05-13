# UI Enum Reference

Full list of UI-related enums. All values are int32.

---

## AlignmentType -- Anchor Preset

Used by UITransformComponent.AlignmentOption.

| Name | Value | Description |
|------|---|------|
| Center | 0 | Fixed at parent center |
| Left | 1 | Parent left middle |
| Right | 2 | Parent right middle |
| TopCenter | 3 | Parent top center |
| TopLeft | 4 | Parent top-left |
| TopRight | 5 | Parent top-right |
| BottomCenter | 6 | Parent bottom center |
| BottomLeft | 7 | Parent bottom-left |
| BottomRight | 8 | Parent bottom-right |
| HorizontalTop | 9 | Top, follows parent width horizontally |
| HorizontalCenter | 10 | Center, follows parent width horizontally |
| HorizontalBottom | 11 | Bottom, follows parent width horizontally |
| VerticalLeft | 12 | Left, follows parent height vertically |
| VerticalCenter | 13 | Center, follows parent height vertically |
| VerticalRight | 14 | Right, follows parent height vertically |
| StretchAll | 15 | Fully matches parent size |

---

## TextAlignmentType -- Text Alignment

Used by TextComponent.Alignment.

| Name | Value | Description |
|------|---|------|
| UpperLeft | 0 | Top-left |
| UpperCenter | 1 | Top center |
| UpperRight | 2 | Top-right |
| MiddleLeft | 3 | Left middle |
| MiddleCenter | 4 | Center |
| MiddleRight | 5 | Right middle |
| LowerLeft | 6 | Bottom-left |
| LowerCenter | 7 | Bottom center |
| LowerRight | 8 | Bottom-right |

---

## TextHorizontalAlignmentOption -- Horizontal Alignment (TextMeshPro)

| Name | Value | Description |
|------|---|------|
| Left | 1 | Left aligned |
| Center | 2 | Center aligned |
| Right | 4 | Right aligned |
| Justified | 8 | Justified (word spacing) |
| Flush | 16 | Justified (letter spacing) |
| Geometry | 32 | Geometric center |

---

## TextVerticalAlignmentOption -- Vertical Alignment (TextMeshPro)

| Name | Value | Description |
|------|---|------|
| Top | 256 | Top |
| Middle | 512 | Middle |
| Bottom | 1024 | Bottom |
| Baseline | 2048 | Baseline |
| Geometry | 4096 | Geometric center |
| Capline | 8192 | Cap line |

---

## FontType -- Font

| Name | Value | Description |
|------|---|------|
| Default | 0 | Default font |
| Maple | 1 | MapleStory font |
| Bazzi | 2 | Bazzi font |
| Football | 3 | Football Gothic font |

---

## FontStyleType -- Font Style

Bit flags. Combinable.

| Name | Value | Description |
|------|---|------|
| Normal | 0 | Default |
| Bold | 1 | Bold |
| Italic | 2 | Italic |
| Underline | 4 | Underline |
| LowerCase | 8 | Lowercase |
| UpperCase | 16 | Uppercase |
| SmallCaps | 32 | Small caps |
| Strikethrough | 64 | Strikethrough |

---

## OverflowType -- Text Overflow

| Name | Value | Description |
|------|---|------|
| Overflow | 0 | Show outside the area |
| Truncate | 1 | Truncate |
| Ellipsis | 2 | Ellipsis (...) |

---

## TextOverflowMode -- Text Overflow (TextMeshPro)

| Name | Value | Description |
|------|---|------|
| Overflow | 0 | Show outside the area |
| Ellipsis | 1 | Ellipsis |
| Truncate | 2 | Truncate |
| Page | 3 | Page split |

---

## ImageType -- Image Rendering

| Name | Value | Description |
|------|---|------|
| Simple | 0 | Original image |
| Sliced | 1 | 9-slice (corners stay intact when size changes) |
| Tiled | 2 | Tiled repeat |
| Filled | 3 | Partial fill (progress bar) |

---

## FillMethodType -- Fill Direction

For ImageType.Filled.

| Name | Value | Description |
|------|---|------|
| Horizontal | 0 | Horizontal |
| Vertical | 1 | Vertical |
| Radial90 | 2 | 90-degree radial |
| Radial180 | 3 | 180-degree radial |
| Radial360 | 4 | 360-degree radial |

---

## TransitionType -- Button Transition Effect

| Name | Value | Description |
|------|---|------|
| None | 0 | No effect |
| ColorTint | 1 | Color change |
| SpriteSwap | 2 | Image swap |

---

## ButtonState -- Button State

| Name | Value | Description |
|------|---|------|
| Normal | 0 | Default |
| Hover | 1 | Mouse over |
| Pressed | 2 | Pressed |
| Released | 3 | Released |
| Clicked | 4 | Short click |

---

## LayoutGroupType -- Layout Direction

| Name | Value | Description |
|------|---|------|
| Horizontal | 0 | Horizontal layout |
| Vertical | 1 | Vertical layout |
| Grid | 2 | Grid layout |

---

## ScrollBarVisibility -- Scrollbar Visibility

| Name | Value | Description |
|------|---|------|
| AlwaysShow | 0 | Always shown |
| AutoHide | 1 | Shown only when scrollable |
| Hide | 2 | Always hidden |

---

## UITransformAxis -- UI Axis

| Name | Value | Description |
|------|---|------|
| Horizontal | 0 | Horizontal axis |
| Vertical | 1 | Vertical axis |

---

## GridLayoutAxis -- Grid Layout Axis

| Name | Value | Description |
|------|---|------|
| Horizontal | 0 | Add children horizontally |
| Vertical | 1 | Add children vertically |

---

## GridLayoutConstraint -- Grid Constraint

| Name | Value | Description |
|------|---|------|
| Flexible | 0 | Auto rows / columns |
| FixedColumnCount | 1 | Fixed column count |
| FixedRowCount | 2 | Fixed row count |

---

## GridLayoutCorner -- Grid Start Position

| Name | Value | Description |
|------|---|------|
| UpperLeft | 0 | From top-left |
| UpperRight | 1 | From top-right |
| LowerLeft | 2 | From bottom-left |
| LowerRight | 3 | From bottom-right |

---

## GridViewFixedType -- GridView Fixed Axis

| Name | Value | Description |
|------|---|------|
| ColumnCountFixed | 0 | Fixed column count |
| RowCountFixed | 1 | Fixed row count |

---

## ChildAlignmentType -- Child Alignment

| Name | Value | Description |
|------|---|------|
| UpperLeft | 0 | Top-left |
| UpperCenter | 1 | Top center |
| UpperRight | 2 | Top-right |
| MiddleLeft | 3 | Left middle |
| MiddleCenter | 4 | Center |
| MiddleRight | 5 | Right middle |
| LowerLeft | 6 | Bottom-left |
| LowerCenter | 7 | Bottom center |
| LowerRight | 8 | Bottom-right |

---

## UIModeType -- UI Drawing Mode

| Name | Value | Description |
|------|---|------|
| None | 0 | Initial state |
| Screen | 1 | 2D screen coordinates |
| World | 2 | World coordinates |

---

## UIGroupType -- UI Group Type

| Name | Value | Description |
|------|---|------|
| None | 0 | Unused |
| DefaultType | 1 | Default group (auto-created, cannot be deleted) |
| UIType | 2 | Group created by the UI editor |
| EditorType | 3 | Editor-only group |

---

## MaskShape -- Mask Shape

| Name | Value | Description |
|------|---|------|
| Rect | 0 | Rectangle |
| Circle | 1 | Circle |

---

## GradientModes -- Gradient

| Name | Value | Description |
|------|---|------|
| Single | 0 | Single color |
| Horizontal | 1 | Horizontal gradient |
| Vertical | 2 | Vertical gradient |
| FourCorners | 3 | Four-corner gradient |

---

## HorizontalScrollBarDirection

| Name | Value | Description |
|------|---|------|
| LeftToRight | 0 | Left -> right |
| RightToLeft | 1 | Right -> left |

---

## VerticalScrollBarDirection

| Name | Value | Description |
|------|---|------|
| BottomToTop | 2 | Bottom -> top |
| TopToBottom | 3 | Top -> bottom |

---

## UIAreaParticleType -- UI Area Particle

| Name | Value | Description |
|------|---|------|
| None | 0 | None |
| FogCalm | 1 | Calm fog |
| FogHeavy | 2 | Heavy fog |
| FogLively | 3 | Lively fog |
| CalmStarField | 4 | Calm star field |
| StarFieldSimple | 5 | Simple star field |
| StarFog | 6 | Stars + fog |
| StarFogFlow | 7 | Flowing stars + fog |

---

## UIBasicParticleType -- UI Basic Particle

46 entries total. Major items:

| Name | Value | Description |
|------|---|------|
| None | 0 | None |
| Firework | 1 | Firework |
| FireworkCluster | 2 | Firework cluster |
| FireField | 3 | Fire field |
| Aura | 34 | Aura |
| Buff | 35 | Buff |
| Charge | 36 | Charge |
| Enchant | 39 | Enchant |
| Nova | 28 | Nova |
| Shower | 33 | Shower |
