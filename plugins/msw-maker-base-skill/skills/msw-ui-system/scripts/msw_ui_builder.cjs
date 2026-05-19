"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_SPRITE_RUID = "4fea64a3307cda641809ad8be0d4890b";

const ANCHOR_DEFAULT_PIVOT = {
  "middle-center": [0.5, 0.5],
  "middle-left": [0.0, 0.5],
  "middle-right": [1.0, 0.5],
  "top-center": [0.5, 1.0],
  "top-left": [0.0, 1.0],
  "top-right": [1.0, 1.0],
  "bottom-center": [0.5, 0.0],
  "bottom-left": [0.0, 0.0],
  "bottom-right": [1.0, 0.0],
  "stretch-top": [0.5, 1.0],
  "stretch-middle": [0.5, 0.5],
  "stretch-bottom": [0.5, 0.0],
  "stretch-left": [0.0, 0.5],
  "stretch-center": [0.5, 0.5],
  "stretch-right": [1.0, 0.5],
  stretch: [0.5, 0.5],
};

const ANCHOR_PRESETS = {
  "middle-center": { min: [0.5, 0.5], max: [0.5, 0.5], alignment: 0 },
  "middle-left": { min: [0.0, 0.5], max: [0.0, 0.5], alignment: 1 },
  "middle-right": { min: [1.0, 0.5], max: [1.0, 0.5], alignment: 2 },
  "top-center": { min: [0.5, 1.0], max: [0.5, 1.0], alignment: 3 },
  "top-left": { min: [0.0, 1.0], max: [0.0, 1.0], alignment: 4 },
  "top-right": { min: [1.0, 1.0], max: [1.0, 1.0], alignment: 5 },
  "bottom-center": { min: [0.5, 0.0], max: [0.5, 0.0], alignment: 6 },
  "bottom-left": { min: [0.0, 0.0], max: [0.0, 0.0], alignment: 7 },
  "bottom-right": { min: [1.0, 0.0], max: [1.0, 0.0], alignment: 8 },
  "stretch-top": { min: [0.0, 1.0], max: [1.0, 1.0], alignment: 9 },
  "stretch-middle": { min: [0.0, 0.5], max: [1.0, 0.5], alignment: 10 },
  "stretch-bottom": { min: [0.0, 0.0], max: [1.0, 0.0], alignment: 11 },
  "stretch-left": { min: [0.0, 0.0], max: [0.0, 1.0], alignment: 12 },
  "stretch-center": { min: [0.5, 0.0], max: [0.5, 1.0], alignment: 13 },
  "stretch-right": { min: [1.0, 0.0], max: [1.0, 1.0], alignment: 14 },
  stretch: { min: [0.0, 0.0], max: [1.0, 1.0], alignment: 15 },
};

const KNOWN_COMPONENTS = new Set([
  "MOD.Core.UITransformComponent",
  "MOD.Core.SpriteGUIRendererComponent",
  "MOD.Core.TextComponent",
  "MOD.Core.ButtonComponent",
  "MOD.Core.UIGroupComponent",
  "MOD.Core.CanvasGroupComponent",
  "MOD.Core.SliderComponent",
  "MOD.Core.ScrollLayoutGroupComponent",
  "MOD.Core.TextInputComponent",
  "MOD.Core.MaskComponent",
  "MOD.Core.GridViewComponent",
  "MOD.Core.AvatarGUIRendererComponent",
  "MOD.Core.UITouchReceiveComponent",
  "MOD.Core.SkeletonGUIRendererComponent",
  "MOD.Core.UIAreaParticleComponent",
  "MOD.Core.UIBasicParticleComponent",
  "MOD.Core.UISpriteParticleComponent",
  "MOD.Core.JoystickComponent",
  "MOD.Core.SoftMaskComponent",
  "MOD.Core.ChatComponent",
  "MOD.Core.LineGUIRendererComponent",
  "MOD.Core.PolygonGUIRendererComponent",
]);

const INT32_COMPONENT_FIELDS = new Set([
  "ActivePlatform", "Alignment", "AlignmentOption", "AnimClipPlayType", "Axis", "ChildAlignment",
  "Constraint", "ConstraintCount", "ContentType", "Direction", "DownArrow", "EndFrameIndex",
  "FillMethod", "FillOrigin", "FixedCount", "FixedType", "Font", "FontSize", "FrameColumn",
  "FrameRate", "FrameRow", "GridChildAlignment", "GroupOrder", "GroupType",
  "HorizontalScrollBarDirection", "KeyCode", "LeftArrow", "LineType", "MaxSize", "MinSize",
  "OrderInLayer", "Overflow", "ParticleType", "PreserveAvatar", "PreserveMode",
  "PreserveSprite", "PreserveSpriteType", "PreserveType", "RandomSeed", "RightArrow", "ScrollBarVisible",
  "Shape", "StartAxis", "StartCorner", "StartFrameIndex", "TotalCount", "Transition", "Type",
  "UIVersion", "UpArrow", "VerticalScrollBarDirection",
]);

const NUMBER_COMPONENT_FIELDS = new Set([
  "ChatEmotionDuration", "ColorMultiplier", "ConstraintX", "ConstraintY", "DropShadowAngle",
  "DropShadowDistance", "FadeDuration", "FillAmount", "Flexibility", "GroupAlpha",
  "MaxValue", "MinValue", "OutlineWidth", "ParticleCount", "ParticleLifeTime", "ParticleSize",
  "ParticleSpeed", "PlayRate", "PlaySpeed", "ScrollBarThickness", "Spacing", "Value", "Width",
]);

const BOOLEAN_COMPONENT_FIELDS = new Set([
  "AllowAutomaticTranslation", "ApplySpriteColor", "AutoClear", "AutoRandomSeed", "BestFit",
  "BlocksRaycasts", "Bold", "DefaultShow", "DynamicStick", "Enable", "EnableVoiceChat",
  "Expand", "FillCenter", "FillClockWise", "FlipX", "FlipY", "HideWorldChatButton",
  "IgnoreMapLayerCheck", "Interactable", "InvertMask", "InvertOutsides", "IsEmitting",
  "IsFlexible", "IsLocalizationKey", "IsSmooth", "Loop", "MessageAlignBottom", "OverrideSorting",
  "PlayOnEnable", "PreserveAspect", "Prewarm", "RaycastTarget", "ReverseArrangement",
  "SizeFit", "UseChatBalloon", "UseChatEmotion", "UseConstraintX", "UseConstraintY",
  "UseCustomUVs", "UseHandle", "UseIntegerValue", "UseOutLine", "UseScroll",
]);

function hexToRgba(hexColor, alpha = 1.0) {
  const h = String(hexColor).replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hexColor}`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255.0,
    g: parseInt(h.slice(2, 4), 16) / 255.0,
    b: parseInt(h.slice(4, 6), 16) / 255.0,
    a: alpha,
  };
}

function colorDict(color, alpha = 1.0) {
  if (color == null) return { r: 1.0, g: 1.0, b: 1.0, a: alpha };
  if (typeof color === "string") return hexToRgba(color, alpha);
  return color;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tuple(value, fallback) {
  if (Array.isArray(value)) return value;
  return fallback;
}

function sortFields(extra = {}) {
  return {
    SortingLayer: String(extra.sorting_layer ?? "UI"),
    OrderInLayer: Number(extra.order_in_layer ?? 0),
    IgnoreMapLayerCheck: Boolean(extra.ignore_map_layer_check ?? false),
    OverrideSorting: Boolean(extra.override_sorting ?? false),
  };
}

function _resolve_sort_options(options = {}) {
  if (options.world_ui === true) {
    return {
      sorting_layer: options.sorting_layer ?? "UI",
      order_in_layer: options.order_in_layer ?? 0,
      ignore_map_layer_check: options.ignore_map_layer_check ?? false,
      override_sorting: options.override_sorting ?? true,
    };
  }
  const picked = {};
  if (options.sorting_layer !== undefined) picked.sorting_layer = options.sorting_layer;
  if (options.order_in_layer !== undefined) picked.order_in_layer = options.order_in_layer;
  if (options.ignore_map_layer_check !== undefined) picked.ignore_map_layer_check = options.ignore_map_layer_check;
  if (options.override_sorting !== undefined) picked.override_sorting = options.override_sorting;
  return picked;
}

function int32Field(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < -2147483648 || n > 2147483647) {
    throw new TypeError(`${fieldName} must be an int32. Got ${JSON.stringify(value)}`);
  }
  return n;
}

function assertNoInvalidNumbers(value, pathLabel = "$") {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${pathLabel} must be a finite number. Got ${String(value)}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => assertNoInvalidNumbers(item, `${pathLabel}[${idx}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertNoInvalidNumbers(item, `${pathLabel}.${key}`);
    }
  }
}

