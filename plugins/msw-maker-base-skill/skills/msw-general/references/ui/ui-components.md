# UI Component API Reference

Full list of properties, methods, and events per component.

---

## UITransformComponent

Manages position, size, anchors, rotation, and scale. Required on every UI entity.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `anchoredPosition` | Vector2 | (0, 0) | Offset relative to the anchor (**use only this for UI positioning**) |
| `RectSize` | Vector2 | (100, 100) | UI size |
| `AlignmentOption` | AlignmentType | Center(0) | Anchor preset |
| `AnchorsMin` | Vector2 | (0.5, 0.5) | Bottom-left anchor (normalized) |
| `AnchorsMax` | Vector2 | (0.5, 0.5) | Top-right anchor (normalized) |
| `OffsetMin` | Vector2 | (0.5, 0.5) | Offset relative to AnchorsMin |
| `OffsetMax` | Vector2 | (0.5, 0.5) | Offset relative to AnchorsMax |
| `Pivot` | Vector2 | (0.5, 0.5) | Reference for rotation / scale |
| `UIScale` | Vector3 | (1, 1, 1) | Scale |
| `UIRotation` | Vector3 | (0, 0, 0) | Euler-angle rotation |
| `UIMode` | UIModeType | None(0) | Screen(1) or World(2) |
| `Position` | Vector3 | (0, 0, 0) | Coordinates relative to parent (do not set directly in UI) |
| `WorldPosition` | Vector3 | -- | World coordinates (read-only) |
| `ActivePlatform` | PlatformType | All | Active platform |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `Rotate(float angle)` | void | Counterclockwise rotation |
| `Translate(float deltaX, float deltaY)` | void | Relative translation |
| `ToWorldPoint(Vector3 local)` | Vector3 | Local -> world coordinate conversion |
| `ToLocalPoint(Vector3 world)` | Vector3 | World -> local coordinate conversion |
| `ToWorldDirection(Vector3 local)` | Vector3 | Local -> world direction conversion |
| `ToLocalDirection(Vector3 world)` | Vector3 | World -> local direction conversion |
| `GetWorldCorners()` | Vector2[] | World coordinates of the rectangle's four corners (BL, TL, TR, BR) |

---

## UIGroupComponent

Defines a UI screen (group). Attach to the root entity.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `DefaultShow` | boolean | true | Whether to show at start |
| `GroupOrder` | int32 | 0 | Z order (higher is on top) |
| `GroupType` | UIGroupType | UIType(2) | DefaultType(1), UIType(2) |

---

## CanvasGroupComponent

Controls the group's overall transparency and interaction.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `GroupAlpha` | float | 1.0 | Transparency including children (0-1) |
| `Interactable` | boolean | true | Whether to respond to input |
| `BlocksRaycasts` | boolean | true | Block touches on UI behind |

---

## ButtonComponent

Interactive button. Supports state-transition effects.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Transition` | TransitionType | ColorTint(1) | None(0), ColorTint(1), SpriteSwap(2) |
| `Colors` | TransitionColorSet | -- | Per-state colors (Normal/Highlighted/Pressed/Selected/Disabled) |
| `ImageRUIDs` | TransitionRUIDSet | -- | Per-state images (when SpriteSwap) |
| `KeyCode` | KeyboardKey | -- | Keyboard binding |
| `OrderInLayer` | int32 | 0 | Render priority |
| `SortingLayer` | string | "UI" | Render layer |

### Events

| Event | Description |
|--------|------|
| `ButtonClickEvent` | Click (carries Entity property) |
| `ButtonStateChangeEvent` | State change (state: ButtonState) |
| `ButtonPressedEvent` | Enter pressed state |

---

## TextComponent

Displays text. Supports font, alignment, overflow, drop shadow, and outline.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Text` | string | "" | Text to display |
| `FontSize` | int32 | 14 | Font size |
| `FontColor` | Color | white | Text color |
| `Font` | FontType | Default(0) | Default(0), Maple(1), Bazzi(2), Football(3) |
| `Alignment` | TextAlignmentType | UpperLeft(0) | 9 alignment options |
| `Bold` | boolean | false | Bold |
| `IsRichText` | boolean | false | Rich-text support |
| `Overflow` | OverflowType | Overflow(0) | Overflow(0), Truncate(1), Ellipsis(2) |
| `BestFit` | boolean | false | Auto-fit size |
| `MinSize` | int32 | 10 | BestFit minimum size |
| `MaxSize` | int32 | 40 | BestFit maximum size |
| `LineSpacing` | float | 1.0 | Line spacing |
| `Padding` | RectOffset | 0,0,0,0 | Inner padding |
| `SizeFit` | boolean | false | Auto-fit to content size |
| `DropShadow` | boolean | false | Drop shadow |
| `DropShadowColor` | Color | -- | Shadow color |
| `DropShadowDistance` | float | -- | Shadow distance |
| `DropShadowAngle` | float | -- | Shadow angle |
| `UseOutLine` | boolean | false | Outline |
| `OutlineColor` | Color | -- | Outline color |
| `OutlineWidth` | float | -- | Outline thickness |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `GetLocalizedText()` | string | Text in the current language |
| `GetPreferredHeight(string text, float width)` | float | Compute required height |
| `GetPreferredWidth(string text)` | float | Compute required width |

