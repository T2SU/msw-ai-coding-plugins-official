# .model File Schema

Defines an entity template. Declares component composition, property aliases, default values, and child entities.

---

## Overall Structure

```json
{
  "Id": "",
  "GameId": "",
  "EntryKey": "model://{model_name_lowercase}",
  "ContentType": "x-mod/model",
  "Content": "",
  "Usage": 0,
  "UsePublish": 1,
  "UseService": 0,
  "CoreVersion": "",
  "StudioVersion": "",
  "DynamicLoading": 0,
  "ContentProto": {
    "Use": "Json",
    "Json": {
      "Name": "{ModelName}",
      "BaseModelId": null,
      "Id": "{model_name_lowercase}",
      "Components": [],
      "Properties": [],
      "Values": [],
      "Children": []
    }
  }
}
```

**Top-level field rules**:
- `Id`/`GameId`: always empty string `""` — system fills them at runtime. AI must not touch them
- `CoreVersion`/`StudioVersion`: empty string `""` (file wrapper, managed by Maker)
- `ContentProto.Json.CoreVersion`/`ModelVersion`: **do not exist**
- `ContentProto.Json.Id`: must match the EntryKey identifier (e.g., `model://chasemonster` → `"Id": "chasemonster"`)

---

## Components — Component List

The full-path list of components to attach to the entity.

```json
"Components": [
  "MOD.Core.TransformComponent",
  "MOD.Core.SpriteRendererComponent",
  "MOD.Core.MovementComponent",
  "MOD.Core.RigidbodyComponent",
  "MOD.Core.StateComponent",
  "MOD.Core.AttackComponent",
  "MOD.Core.HitComponent",
  "script.Monster",
  "script.MonsterAttack"
]
```

### Path Rules

- Engine components: `MOD.Core.{ComponentName}`
- User scripts: `script.{ScriptName}` (case-exact)

### Frequent Components

| Component | Purpose | Required |
|---------|------|----------|
| `TransformComponent` | Position, rotation, scale | Almost always |
| `SpriteRendererComponent` | Visual representation | Required if it must be visible |
| `MovementComponent` | Movement system | Moving entities |
| `RigidbodyComponent` | Physics body (MapleTile) | Sideview |
| `KinematicbodyComponent` | Physics body (RectTile) | Top-down |
| `SideviewbodyComponent` | Physics body (SideViewRectTile) | Sideview RectTile |
| `StateComponent` | State machine | When managing states |
| `AttackComponent` | Attack system | Attackers |
| `HitComponent` | Hit/damage system | Hit targets |
| `PlayerControllerComponent` | Player input | Player entities |

### Caution

Putting custom components (`script.xxx`) in the Components array can cause load failures.
If unstable → consider attaching at runtime via `AddComponent`.

---

## Properties — Inspector Properties

Property aliases exposed in the editor inspector. Bound to actual component properties via **Link**.

```json
"Properties": [
  {
    "Name": "speed",
    "DisplayName": "Movement Speed",
    "ShowInInspector": true,
    "Link": {
      "Target": "MOD.Core.MovementComponent",
      "Property": "InputSpeed"
    }
  },
  {
    "Name": "maxHp",
    "DisplayName": "Max HP",
    "ShowInInspector": true,
    "Link": {
      "Target": "script.Monster",
      "Property": "MaxHp"
    }
  }
]
```

### Field Reference

| Field | Description |
|------|------|
| `Name` | Property identifier (used by code) |
| `DisplayName` | Display name in the editor |
| `ShowInInspector` | Whether to show in the inspector |
| `Link.Target` | Path of the target component |
| `Link.Property` | Property name on the target component |

---

## Values — Default Values

Sets default values for component properties. **Matched by Name** (array order does not matter).

```json
"Values": [
  {
    "TargetType": "MOD.Core.TransformComponent",
    "Name": "WorldPosition",
    "Value": { "x": 0.0, "y": 2.0, "z": 0.0 }
  },
  {
    "TargetType": "MOD.Core.SpriteRendererComponent",
    "Name": "SpriteRUID",
    "Value": "1705e3c5b2c146ac9a699f96fb067408"
  },
  {
    "TargetType": "MOD.Core.MovementComponent",
    "Name": "InputSpeed",
    "Value": 3.0
  },
  {
    "TargetType": "script.Monster",
    "Name": "MaxHp",
    "Value": 100
  },
  {
    "TargetType": "script.Monster",
    "Name": "RespawnTime",
    "Value": 5.0
  }
]
```

### JSON Form by Property Type

| Property Type | JSON Value Form |
|-------------|----------------|
| `number` | `3.0` (with decimal point) |
| `integer` | `100` (integer) |
| `string` | `"text"` |
| `boolean` | `true` / `false` |
| `Vector2` | `{ "x": 0, "y": 0 }` |
| `Vector3` | `{ "x": 0, "y": 0, "z": 0 }` |
| `Color` | `{ "r": 1, "g": 1, "b": 1, "a": 1 }` |

### Notes

- The field name is **`"TargetType"`** — specifies the path of the target component
- If `TargetType` is `null` → applied directly to a script property (does not go through a component)
- If `TargetType` is a string → applied to that component's property
- `Name` must match exactly in case
- A nonexistent `Name` is ignored (no error)
- The **order of the Values array does not matter** — matching is by TargetType + Name

---

## Children — Child Entities

```json
"Children": [
  {
    "Name": "Weapon",
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
    "Children": []
  }
]
```

- Recursive structure: each child also contains Components/Properties/Values/Children
- The child's TransformComponent is in **parent-relative local coordinates**

---

## Complete Example: Chase Monster

```json
{
  "Id": "",
  "GameId": "",
  "EntryKey": "model://chasemonster",
  "ContentType": "x-mod/model",
  "Content": "",
  "Usage": 0,
  "UsePublish": 1,
  "UseService": 0,
  "CoreVersion": "",
  "StudioVersion": "",
  "DynamicLoading": 0,
  "ContentProto": {
    "Use": "Json",
    "Json": {
      "Name": "ChaseMonster",
      "BaseModelId": null,
      "Id": "chasemonster",
      "Components": [
        "MOD.Core.TransformComponent",
        "MOD.Core.SpriteRendererComponent",
        "MOD.Core.MovementComponent",
        "MOD.Core.RigidbodyComponent",
        "MOD.Core.StateComponent",
        "MOD.Core.HitComponent",
        "script.Monster"
      ],
      "Properties": [
        {
          "Name": "speed",
          "DisplayName": "speed",
          "ShowInInspector": true,
          "Link": {
            "Target": "MOD.Core.MovementComponent",
            "Property": "InputSpeed"
          }
        },
        {
          "Name": "hp",
          "DisplayName": "HP",
          "ShowInInspector": true,
          "Link": {
            "Target": "script.Monster",
            "Property": "MaxHp"
          }
        }
      ],
      "Values": [
        {
          "TargetType": "MOD.Core.MovementComponent",
          "Name": "InputSpeed",
          "Value": 2.0
        },
        {
          "TargetType": "MOD.Core.SpriteRendererComponent",
          "Name": "SpriteRUID",
          "Value": "1705e3c5b2c146ac9a699f96fb067408"
        },
        {
          "TargetType": "script.Monster",
          "Name": "MaxHp",
          "Value": 200
        },
        {
          "TargetType": "script.Monster",
          "Name": "RespawnTime",
          "Value": 10.0
        }
      ],
      "Children": []
    }
  }
}
```