function assertComponentScalarTypes(data) {
  const entities = data?.ContentProto?.Entities || [];
  for (const entity of entities) {
    const js = typeof entity.jsonString === "string" ? JSON.parse(entity.jsonString) : entity.jsonString;
    const entityPath = js?.path || entity.path || "?";
    for (const component of js?.["@components"] || []) {
      const compType = component["@type"] || "?";
      for (const [key, value] of Object.entries(component)) {
        const label = `${entityPath}.${compType}.${key}`;
        if (INT32_COMPONENT_FIELDS.has(key) && !Number.isInteger(value)) {
          throw new TypeError(`${label} must be int32. Got ${JSON.stringify(value)}`);
        }
        if (NUMBER_COMPONENT_FIELDS.has(key) && (typeof value !== "number" || !Number.isFinite(value))) {
          throw new TypeError(`${label} must be a finite number. Got ${JSON.stringify(value)}`);
        }
        if (BOOLEAN_COMPONENT_FIELDS.has(key) && typeof value !== "boolean") {
          throw new TypeError(`${label} must be boolean. Got ${JSON.stringify(value)}`);
        }
      }
    }
  }
}

class UIBuilder {
  constructor(groupName, displayOrder = 1, defaultShow = true, defaultRuid = DEFAULT_SPRITE_RUID) {
    this.group_name = groupName;
    this.root_uuid = crypto.randomUUID();
    this.root_path = `/ui/${groupName}`;
    this.default_ruid = defaultRuid;
    this.entities = [];
    this._data = null;
    this._display_counters = {};
    this._create_root(int32Field(displayOrder, "displayOrder"), defaultShow);
  }