---

## SpriteGUIRendererComponent

Renders 2D images / sprites.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `ImageRUID` | DataRef | -- | Image resource reference |
| `Color` | Color | white | Tint color |
| `Type` | ImageType | Simple(0) | Simple(0), Sliced(1), Tiled(2), Filled(3) |
| `FillAmount` | float | 1.0 | Fill amount (Filled type, 0-1) |
| `FillMethod` | FillMethodType | Horizontal(0) | Fill direction |
| `FillOrigin` | int32 | 0 | Fill origin |
| `FillClockWise` | boolean | true | Clockwise fill |
| `FlipX` | boolean | false | Flip horizontally |
| `FlipY` | boolean | false | Flip vertically |
| `RaycastTarget` | boolean | true | Receive touch / click |
| `PlayRate` | float | 1.0 | Animation speed |
| `StartFrameIndex` | int32 | 0 | Animation start frame |
| `EndFrameIndex` | int32 | -1 | Animation end frame |
| `OrderInLayer` | int32 | 0 | Render priority |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `SetAlpha(float alpha)` | void | Set transparency |
| `SetNativeSize()` | void | Reset to native size |
| `ChangeMaterial(string materialId)` | void | Apply a material |

### Events

| Event | Description |
|--------|------|
| `SpriteGUIAnimPlayerStartEvent` | Animation start |
| `SpriteGUIAnimPlayerChangeFrameEvent` | Frame change |
| `SpriteGUIAnimPlayerEndEvent` | Animation end |

---

## ScrollLayoutGroupComponent

Scrollable list / grid layout.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Type` | LayoutGroupType | Vertical(1) | Horizontal(0), Vertical(1), Grid(2) |
| `Spacing` | float | 0 | Item spacing (H/V) |
| `GridSpacing` | Vector2 | (0, 0) | Item spacing (Grid) |
| `Padding` | RectOffset | 0,0,0,0 | Outer padding |
| `CellSize` | Vector2 | (100, 100) | Fixed item size (Grid) |
| `ConstraintCount` | int32 | 0 | Fixed row / column count |
| `ScrollBarVisible` | ScrollBarVisibility | AlwaysShow(0) | AlwaysShow(0), AutoHide(1), Hide(2) |
| `ScrollBarThickness` | float | -- | Scrollbar thickness |
| `ScrollBarHandleColor` | Color | -- | Handle color |
| `ScrollBarHandleImageRUID` | DataRef | -- | Handle image |
| `ScrollBarBackgroundColor` | Color | -- | Background color |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `GetScrollNormalizedPosition()` | Vector2 | Current scroll position (0-1) |
| `SetScrollNormalizedPosition(UITransformAxis, float)` | void | Set scroll position |
| `SetScrollPositionByItemIndex(int32)` | void | Scroll to an item |
| `ResetScrollPosition(UITransformAxis)` | void | Reset to initial position |

### Events

| Event | Description |
|--------|------|
| `ScrollPositionChangedEvent` | On scroll (NormalizedPosition: Vector2) |

---

## GridViewComponent

Virtualization for large lists. Renders only items visible on screen.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `ItemEntity` | Entity | -- | Clone template |
| `TotalCount` | int32 | 0 | Total item count |
| `CellSize` | Vector2 | (100, 100) | Item size |
| `FixedCount` | int32 | 1 | Fixed row / column count |
| `FixedType` | GridViewFixedType | ColumnCountFixed(0) | Fixed axis |
| `Spacing` | Vector2 | (0, 0) | Item spacing |
| `Padding` | RectOffset | 0,0,0,0 | Outer padding |
| `UseScroll` | boolean | true | Enable scrolling |
| `OnRefresh` | func<int32, Entity> | -- | Item-display callback |
| `OnClear` | func<int32, Entity> | -- | Item-hide callback |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `Refresh(boolean resetPos, boolean force)` | void | Full refresh |
| `RefreshIndex(int32 index)` | void | Refresh a specific item |
| `SetScrollPositionByItemIndex(int32)` | void | Scroll to an item |
| `SetScrollNormalizedPosition(UITransformAxis, float)` | void | Set scroll position |

---

## TextInputComponent

Text input field.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Text` | string | "" | Entered text |
| `PlaceHolder` | string | "" | Placeholder |
| `PlaceHolderColor` | Color | gray | Placeholder color |
| `CharacterLimit` | int32 | 0 | Max characters (0 = unlimited) |
| `ContentType` | InputContentType | Standard | Input type |
| `LineType` | InputLineType | SingleLine | Single / multi-line |
| `AutoClear` | boolean | false | Auto-clear after submit |
| `IsFocused` | boolean | -- | Focus state (read-only) |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `ActivateInputField()` | void | Set focus |

### Events

| Event | Description |
|--------|------|
| `TextInputValueChangeEvent` | While typing (text: string) |
| `TextInputEndEditEvent` | Edit ended (text: string) |
| `TextInputSubmitEvent` | Submit (text: string) |
| `TextInputKeyDownEvent` | Key down |
| `TextInputKeyUpEvent` | Key up |