  static load(filepath) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, "utf8"));
    } catch (err) {
      if (err && err.code === "ENOENT") throw new Error(`UI file not found: ${filepath}`);
      throw new Error(`Invalid JSON in UI file ${filepath}: ${err.message}`);
    }
    if (!data.ContentProto || !Array.isArray(data.ContentProto.Entities)) {
      throw new Error(`Missing ContentProto.Entities in UI file: ${filepath}`);
    }
    const entities = data.ContentProto.Entities;
    if (entities.length === 0) throw new Error(`No entities found in UI file: ${filepath}`);
    for (const entity of entities) {
      if (typeof entity.jsonString === "string") entity.jsonString = JSON.parse(entity.jsonString);
    }
    const rootJs = entities[0].jsonString;
    const instance = new UIBuilder(rootJs.name || "Unnamed");
    instance.root_uuid = entities[0].id;
    instance.root_path = rootJs.path || instance.root_path;
    instance.entities = entities;
    instance._data = data;
    instance._display_counters = {};
    for (const entity of entities) {
      const js = entity.jsonString;
      const entityPath = js.path || "";
      const parent = entityPath.includes("/") ? entityPath.split("/").slice(0, -1).join("/") : "";
      const displayOrder = js.displayOrder || 0;
      if (parent && displayOrder >= (instance._display_counters[parent] || 0)) {
        instance._display_counters[parent] = displayOrder + 1;
      }
    }
    console.log(`Loaded ${entities.length} entities from ${filepath}`);
    return instance;
  }

  static read(filepath) {
    return UIBuilder.load(filepath);
  }

  static snapshot(filepath) {
    return UIBuilder.load(filepath).list_entities();
  }

  _create_root(displayOrder, defaultShow) {
    this.entities.push({
      id: this.root_uuid,
      path: this.root_path,
      componentNames: "MOD.Core.UITransformComponent,MOD.Core.UIGroupComponent,MOD.Core.CanvasGroupComponent",
      jsonString: {
        name: this.group_name,
        path: this.root_path,
        nameEditable: true,
        enable: true,
        visible: true,
        localize: true,
        displayOrder,
        pathConstraints: "//",
        revision: 0,
        origin: {
          type: "Model",
          entry_id: "UIGroup",
          sub_entity_id: null,
          root_entity_id: null,
          replaced_model_id: null,
        },
        modelId: "uigroup",
        "@components": [
          this._ui_transform("stretch", [0, 0], [1920, 1080]),
          {
            "@type": "MOD.Core.UIGroupComponent",
            DefaultShow: defaultShow,
            GroupOrder: displayOrder,
            GroupType: 1,
            Enable: true,
          },
          {
            "@type": "MOD.Core.CanvasGroupComponent",
            BlocksRaycasts: true,
            GroupAlpha: 1.0,
            Interactable: true,
            Enable: true,
          },
        ],
        "@version": 1,
      },
    });
  }

  _normalize_path(identifier) {
    const value = String(identifier).trim();
    if (!value) throw new Error("Entity identifier must not be empty");
    if (value.startsWith("/ui/")) {
      if (!value.startsWith(this.root_path)) {
        throw new Error(`Entity path '${value}' is outside this UI root '${this.root_path}'`);
      }
      return value;
    }
    const rel = value.replace(/^\/+/, "");
    if (!rel) return this.root_path;
    if (rel === this.group_name || rel.startsWith(`${this.group_name}/`)) return `/ui/${rel}`;
    return `${this.root_path}/${rel}`;
  }

  _resolve(identifier) {
    const fullPath = this._normalize_path(identifier);
    const parentPath = fullPath.includes("/") ? fullPath.split("/").slice(0, -1).join("/") : this.root_path;
    const entityName = fullPath.split("/").pop();
    return [fullPath, parentPath, entityName];
  }

  _next_display_order(parentPath) {
    const n = this._display_counters[parentPath] || 0;
    this._display_counters[parentPath] = n + 1;
    return n;
  }

  _path_constraints(fullPath) {
    if (fullPath === this.root_path) return "//";
    return "/".repeat((fullPath.slice(this.root_path.length).match(/\//g) || []).length + 2);
  }

  _entity_json(entity) {
    return entity.jsonString;
  }

  _find_component(entity, compType) {
    for (const component of this._entity_json(entity)["@components"] || []) {
      if (component["@type"] === compType) return component;
    }
    return null;
  }

  _refresh_component_names_from_components(entity) {
    entity.componentNames = (this._entity_json(entity)["@components"] || [])
      .map((component) => component["@type"])
      .filter(Boolean)
      .join(",");
  }

  _ui_transform(anchor = "middle-center", pos = [0, 0], rectSize = [100, 100], pivot = null) {
    const preset = ANCHOR_PRESETS[anchor] || ANCHOR_PRESETS["middle-center"];
    const px = Number(pos[0]);
    const py = Number(pos[1]);
    const sx = Number(rectSize[0]);
    const sy = Number(rectSize[1]);
    const [pvx, pvy] = pivot == null ? (ANCHOR_DEFAULT_PIVOT[anchor] || [0.5, 0.5]) : [Number(pivot[0]), Number(pivot[1])];
    const mn = preset.min;
    const mx = preset.max;
    const stretchX = mn[0] !== mx[0];
    const stretchY = mn[1] !== mx[1];
    let ominX;
    let ominY;
    let omaxX;
    let omaxY;
    if (stretchX && stretchY) {
      ominX = px; ominY = py; omaxX = px; omaxY = py;
    } else if (stretchX) {
      ominX = px; omaxX = px; ominY = py - pvy * sy; omaxY = py + (1.0 - pvy) * sy;
    } else if (stretchY) {
      ominX = px - pvx * sx; omaxX = px + (1.0 - pvx) * sx; ominY = py; omaxY = py;
    } else {
      ominX = px - pvx * sx; omaxX = px + (1.0 - pvx) * sx;
      ominY = py - pvy * sy; omaxY = py + (1.0 - pvy) * sy;
    }
    return {
      "@type": "MOD.Core.UITransformComponent",
      ActivePlatform: 255,
      AlignmentOption: preset.alignment,
      AnchorsMax: { x: preset.max[0], y: preset.max[1] },
      AnchorsMin: { x: preset.min[0], y: preset.min[1] },
      MobileOnly: false,
      OffsetMax: { x: omaxX, y: omaxY },
      OffsetMin: { x: ominX, y: ominY },
      Pivot: { x: pvx, y: pvy },
      RectSize: { x: sx, y: sy },
      UIMode: 1,
      UIScale: { x: 1.0, y: 1.0, z: 1.0 },
      UIVersion: 2,
      anchoredPosition: { x: px, y: py },
      Position: { x: 0.0, y: 0.0, z: 0.0 },
      QuaternionRotation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
      Scale: { x: 1.0, y: 1.0, z: 1.0 },
      Enable: true,
    };
  }

  static _sprite_renderer(color = null, alpha = 1.0, raycast = false, fillMethod = 0, spriteType = 0, imageRuid = "", extra = {}) {
    const sort = sortFields(extra);
    return {
      "@type": "MOD.Core.SpriteGUIRendererComponent",
      AnimClipPlayType: 0,
      EndFrameIndex: 2147483647,
      ImageRUID: { DataId: imageRuid },
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      LocalPosition: { x: 0.0, y: 0.0 },
      LocalScale: { x: 1.0, y: 1.0 },
      MaterialId: String(extra.material_id ?? ""),
      OrderInLayer: sort.OrderInLayer,
      OverrideSorting: sort.OverrideSorting,
      PlayRate: 1.0,
      PreserveAspect: Boolean(extra.preserve_aspect ?? false),
      PreserveSprite: 0,
      SortingLayer: sort.SortingLayer,
      StartFrameIndex: 0,
      Color: colorDict(color, alpha),
      DropShadow: false,
      DropShadowAngle: 120.0,
      DropShadowColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.72 },
      DropShadowDistance: 3.0,
      FillAmount: 1.0,
      FillCenter: true,
      FillClockWise: true,
      FillMethod: fillMethod,
      FillOrigin: 0,
      FlipX: false,
      FlipY: false,
      FrameColumn: 1,
      FrameRate: 0,
      FrameRow: 1,
      Outline: false,
      OutlineColor: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      OutlineWidth: 3.0,
      RaycastTarget: raycast,
      Type: spriteType,
      Enable: true,
    };
  }

  _sprite_renderer(...args) {
    return UIBuilder._sprite_renderer(...args);
  }

  static _text_component(text = "", fontSize = 24, color = null, bold = false, alignment = 4, options = {}) {
    const maxSize = options.max_size != null ? options.max_size : Math.max(fontSize + 12, 40);
    const outlineWidth = options.outline_width != null ? options.outline_width : 1.0;
    const sort = sortFields(options);
    return {
      "@type": "MOD.Core.TextComponent",
      Alignment: alignment,
      AllowAutomaticTranslation: Boolean(options.allow_auto_translation ?? true),
      BestFit: Boolean(options.bestfit),
      Bold: bold,
      ConstraintX: Number(options.constraint_x ?? 100.0),
      ConstraintY: Number(options.constraint_y ?? 100.0),
      DropShadow: false,
      DropShadowAngle: 120.0,
      DropShadowColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.72 },
      DropShadowDistance: 3.0,
      Font: 0,
      FontColor: colorDict(color),
      FontSize: fontSize,
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      IsLocalizationKey: Boolean(options.is_localization_key ?? false),
      MaxSize: maxSize,
      MinSize: options.min_size != null ? options.min_size : 10,
      OrderInLayer: sort.OrderInLayer,
      OutlineColor: options.outline_color != null ? colorDict(options.outline_color) : { r: 0.698039234, g: 0.698039234, b: 0.698039234, a: 1.0 },
      OutlineDistance: { x: Number(outlineWidth), y: -Number(outlineWidth) },
      OutlineWidth: Number(outlineWidth),
      Overflow: options.overflow != null ? options.overflow : 0,
      OverrideSorting: sort.OverrideSorting,
      Padding: { left: 0, right: 0, top: 0, bottom: 0 },
      SizeFit: false,
      SortingLayer: sort.SortingLayer,
      Text: text,
      UseConstraintX: Boolean(options.use_constraint_x ?? false),
      UseConstraintY: Boolean(options.use_constraint_y ?? false),
      UseOutLine: Boolean(options.outline),
      Enable: true,
    };
  }

  _text_component(...args) {
    return UIBuilder._text_component(...args);
  }

  static _button_component(extra = {}) {
    const sort = sortFields(extra);
    return {
      "@type": "MOD.Core.ButtonComponent",
      Colors: {
        NormalColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
        HighlightedColor: { r: 0.9607843, g: 0.9607843, b: 0.9607843, a: 1.0 },
        PressedColor: { r: 0.784313738, g: 0.784313738, b: 0.784313738, a: 1.0 },
        SelectedColor: { r: 0.9607843, g: 0.9607843, b: 0.9607843, a: 1.0 },
        DisabledColor: { r: 0.784313738, g: 0.784313738, b: 0.784313738, a: 0.5019608 },
        ColorMultiplier: 1.0,
        FadeDuration: 0.1,
      },
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      ImageRUIDs: {
        HighlightedSprite: null,
        PressedSprite: null,
        SelectedSprite: null,
        DisabledSprite: null,
      },
      KeyCode: 0,
      OrderInLayer: sort.OrderInLayer,
      OverrideSorting: sort.OverrideSorting,
      SortingLayer: sort.SortingLayer,
      Transition: 1,
      Enable: true,
    };
  }

  _button_component(...args) {
    return UIBuilder._button_component(...args);
  }

  static _slider_component(minVal = 0, maxVal = 1, value = 0, direction = 0, useHandle = true, useInteger = false, extra = {}) {
    const fillPadding = tuple(extra.fill_padding, [10, 10, 10, 10]);
    const handlePadding = tuple(extra.handle_padding, [0, 0, 0, 0]);
    const handleSize = tuple(extra.handle_size, [50, 50]);
    const sort = sortFields(extra);
    return {
      "@type": "MOD.Core.SliderComponent",
      Direction: direction,
      FillRectColor: extra.fill_color != null ? colorDict(extra.fill_color) : { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
      FillRectImageRUID: { DataId: String(extra.fill_image_ruid ?? "") },
      FillRectPadding: { left: Number(fillPadding[0]), right: Number(fillPadding[1]), top: Number(fillPadding[2]), bottom: Number(fillPadding[3]) },
      HandleAreaPadding: { left: Number(handlePadding[0]), right: Number(handlePadding[1]), top: Number(handlePadding[2]), bottom: Number(handlePadding[3]) },
      HandleColor: extra.handle_color != null ? colorDict(extra.handle_color) : { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
      HandleImageRUID: { DataId: String(extra.handle_image_ruid ?? "") },
      HandleSize: { x: Number(handleSize[0]), y: Number(handleSize[1]) },
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      MaxValue: Number(maxVal),
      MinValue: Number(minVal),
      OrderInLayer: sort.OrderInLayer,
      OverrideSorting: sort.OverrideSorting,
      SortingLayer: sort.SortingLayer,
      UseHandle: useHandle,
      UseIntegerValue: useInteger,
      Value: Number(value),
      Enable: true,
    };
  }

  _slider_component(...args) {
    return UIBuilder._slider_component(...args);
  }

  static _scroll_layout_component(layoutType = 0, spacing = 0, cellSize = [100, 100], useScroll = true, padding = [0, 0, 0, 0], extra = {}) {
    const gridSpacing = tuple(extra.grid_spacing, [0, 0]);
    const sort = sortFields(extra);
    return {
      "@type": "MOD.Core.ScrollLayoutGroupComponent",
      CellSize: { x: Number(cellSize[0]), y: Number(cellSize[1]) },
      ChildAlignment: Number(extra.child_alignment ?? 0),
      Constraint: Number(extra.constraint ?? 0),
      ConstraintCount: Number(extra.constraint_count ?? 1),
      GridChildAlignment: Number(extra.grid_child_alignment ?? 0),
      GridSpacing: { x: Number(gridSpacing[0]), y: Number(gridSpacing[1]) },
      HorizontalScrollBarDirection: Number(extra.h_scroll_dir ?? 0),
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      OrderInLayer: sort.OrderInLayer,
      OverrideSorting: sort.OverrideSorting,
      Padding: { left: padding[0], right: padding[1], top: padding[2], bottom: padding[3] },
      ReverseArrangement: Boolean(extra.reverse_arrangement ?? false),
      ScrollBarBackgroundColor: extra.scroll_bar_bg_color != null ? colorDict(extra.scroll_bar_bg_color) : { r: 1.0, g: 1.0, b: 1.0, a: 0.4 },
      ScrollBarBgImageRUID: { DataId: String(extra.scroll_bar_bg_ruid ?? "") },
      ScrollBarHandleColor: extra.scroll_bar_handle_color != null ? colorDict(extra.scroll_bar_handle_color) : { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      ScrollBarHandleImageRUID: { DataId: String(extra.scroll_bar_handle_ruid ?? "") },
      ScrollBarThickness: Number(extra.scroll_bar_thickness ?? 20.0),
      ScrollBarVisible: Number(extra.scroll_bar_visible ?? 0),
      SortingLayer: sort.SortingLayer,
      Spacing: Number(spacing),
      StartAxis: Number(extra.start_axis ?? 0),
      StartCorner: Number(extra.start_corner ?? 0),
      Type: layoutType,
      UseScroll: useScroll,
      VerticalScrollBarDirection: Number(extra.v_scroll_dir ?? 0),
      Enable: true,
    };
  }

  _scroll_layout_component(...args) {
    return UIBuilder._scroll_layout_component(...args);
  }

  static _text_input_component(placeholder = "", charLimit = 0, contentType = 0, lineType = 0, extra = {}) {
    const sort = sortFields(extra);
    return {
      "@type": "MOD.Core.TextInputComponent",
      AllowAutomaticTranslation: Boolean(extra.allow_auto_translation ?? true),
      AutoClear: Boolean(extra.auto_clear ?? false),
      CharacterLimit: charLimit,
      ContentType: contentType,
      IgnoreMapLayerCheck: sort.IgnoreMapLayerCheck,
      IsLocalizationKey: Boolean(extra.is_localization_key ?? false),
      LineType: lineType,
      OrderInLayer: sort.OrderInLayer,
      OverrideSorting: sort.OverrideSorting,
      PlaceHolder: String(placeholder ?? ""),
      PlaceHolderColor: extra.placeholder_color != null ? colorDict(extra.placeholder_color) : { r: 0.1953125, g: 0.1953125, b: 0.1953125, a: 0.5 },
      SortingLayer: sort.SortingLayer,
      Text: String(extra.text ?? ""),
      Enable: true,
    };
  }

  _text_input_component(...args) {
    return UIBuilder._text_input_component(...args);
  }

  static _ui_group_component(defaultShow = true, groupOrder = 0, groupType = 1) {
    return {
      "@type": "MOD.Core.UIGroupComponent",
      DefaultShow: Boolean(defaultShow),
      GroupOrder: int32Field(groupOrder, "UIGroupComponent.GroupOrder"),
      GroupType: int32Field(groupType, "UIGroupComponent.GroupType"),
      Enable: true,
    };
  }

  _ui_group_component(...args) {
    return UIBuilder._ui_group_component(...args);
  }

  static _canvas_group_component(blocksRaycasts = true, groupAlpha = 1.0, interactable = true) {
    return {
      "@type": "MOD.Core.CanvasGroupComponent",
      BlocksRaycasts: Boolean(blocksRaycasts),
      GroupAlpha: Number(groupAlpha),
      Interactable: Boolean(interactable),
      Enable: true,
    };
  }

  _canvas_group_component(...args) {
    return UIBuilder._canvas_group_component(...args);
  }

  static _mask_component(shape = 0, padding = [0, 0, 0, 0], softness = [0, 0]) {
    return {
      "@type": "MOD.Core.MaskComponent",
      Shape: Number(shape),
      Padding: { left: padding[0], right: padding[1], top: padding[2], bottom: padding[3] },
      Softness: { x: Number(softness[0]), y: Number(softness[1]) },
      Enable: true,
    };
  }

  _mask_component(...args) {
    return UIBuilder._mask_component(...args);
  }

  static _grid_view_component(totalCount = 0, cellSize = [100, 100], fixedCount = 1, fixedType = 0, spacing = [0, 0], padding = [0, 0, 0, 0], useScroll = true, scrollBarVisible = 1, scrollBarThickness = 10.0, hScrollDir = 0, vScrollDir = 0, scrollBarBgColor = null, scrollBarHandleColor = null, scrollBarBgRuid = "", scrollBarHandleRuid = "") {
    return {
      "@type": "MOD.Core.GridViewComponent",
      CellSize: { x: Number(cellSize[0]), y: Number(cellSize[1]) },
      FixedCount: Number(fixedCount),
      FixedType: Number(fixedType),
      HorizontalScrollBarDirection: Number(hScrollDir),
      Padding: { left: padding[0], right: padding[1], top: padding[2], bottom: padding[3] },
      ScrollBarBackgroundColor: scrollBarBgColor != null ? colorDict(scrollBarBgColor) : { r: 1.0, g: 1.0, b: 1.0, a: 0.0 },
      ScrollBarBackgroundImageRUID: { DataId: scrollBarBgRuid },
      ScrollBarHandleColor: scrollBarHandleColor != null ? colorDict(scrollBarHandleColor) : { r: 0.725, g: 0.71, b: 0.698, a: 1.0 },
      ScrollBarHandleImageRUID: { DataId: scrollBarHandleRuid },
      ScrollBarThickness: Number(scrollBarThickness),
      ScrollBarVisible: Number(scrollBarVisible),
      Spacing: { x: Number(spacing[0]), y: Number(spacing[1]) },
      TotalCount: Number(totalCount),
      UseScroll: Boolean(useScroll),
      VerticalScrollBarDirection: Number(vScrollDir),
      Enable: true,
    };
  }

  _grid_view_component(...args) {
    return UIBuilder._grid_view_component(...args);
  }

  static _avatar_renderer_component(color = null, flipX = false, flipY = false, playRate = 1.0, preserveAvatar = 0, raycast = true, materialId = "") {
    return {
      "@type": "MOD.Core.AvatarGUIRendererComponent",
      Color: colorDict(color),
      FlipX: Boolean(flipX),
      FlipY: Boolean(flipY),
      MaterialId: materialId,
      PlayRate: Number(playRate),
      PreserveAvatar: Number(preserveAvatar),
      RaycastTarget: Boolean(raycast),
      Enable: true,
    };
  }

  _avatar_renderer_component(...args) {
    return UIBuilder._avatar_renderer_component(...args);
  }

  static _touch_receive_component() {
    return { "@type": "MOD.Core.UITouchReceiveComponent", Enable: true };
  }

  _touch_receive_component() {
    return UIBuilder._touch_receive_component();
  }

  static _skeleton_renderer_component(skeletonRuid = "", animations = null, skins = null, color = null, flipX = false, flipY = false, loop = true, playRate = 1.0, preserveMode = 0, raycast = true) {
    return {
      "@type": "MOD.Core.SkeletonGUIRendererComponent",
      AnimationNames: animations ? [...animations] : [],
      Color: colorDict(color),
      FlipX: Boolean(flipX),
      FlipY: Boolean(flipY),
      Loop: Boolean(loop),
      PlayRate: Number(playRate),
      PreserveMode: Number(preserveMode),
      RaycastTarget: Boolean(raycast),
      SkeletonRUID: String(skeletonRuid),
      SkinNames: skins ? [...skins] : [],
      Enable: true,
    };
  }

  _skeleton_renderer_component(...args) {
    return UIBuilder._skeleton_renderer_component(...args);
  }

  static _area_particle_component(particleType = 0, areaSize = [100, 100], areaOffset = [0, 0], color = null, localScale = [1, 1], loop = true, playOnEnable = true, prewarm = false, autoRandomSeed = true, randomSeed = 0, playSpeed = 1.0, particleSize = 1.0, particleSpeed = 1.0, particleCount = 1.0, particleLifetime = 1.0) {
    return {
      "@type": "MOD.Core.UIAreaParticleComponent",
      AreaOffset: { x: Number(areaOffset[0]), y: Number(areaOffset[1]) },
      AreaSize: { x: Number(areaSize[0]), y: Number(areaSize[1]) },
      AutoRandomSeed: Boolean(autoRandomSeed),
      Color: color != null ? colorDict(color) : { r: 0.5, g: 0.25, b: 0.25, a: 1.0 },
      IsEmitting: false,
      LocalScale: { x: Number(localScale[0]), y: Number(localScale[1]) },
      Loop: Boolean(loop),
      ParticleCount: Number(particleCount),
      ParticleLifeTime: Number(particleLifetime),
      ParticleSize: Number(particleSize),
      ParticleSpeed: Number(particleSpeed),
      ParticleType: Number(particleType),
      PlayOnEnable: Boolean(playOnEnable),
      PlaySpeed: Number(playSpeed),
      Prewarm: Boolean(prewarm),
      RandomSeed: Number(randomSeed),
      Enable: true,
    };
  }

  _area_particle_component(...args) {
    return UIBuilder._area_particle_component(...args);
  }

  static _basic_particle_component(particleType = 0, color = null, localScale = [1, 1], loop = true, playOnEnable = true, prewarm = false, autoRandomSeed = true, randomSeed = 0, playSpeed = 1.0, particleSize = 1.0, particleSpeed = 1.0, particleCount = 1.0, particleLifetime = 1.0) {
    return {
      "@type": "MOD.Core.UIBasicParticleComponent",
      AutoRandomSeed: Boolean(autoRandomSeed),
      Color: color != null ? colorDict(color) : { r: 0.5, g: 0.25, b: 0.25, a: 1.0 },
      IsEmitting: false,
      LocalScale: { x: Number(localScale[0]), y: Number(localScale[1]) },
      Loop: Boolean(loop),
      ParticleCount: Number(particleCount),
      ParticleLifeTime: Number(particleLifetime),
      ParticleSize: Number(particleSize),
      ParticleSpeed: Number(particleSpeed),
      ParticleType: Number(particleType),
      PlayOnEnable: Boolean(playOnEnable),
      PlaySpeed: Number(playSpeed),
      Prewarm: Boolean(prewarm),
      RandomSeed: Number(randomSeed),
      Enable: true,
    };
  }

  _basic_particle_component(...args) {
    return UIBuilder._basic_particle_component(...args);
  }

  static _sprite_particle_component(particleType = 0, spriteRuid = "", applySpriteColor = false, localScale = [1, 1], loop = true, playOnEnable = true, prewarm = false, autoRandomSeed = true, randomSeed = 0, playSpeed = 1.0, particleSize = 1.0, particleSpeed = 1.0, particleCount = 1.0, particleLifetime = 1.0, color = null) {
    return {
      "@type": "MOD.Core.UISpriteParticleComponent",
      ApplySpriteColor: Boolean(applySpriteColor),
      AutoRandomSeed: Boolean(autoRandomSeed),
      Color: color != null ? colorDict(color) : { r: 0.5, g: 0.25, b: 0.25, a: 1.0 },
      IsEmitting: false,
      LocalScale: { x: Number(localScale[0]), y: Number(localScale[1]) },
      Loop: Boolean(loop),
      ParticleCount: Number(particleCount),
      ParticleLifeTime: Number(particleLifetime),
      ParticleSize: Number(particleSize),
      ParticleSpeed: Number(particleSpeed),
      ParticleType: Number(particleType),
      PlayOnEnable: Boolean(playOnEnable),
      PlaySpeed: Number(playSpeed),
      Prewarm: Boolean(prewarm),
      RandomSeed: Number(randomSeed),
      SpriteRUID: String(spriteRuid ?? ""),
      Enable: true,
    };
  }

  _sprite_particle_component(...args) {
    return UIBuilder._sprite_particle_component(...args);
  }

  static _joystick_component(dynamicStick = true, axis = 1, upArrow = 273, downArrow = 274, leftArrow = 276, rightArrow = 275) {
    return {
      "@type": "MOD.Core.JoystickComponent",
      Axis: Number(axis),
      DownArrow: Number(downArrow),
      DynamicStick: Boolean(dynamicStick),
      LeftArrow: Number(leftArrow),
      RightArrow: Number(rightArrow),
      UpArrow: Number(upArrow),
      Enable: true,
    };
  }

  _joystick_component(...args) {
    return UIBuilder._joystick_component(...args);
  }

  static _soft_mask_component(invertMask = false, invertOutsides = false) {
    return {
      "@type": "MOD.Core.SoftMaskComponent",
      InvertMask: Boolean(invertMask),
      InvertOutsides: Boolean(invertOutsides),
      Enable: true,
    };
  }

  _soft_mask_component(...args) {
    return UIBuilder._soft_mask_component(...args);
  }

  static _chat_component(useChatBalloon = false, expand = true, useChatEmotion = true, chatEmotionDuration = 5.0, enableVoiceChat = true, hideWorldChatButton = false, messageAlignBottom = false) {
    return {
      "@type": "MOD.Core.ChatComponent",
      ChatEmotionDuration: Number(chatEmotionDuration),
      EnableVoiceChat: Boolean(enableVoiceChat),
      Expand: Boolean(expand),
      HideWorldChatButton: Boolean(hideWorldChatButton),
      MessageAlignBottom: Boolean(messageAlignBottom),
      UseChatBalloon: Boolean(useChatBalloon),
      UseChatEmotion: Boolean(useChatEmotion),
      Enable: true,
    };
  }

  _chat_component(...args) {
    return UIBuilder._chat_component(...args);
  }

  static _line_gui_renderer_component(points = null, isFlexible = true, flexibility = 3.0, isSmooth = false, loop = false, materialId = "") {
    const pointList = Array.isArray(points) ? points.map((point) => {
      const pos = tuple(point.pos != null ? point.pos : point.position, [0, 0]);
      const colorValue = point.color != null ? colorDict(point.color) : { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
      const width = point.width != null ? Number(point.width) : 1.0;
      return {
        Position: { x: Number(pos[0]), y: Number(pos[1]) },
        Color: colorValue,
        Width: width,
      };
    }) : [];
    return {
      "@type": "MOD.Core.LineGUIRendererComponent",
      Flexibility: Number(flexibility),
      IsFlexible: Boolean(isFlexible),
      IsSmooth: Boolean(isSmooth),
      Loop: Boolean(loop),
      MaterialId: String(materialId ?? ""),
      Points: pointList,
      Enable: true,
    };
  }

  _line_gui_renderer_component(...args) {
    return UIBuilder._line_gui_renderer_component(...args);
  }

  static _polygon_gui_renderer_component(points = null, color = null, useCustomUvs = false, uvs = null, materialId = "") {
    const pointList = Array.isArray(points) ? points.map((point) => {
      const arr = tuple(point, [0, 0]);
      return { x: Number(arr[0]), y: Number(arr[1]) };
    }) : [];
    const uvList = Array.isArray(uvs) ? uvs.map((uv) => {
      const arr = tuple(uv, [0, 0]);
      return { x: Number(arr[0]), y: Number(arr[1]) };
    }) : [];
    return {
      "@type": "MOD.Core.PolygonGUIRendererComponent",
      Color: color != null ? colorDict(color) : { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
      MaterialId: String(materialId ?? ""),
      Points: pointList,
      UseCustomUVs: Boolean(useCustomUvs),
      UVs: uvList,
      Enable: true,
    };
  }

  _polygon_gui_renderer_component(...args) {
    return UIBuilder._polygon_gui_renderer_component(...args);
  }

  get_id(identifier) {
    const idx = this._find_index(identifier);
    return idx >= 0 ? this.entities[idx].id : null;
  }

  _find_index(identifier) {
    const fullPath = this._normalize_path(identifier);
    return this.entities.findIndex((entity) => this._entity_json(entity).path === fullPath);
  }

  find(identifier) {
    const idx = this._find_index(identifier);
    return idx < 0 ? null : this.entities[idx];
  }

  has_component(identifier, compType) {
    const entity = this.find(identifier);
    return entity != null && this._find_component(entity, compType) != null;
  }

  get_component(identifier, compType) {
    const entity = this.find(identifier);
    return entity == null ? null : this._find_component(entity, compType);
  }

  remove(identifier) {
    const fullPath = this._normalize_path(identifier);
    if (fullPath === this.root_path) throw new Error("Cannot remove root UI group entity");
    const before = this.entities.length;
    this.entities = this.entities.filter((entity) => {
      const entityPath = this._entity_json(entity).path || "";
      return entityPath !== fullPath && !entityPath.startsWith(`${fullPath}/`);
    });
    const removed = before - this.entities.length;
    if (removed > 0) {
      console.log(`  Removed: ${fullPath} (${removed} entities)`);
      return true;
    }
    return false;
  }

  _add(name, compNames, entryId, modelId, components, enable = true) {
    const [fullPath, parentPath, entityName] = this._resolve(name);
    const idx = this._find_index(name);
    let eid;
    let displayOrder;
    let action;
    if (idx >= 0) {
      eid = this.entities[idx].id;
      displayOrder = this.entities[idx].jsonString.displayOrder;
      action = "Updated";
    } else {
      eid = crypto.randomUUID();
      displayOrder = this._next_display_order(parentPath);
      action = "Added";
    }
    const entity = {
      id: eid,
      path: fullPath,
      componentNames: compNames,
      jsonString: {
        name: entityName,
        path: fullPath,
        nameEditable: true,
        enable,
        visible: true,
        localize: true,
        displayOrder,
        pathConstraints: this._path_constraints(fullPath),
        revision: 0,
        origin: {
          type: "Model",
          entry_id: entryId,
          sub_entity_id: null,
          root_entity_id: null,
          replaced_model_id: null,
        },
        modelId,
        "@components": components,
        "@version": 1,
      },
    };
    if (idx >= 0) this.entities[idx] = entity;
    else this.entities.push(entity);
    console.log(`  ${action}: ${name}`);
    return eid;
  }

  patch(identifier, options = {}) {
    const idx = this._find_index(identifier);
    if (idx < 0) return null;
    const entity = this.entities[idx];
    const js = this._entity_json(entity);
    const transform = this._find_component(entity, "MOD.Core.UITransformComponent");
    if (transform && (options.anchor != null || options.pos != null || options.rect_size != null || options.pivot != null)) {
      const curPos = transform.anchoredPosition || {};
      const curSize = transform.RectSize || {};
      const curPivot = transform.Pivot || {};
      const nextPos = options.pos != null ? options.pos : [curPos.x || 0.0, curPos.y || 0.0];
      const nextSize = options.rect_size != null ? options.rect_size : [curSize.x || 100.0, curSize.y || 100.0];
      let nextPivot = null;
      if (options.pivot != null) nextPivot = options.pivot;
      else if (curPivot.x != null && curPivot.y != null) nextPivot = [Number(curPivot.x), Number(curPivot.y)];
      let nextAnchor = options.anchor;
      if (nextAnchor == null) {
        nextAnchor = "middle-center";
        for (const [presetName, preset] of Object.entries(ANCHOR_PRESETS)) {
          const amin = transform.AnchorsMin || {};
          const amax = transform.AnchorsMax || {};
          if (amin.x === preset.min[0] && amin.y === preset.min[1] && amax.x === preset.max[0] && amax.y === preset.max[1]) {
            nextAnchor = presetName;
            break;
          }
        }
      }
      Object.keys(transform).forEach((key) => delete transform[key]);
      Object.assign(transform, this._ui_transform(nextAnchor, nextPos, nextSize, nextPivot));
    }
    if (options.enable != null) js.enable = Boolean(options.enable);
    if (options.visible != null) js.visible = Boolean(options.visible);
    if (options.localize != null) js.localize = Boolean(options.localize);
    if (options.display_order != null) js.displayOrder = Number(options.display_order);
    if (options.new_name) this.rename(identifier, options.new_name);
    console.log(`  Patched: ${js.path}`);
    return entity.id;
  }

  rename(identifier, newName) {
    const idx = this._find_index(identifier);
    if (idx < 0) return false;
    const entity = this.entities[idx];
    const js = this._entity_json(entity);
    const oldPath = js.path;
    if (oldPath === this.root_path) throw new Error("Cannot rename root UI group path");
    const parent = oldPath.split("/").slice(0, -1).join("/");
    const newPath = `${parent}/${newName}`;
    for (const current of this.entities) {
      const currentJs = this._entity_json(current);
      const currentPath = currentJs.path || "";
      if (currentPath === oldPath || currentPath.startsWith(`${oldPath}/`)) {
        const suffix = currentPath.slice(oldPath.length);
        const updated = newPath + suffix;
        current.path = updated;
        currentJs.path = updated;
        currentJs.pathConstraints = this._path_constraints(updated);
        if (currentPath === oldPath) currentJs.name = newName;
      }
    }
    console.log(`  Renamed: ${oldPath} -> ${newPath}`);
    return true;
  }

  upsert_component(identifier, compType, compData = null) {
    const idx = this._find_index(identifier);
    if (idx < 0) return false;
    const entity = this.entities[idx];
    const js = this._entity_json(entity);
    const component = compData == null ? { "@type": compType, Enable: true } : clone(compData);
    if (!component["@type"]) component["@type"] = compType;
    const current = this._find_component(entity, compType);
    if (current != null) {
      Object.keys(current).forEach((key) => delete current[key]);
      Object.assign(current, component);
      this._refresh_component_names_from_components(entity);
      console.log(`  Replaced component ${compType} on ${js.name}`);
      return true;
    }
    js["@components"] = js["@components"] || [];
    js["@components"].push(component);
    this._refresh_component_names_from_components(entity);
    console.log(`  Added component ${compType} to ${js.name}`);
    return true;
  }

  add_component(identifier, compType, compData = null) {
    const idx = this._find_index(identifier);
    if (idx < 0) return false;
    if (this._find_component(this.entities[idx], compType) != null) return false;
    return this.upsert_component(identifier, compType, compData);
  }

  patch_component(identifier, compType, updates) {
    const entity = this.find(identifier);
    if (entity == null) return false;
    const component = this._find_component(entity, compType);
    if (component == null) return false;
    Object.assign(component, updates);
    console.log(`  Patched component ${compType} on ${this._entity_json(entity).name}`);
    return true;
  }

  remove_component(identifier, compType) {
    const idx = this._find_index(identifier);
    if (idx < 0) return false;
    if (compType === "MOD.Core.UITransformComponent") throw new Error("UITransformComponent cannot be removed from UI entities");
    const entity = this.entities[idx];
    const js = this._entity_json(entity);
    if (this._find_component(entity, compType) == null) return false;
    js["@components"] = (js["@components"] || []).filter((component) => component["@type"] !== compType);
    this._refresh_component_names_from_components(entity);
    console.log(`  Removed component ${compType} from ${js.name}`);
    return true;
  }

  set_component_enabled(identifier, compType, enabled) {
    const entity = this.find(identifier);
    if (entity == null) return false;
    const component = this._find_component(entity, compType);
    if (component == null) return false;
    component.Enable = Boolean(enabled);
    console.log(`  Set ${compType}.Enable=${enabled} on ${this._entity_json(entity).name}`);
    return true;
  }

  panel(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [1920, 1080]), options.pivot ?? null),
    ], options.enable ?? true);
  }

  text(name, text = "", options = {}) {
    const size = options.size ?? 24;
    let rectSize = options.rect_size;
    if (rectSize == null) rectSize = [Math.max(String(text).length * size, 400), size + 16];
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.TextComponent", "UIText", "uitext", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), rectSize, options.pivot ?? null),
      this._sprite_renderer(null, 0.0, false, 0, 0, "", sort),
      this._text_component(text, size, options.color ?? null, options.bold ?? false, options.alignment ?? 4, {
        overflow: options.overflow ?? 0,
        bestfit: options.bestfit ?? false,
        min_size: options.min_size ?? 10,
        max_size: options.max_size ?? null,
        outline: options.outline ?? false,
        outline_color: options.outline_color ?? null,
        outline_width: options.outline_width ?? null,
        is_localization_key: options.is_localization_key ?? false,
        allow_auto_translation: options.allow_auto_translation ?? true,
        use_constraint_x: options.use_constraint_x ?? false,
        constraint_x: options.constraint_x ?? 100.0,
        use_constraint_y: options.use_constraint_y ?? false,
        constraint_y: options.constraint_y ?? 100.0,
        ...sort,
      }),
    ], options.enable ?? true);
  }

  sprite(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent", "UISprite", "uisprite", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._sprite_renderer(options.color ?? null, options.alpha ?? 1.0, options.raycast ?? false, options.fill_method ?? 0, options.sprite_type ?? 0, imageRuid, { preserve_aspect: options.preserve_aspect ?? false, material_id: options.material_id ?? "", ...sort }),
    ], options.enable ?? true);
  }

  button(name, text = "", options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.ButtonComponent,MOD.Core.TextComponent", "UIButton", "uibutton", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 50]), options.pivot ?? null),
      this._sprite_renderer(null, 1.0, true, 0, 0, imageRuid, sort),
      this._button_component(sort),
      this._text_component(text, options.font_size ?? 24, options.color ?? "#000000", false, 4, sort),
    ], options.enable ?? true);
  }

  script(name, scriptName, options = {}) {
    return this._add(name, `MOD.Core.UITransformComponent,${scriptName}`, "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "stretch", tuple(options.pos, [0, 0]), tuple(options.rect_size, [1920, 1080]), options.pivot ?? null),
      { "@type": scriptName, Enable: true },
    ], options.enable ?? true);
  }

  slider(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.SliderComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 30]), options.pivot ?? null),
      this._sprite_renderer(null, 1.0, true, 0, 0, imageRuid, sort),
      this._slider_component(options.min_val ?? 0, options.max_val ?? 1, options.value ?? 0, options.direction ?? 0, options.use_handle ?? true, options.use_integer ?? false, { ...options, ...sort }),
    ], options.enable ?? true);
  }

  scroll_layout(name, options = {}) {
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.ScrollLayoutGroupComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [400, 600]), options.pivot ?? null),
      this._scroll_layout_component(options.layout_type ?? 0, options.spacing ?? 0, tuple(options.cell_size, [100, 100]), options.use_scroll ?? true, tuple(options.padding, [0, 0, 0, 0]), { ...options, ...sort }),
    ], options.enable ?? true);
  }

  text_input(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    const sort = _resolve_sort_options(options);
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.TextComponent,MOD.Core.TextInputComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [300, 50]), options.pivot ?? null),
      this._sprite_renderer(null, 1.0, true, 0, 0, imageRuid, sort),
      this._text_component(String(options.text ?? ""), options.font_size ?? 24, options.color ?? "#000000", false, 4, sort),
      this._text_input_component(options.placeholder ?? "", options.char_limit ?? 0, options.content_type ?? 0, options.line_type ?? 0, { ...options, ...sort }),
    ], options.enable ?? true);
  }

  group(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.UIGroupComponent,MOD.Core.CanvasGroupComponent", "UIGroup", "uigroup", [
      this._ui_transform(options.anchor || "stretch", tuple(options.pos, [0, 0]), tuple(options.rect_size, [1920, 1080]), options.pivot ?? null),
      this._ui_group_component(options.default_show ?? true, options.group_order ?? 0, options.group_type ?? 1),
      this._canvas_group_component(options.blocks_raycasts ?? true, options.group_alpha ?? 1.0, options.interactable ?? true),
    ], options.enable ?? true);
  }

  mask(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.MaskComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 200]), options.pivot ?? null),
      this._sprite_renderer(options.color ?? null, options.alpha ?? 0.0, false, 0, 0, imageRuid),
      this._mask_component(options.shape ?? 0, tuple(options.padding, [0, 0, 0, 0]), tuple(options.softness, [0, 0])),
    ], options.enable ?? true);
  }

  grid_view(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.GridViewComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [400, 600]), options.pivot ?? null),
      this._grid_view_component(options.total_count ?? 0, tuple(options.cell_size, [100, 100]), options.fixed_count ?? 1, options.fixed_type ?? 0, tuple(options.spacing, [0, 0]), tuple(options.padding, [0, 0, 0, 0]), options.use_scroll ?? true, options.scroll_bar_visible ?? 1, options.scroll_bar_thickness ?? 10.0),
    ], options.enable ?? true);
  }

  avatar(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.AvatarGUIRendererComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 300]), options.pivot ?? null),
      this._avatar_renderer_component(options.color ?? null, options.flip_x ?? false, options.flip_y ?? false, options.play_rate ?? 1.0, options.preserve_avatar ?? 0, options.raycast ?? true, options.material_id ?? ""),
    ], options.enable ?? true);
  }

  touch_receive(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.UITouchReceiveComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "stretch", tuple(options.pos, [0, 0]), tuple(options.rect_size, [1920, 1080]), options.pivot ?? null),
      this._touch_receive_component(),
    ], options.enable ?? true);
  }

  skeleton(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SkeletonGUIRendererComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 200]), options.pivot ?? null),
      this._skeleton_renderer_component(options.skeleton_ruid ?? "", options.animations ?? null, options.skins ?? null, options.color ?? null, options.flip_x ?? false, options.flip_y ?? false, options.loop ?? true, options.play_rate ?? 1.0, options.preserve_mode ?? 0, options.raycast ?? true),
    ], options.enable ?? true);
  }

  area_particle(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.UIAreaParticleComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._area_particle_component(options.particle_type ?? 0, tuple(options.area_size, [100, 100]), tuple(options.area_offset, [0, 0]), options.color ?? null, tuple(options.local_scale, [1, 1]), options.loop ?? true, options.play_on_enable ?? true, options.prewarm ?? false, options.auto_random_seed ?? true, options.random_seed ?? 0, options.play_speed ?? 1.0, options.particle_size ?? 1.0, options.particle_speed ?? 1.0, options.particle_count ?? 1.0, options.particle_lifetime ?? 1.0),
    ], options.enable ?? true);
  }

  basic_particle(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.UIBasicParticleComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._basic_particle_component(options.particle_type ?? 0, options.color ?? null, tuple(options.local_scale, [1, 1]), options.loop ?? true, options.play_on_enable ?? true, options.prewarm ?? false, options.auto_random_seed ?? true, options.random_seed ?? 0, options.play_speed ?? 1.0, options.particle_size ?? 1.0, options.particle_speed ?? 1.0, options.particle_count ?? 1.0, options.particle_lifetime ?? 1.0),
    ], options.enable ?? true);
  }

  sprite_particle(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.UISpriteParticleComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._sprite_particle_component(options.particle_type ?? 0, options.sprite_ruid ?? "", options.apply_sprite_color ?? false, tuple(options.local_scale, [1, 1]), options.loop ?? true, options.play_on_enable ?? true, options.prewarm ?? false, options.auto_random_seed ?? true, options.random_seed ?? 0, options.play_speed ?? 1.0, options.particle_size ?? 1.0, options.particle_speed ?? 1.0, options.particle_count ?? 1.0, options.particle_lifetime ?? 1.0, options.color ?? null),
    ], options.enable ?? true);
  }

  joystick(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.JoystickComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "bottom-left", tuple(options.pos, [200, 200]), tuple(options.rect_size, [300, 300]), options.pivot ?? null),
      this._sprite_renderer(options.color ?? null, options.alpha ?? 1.0, false, 0, 0, imageRuid),
      this._joystick_component(options.dynamic_stick ?? true, options.axis ?? 1, options.up_arrow ?? 273, options.down_arrow ?? 274, options.left_arrow ?? 276, options.right_arrow ?? 275),
    ], options.enable ?? true);
  }

  soft_mask(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.SoftMaskComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [200, 200]), options.pivot ?? null),
      this._sprite_renderer(options.color ?? null, options.alpha ?? 0.0, false, 0, 0, imageRuid),
      this._soft_mask_component(options.invert_mask ?? false, options.invert_outsides ?? false),
    ], options.enable ?? true);
  }

  chat(name, options = {}) {
    const imageRuid = options.image_ruid != null ? options.image_ruid : this.default_ruid;
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.SpriteGUIRendererComponent,MOD.Core.ChatComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "bottom-left", tuple(options.pos, [200, 200]), tuple(options.rect_size, [400, 300]), options.pivot ?? null),
      this._sprite_renderer(options.color ?? null, options.alpha ?? 0.0, true, 0, 0, imageRuid),
      this._chat_component(options.use_chat_balloon ?? false, options.expand ?? true, options.use_chat_emotion ?? true, options.chat_emotion_duration ?? 5.0, options.enable_voice_chat ?? true, options.hide_world_chat_button ?? false, options.message_align_bottom ?? false),
    ], options.enable ?? true);
  }

  line(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.LineGUIRendererComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._line_gui_renderer_component(options.points ?? null, options.is_flexible ?? true, options.flexibility ?? 3.0, options.is_smooth ?? false, options.loop ?? false, options.material_id ?? ""),
    ], options.enable ?? true);
  }

  polygon(name, options = {}) {
    return this._add(name, "MOD.Core.UITransformComponent,MOD.Core.PolygonGUIRendererComponent", "UIEmpty", "uiempty", [
      this._ui_transform(options.anchor || "middle-center", tuple(options.pos, [0, 0]), tuple(options.rect_size, [100, 100]), options.pivot ?? null),
      this._polygon_gui_renderer_component(options.points ?? null, options.color ?? null, options.use_custom_uvs ?? false, options.uvs ?? null, options.material_id ?? ""),
    ], options.enable ?? true);
  }

  list_entities() {
    const result = [];
    for (const entity of [...this.entities].sort((a, b) => String(this._entity_json(a).path || "").localeCompare(String(this._entity_json(b).path || "")))) {
      const js = entity.jsonString;
      const comps = (js["@components"] || []).map((component) => component["@type"]);
      let kind = "?";
      const model = js.modelId || "";
      if (model === "uigroup") kind = "GROUP";
      else if (model === "uibutton") kind = "BTN";
      else if (model === "uitext") kind = "TEXT";
      else if (model === "uisprite") kind = "SPR";
      else if (model === "uiempty") kind = "PANEL";
      for (const component of comps) {
        if (!KNOWN_COMPONENTS.has(component)) kind = "SCRIPT";
        else if (component === "MOD.Core.UIGroupComponent" && kind !== "GROUP") kind = "GROUP";
        else if (component === "MOD.Core.MaskComponent") kind = "MASK";
        else if (component === "MOD.Core.SoftMaskComponent") kind = "MASK";
        else if (component === "MOD.Core.GridViewComponent") kind = "GRID";
        else if (component === "MOD.Core.AvatarGUIRendererComponent") kind = "AVATAR";
        else if (component === "MOD.Core.UITouchReceiveComponent") kind = "TOUCH";
        else if (component === "MOD.Core.SkeletonGUIRendererComponent") kind = "SKEL";
        else if (component === "MOD.Core.UIAreaParticleComponent" || component === "MOD.Core.UIBasicParticleComponent" || component === "MOD.Core.UISpriteParticleComponent") kind = "PARTICLE";
        else if (component === "MOD.Core.JoystickComponent") kind = "JOY";
        else if (component === "MOD.Core.ChatComponent") kind = "CHAT";
        else if (component === "MOD.Core.LineGUIRendererComponent") kind = "LINE";
        else if (component === "MOD.Core.PolygonGUIRendererComponent") kind = "POLY";
      }
      let pos = [0, 0];
      let size = [0, 0];
      for (const component of js["@components"] || []) {
        if (component["@type"] === "MOD.Core.UITransformComponent") {
          const ap = component.anchoredPosition || {};
          const rs = component.RectSize || {};
          pos = [ap.x || 0, ap.y || 0];
          size = [rs.x || 0, rs.y || 0];
        }
      }
      const entityPath = js.path || "";
      const depth = entityPath.startsWith(this.root_path) ? (entityPath.slice(this.root_path.length).match(/\//g) || []).length : 0;
      const info = { name: js.name || "", path: entityPath, depth, kind, pos, size, enable: js.enable ?? true };
      result.push(info);
      const indent = "  ".repeat(depth);
      const posStr = pos[0] !== 0 || pos[1] !== 0 ? `(${pos[0].toFixed(0)},${pos[1].toFixed(0)})` : "";
      const sizeStr = `${Number(size[0]).toFixed(0)}x${Number(size[1]).toFixed(0)}`;
      const enableStr = info.enable ? "" : " [disabled]";
      console.log(`  ${indent}${kind.padEnd(6)} ${info.name.padEnd(20)} ${posStr.padEnd(12)} ${sizeStr}${enableStr}`);
    }
    return result;
  }

  build() {
    if (this._data != null) {
      this._data.ContentProto.Entities = this.entities;
      return this._data;
    }
    return {
      Id: "",
      GameId: "",
      EntryKey: `ui://${this.root_uuid}`,
      ContentType: "x-mod/ui",
      Content: "",
      Usage: 0,
      UsePublish: 1,
      UseService: 0,
      CoreVersion: "26.5.0.0",
      StudioVersion: "0.1.0.0",
      DynamicLoading: 0,
      ContentProto: { Use: "Binary", Entities: this.entities },
    };
  }

  write(filepath, options = {}) {
    const lint = options.lint ?? true;
    const strict = options.strict ?? true;
    const lintVerbose = options.lint_verbose ?? false;
    const data = this.build();
    assertNoInvalidNumbers(data);
    assertComponentScalarTypes(data);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`Written ${this.entities.length} entities to ${filepath}`);
    if (lint) runUiLint(filepath, strict, lintVerbose);
    if (options.bind != null) {
      const [mluaPath, props] = UIBuilder._normalize_bind_arg(options.bind);
      this.inject_bindings(mluaPath, props);
    }
  }

  static _normalize_bind_arg(bind) {
    if (Array.isArray(bind) && bind.length === 2) return [bind[0], bind[1]];
    if (bind && typeof bind === "object") {
      if (bind.mlua == null || bind.props == null) {
        throw new Error(`bind dict must contain 'mlua' (path) and 'props' (mapping). Got keys=${Object.keys(bind)}`);
      }
      return [bind.mlua, bind.props];
    }
    throw new TypeError(`bind must be a dict {'mlua': ..., 'props': {...}} or a (mlua_path, props) tuple. Got ${typeof bind}`);
  }

  inject_bindings(mluaPath, props) {
    if (!fs.existsSync(mluaPath) || !fs.statSync(mluaPath).isFile()) throw new Error(`inject_bindings: target .mlua not found: ${mluaPath}`);
    if (path.extname(mluaPath) !== ".mlua") throw new Error(`inject_bindings: target must be a .mlua file: ${mluaPath}`);
    const resolved = {};
    const missingEntities = [];
    for (const [propName, entityRef] of Object.entries(props)) {
      const uid = this.get_id(entityRef);
      if (uid == null) missingEntities.push(`${propName} -> ${entityRef}`);
      else resolved[propName] = uid;
    }
    if (missingEntities.length) throw new Error(`inject_bindings: entity not found for ${missingEntities.join(", ")}`);
    let src = fs.readFileSync(mluaPath, "utf8");
    const missingProps = [];
    const duplicatedProps = [];
    for (const [propName, uid] of Object.entries(resolved)) {
      const pattern = new RegExp(`(property\\s+\\S+\\s+${escapeRegExp(propName)}\\s*=\\s*)"[^"]*"`, "g");
      let count = 0;
      const newSrc = src.replace(pattern, (_match, prefix) => {
        count += 1;
        return `${prefix}"${uid}"`;
      });
      if (count === 0) missingProps.push(propName);
      else if (count > 1) duplicatedProps.push(`${propName} (${count}x)`);
      else src = newSrc;
    }
    if (missingProps.length) throw new Error(`inject_bindings: property not found in ${mluaPath}: ${missingProps.join(", ")}`);
    if (duplicatedProps.length) throw new Error(`inject_bindings: property declared multiple times in ${mluaPath}: ${duplicatedProps.join(", ")}`);
    fs.writeFileSync(mluaPath, src, "utf8");
    console.log(`  Bound ${Object.keys(resolved).length} property/properties in ${mluaPath}`);
    return resolved;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runUiLint(filepath, strict, verbose) {
  const lintPath = path.join(__dirname, "ui_lint.cjs");
  if (!fs.existsSync(lintPath)) {
    console.log(`WARN ui_lint.cjs not found at ${__dirname} - skipped lint`);
    return;
  }
  let lintModule;
  try {
    lintModule = require(lintPath);
  } catch (err) {
    console.log(`WARN ui_lint import failed (${err.message}) - skipped`);
    return;
  }
  const findings = lintModule.lintUiFile(filepath);
  const errors = findings.filter((finding) => finding.severity === lintModule.SEVERITY_ERROR);
  const warns = findings.filter((finding) => finding.severity === lintModule.SEVERITY_WARN);
  if (verbose) findings.forEach((finding) => console.log(formatFinding(finding)));
  else errors.forEach((finding) => console.log(formatFinding(finding)));
  if (errors.length) {
    const msg = `ui_lint: ${errors.length} error(s), ${warns.length} warning(s) in ${filepath}`;
    if (strict) throw new Error(msg);
    console.log(`x ${msg}`);
    return;
  }
  if (warns.length) {
    const extra = verbose ? "" : " (pass lint_verbose=true to see)";
    console.log(`WARN ui_lint: ${warns.length} warning(s)${extra}`);
  } else {
    console.log("OK ui_lint: clean");
  }
}

function formatFinding(finding) {
  const sev = finding.severity.toUpperCase().padEnd(7);
  return `[${sev}] ${finding.rule} ${finding.path}\n        ${finding.message}${finding.hint ? `\n        hint: ${finding.hint}` : ""}`;
}

module.exports = {
  UIBuilder,
  DEFAULT_SPRITE_RUID,
  ANCHOR_DEFAULT_PIVOT,
  ANCHOR_PRESETS,
  hexToRgba,
  colorDict,
};