---

## SliderComponent

Slider / progress bar.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Value` | float | 0 | Current value |
| `MinValue` | float | 0 | Minimum |
| `MaxValue` | float | 1 | Maximum |
| `UseIntegerValue` | boolean | false | Allow integers only |
| `Direction` | SliderDirection | -- | Slider direction |
| `HandleSize` | Vector2 | -- | Handle size |
| `HandleColor` | Color | -- | Handle color |
| `UseHandle` | boolean | true | Show handle |
| `FillRectColor` | Color | -- | Fill area color |

### Events

| Event | Description |
|--------|------|
| `SliderValueChangedEvent` | Value changed (Value: float) |

---

## UITouchReceiveComponent

Receives touch / mouse input. Just attaching it makes events fire.

### Events

| Event | Properties | Description |
|--------|---------|------|
| `UITouchDownEvent` | Entity, TouchId, TouchPoint | Touch / click start |
| `UITouchUpEvent` | Entity, TouchId, TouchPoint | Touch / click end |
| `UITouchDragEvent` | Entity, TouchDelta, TouchId, TouchPoint | Drag |
| `UITouchBeginDragEvent` | Entity | Drag start |
| `UITouchEndDragEvent` | Entity | Drag end |
| `UITouchEnterEvent` | Entity | Pointer enter |
| `UITouchExitEvent` | Entity | Pointer exit |

---

## MaskComponent

Clips child UI to a specific shape.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Shape` | MaskShape | Rect | Mask shape (Rect, Circle, etc.) |
| `Padding` | RectOffset | 0,0,0,0 | Soft edge |
| `Softness` | Vector2Int | (0, 0) | Blur amount |

---

## JoystickComponent

Virtual joystick (mobile).

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `DynamicStick` | boolean | false | Track touch position |
| `Axis` | AxisType | -- | 4-way / 8-way |
| `UpArrow` | KeyboardKey | -- | Up-direction key mapping |
| `DownArrow` | KeyboardKey | -- | Down-direction key mapping |
| `LeftArrow` | KeyboardKey | -- | Left-direction key mapping |
| `RightArrow` | KeyboardKey | -- | Right-direction key mapping |

---

## ChatComponent

In-game chat UI.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Expand` | boolean | false | Expandable |
| `UseChatBalloon` | boolean | false | Show speech balloons |
| `UseChatEmotion` | boolean | false | Emotion support |
| `ChatEmotionDuration` | float | 3.0 | Emotion display duration |

### Events

| Event | Description |
|--------|------|
| `ChatEvent` | Chat event |

---

## AvatarGUIRendererComponent

Renders avatars in UI.

### Properties

| Name | Type | Default | Description |
|------|------|--------|------|
| `Color` | Color | white | Avatar tint |
| `FlipX` | boolean | false | Flip horizontally |
| `FlipY` | boolean | false | Flip vertically |
| `PlayRate` | float | 1.0 | Animation speed |
| `RaycastTarget` | boolean | true | Receive input |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `GetAvatarRootEntity()` | Entity | Avatar root |
| `GetBodyEntity()` | Entity | Body part |
| `GetFaceEntity()` | Entity | Face part |
| `SetAvatarPartColor(category, r, g, b, a)` | void | Change part color |
| `PlayEmotion(EmotionalType type, float duration)` | void | Play emotion |

---

## UILogic

UI coordinate-conversion utility (singleton).

### Properties

| Name | Type | Description |
|------|------|------|
| `ScreenWidth` | int32 | Current screen width |
| `ScreenHeight` | int32 | Current screen height |

### Methods

| Method | Returns | Description |
|--------|------|------|
| `ScreenToUIPosition(Vector2)` | Vector2 | Screen -> UI coords |
| `UIToWorldPosition(Vector2)` | Vector2 | UI -> world coords |
| `ScreenToWorldPosition(Vector2)` | Vector2 | Screen -> world coords |
| `WorldToScreenPosition(Vector2)` | Vector2 | World -> screen coords |
| `LocalUIToWorldPosition(Vector2, UITransformComponent)` | Vector2 | Local UI -> world |
| `ScreenToLocalUIPosition(Vector2, UITransformComponent)` | Vector2 | Screen -> local UI |
| `GetSiblingIndex(UITransformComponent)` | int32 | Get sibling index |
| `SetSiblingIndex(UITransformComponent, int32)` | void | Set sibling index |

---

## Common Types

### Color
`Color(r, g, b, a)` -- 0-1 floats. Static values: `Color.red`, `Color.white`, `Color.black`, etc.

### TransitionColorSet
`NormalColor`, `HighlightedColor`, `PressedColor`, `SelectedColor`, `DisabledColor`, `ColorMultiplier`, `FadeDuration`

### TransitionRUIDSet
`HighlightedSprite`, `PressedSprite`, `SelectedSprite`, `DisabledSprite`

### DataRef
`{ DataId = "32-char hex" }` -- image resource reference.

### RectOffset
`{ left, right, top, bottom }` -- int32 rectangular margins.
