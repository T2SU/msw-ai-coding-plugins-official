# Avatar Lookup & Rendering

Search avatar costume items, browse the full avatar catalog, look up
default parts, inspect item details, and render a combined avatar in a
specific pose.

> **All examples in this file go through the Node.js wrapper
> `skills/msw-search/msw_resource_api.cjs`.** Use it either as a CLI from a
> shell or via `require(...)` inside Node.js — never assemble curl commands
> by hand.

---

## Searching Costume Items — `POST /v3/search/resources`

**Costume items (hats, coats, shoes, weapons, …) are searched through the
general resource-search endpoint** with `resourceTypeFilter: ["avataritem"]`.
The wrapper exposes this as `searchAvatarItems` (CLI: `search-avatar`)
and hard-codes that filter, so you only need to pass the query (and
optionally a slot category).

```bash
# CLI — narrow to a specific slot with --category
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs \
    search-avatar "early dismissal" --topK 3 --category shoes
```

```js
// Node.js
const { searchAvatarItems } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const result = await searchAvatarItems("early dismissal", {
  topK: 3,
  categoryFilter: ["shoes"],
});
```

Each result has `type: "avataritem"` and a `category` matching the avatar slot
(`cap`, `coat`, `pants`, `shoes`, `weapon`, …). Use the `id` (RUID) to assign to
the corresponding `Custom*Equip` property — see the slot mapping table in the
`msw-avatar` skill.

> **For full request/response details (fields like `dname`, `score`, `hasEmbedding`,
> `payload.color_hex`, `categoryFilter` slot list, pagination via `nextOffset`/`offset`),
> see the "Avatar Item Search" section in `references/resource/search.md`.**

---

## GET /v3/avatars

List **all** avatar items (server-cached). Best for browsing tabs without
a query; for keyword search use `searchAvatarItems`.

### Usage

```bash
# CLI — canonical-only (default; deduped by color/shape variant)
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs avatars

# Include all variants
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs avatars --no-canonical-only
```

```js
// Node.js
const { listAvatars } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const avatars = await listAvatars({ canonicalOnly: true });
```

| Query param (server) | Wrapper arg / CLI flag | Type | Description |
|----------------------|------------------------|------|-------------|
| `canonicalOnly` | `canonicalOnly` / `--no-canonical-only` | bool | Server default `true` (variant groups deduped to representative) |

### Response

```json
{
  "items": [
    {
      "ruid": "d9e9948624a54255b079df8dba096f47",
      "category": "coat",
      "names": {"ko": ["옐로우 프릴 슬리브리스"]},
      "dname": "coat-541",
      "group_id": "coat:757587b9bf92",
      "color_hex": "#eeac19",
      "group_size": 2,
      "group_canonical": false,
      "group_members": [...]
    }
  ],
  "nextOffset": null,
  "total": null
}
```

---

## GET /v3/avatars/defaults

Fetch the default avatar body / head RUIDs — the required base parts for avatar rendering.

### Usage

```bash
# CLI
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs \
    avatar-defaults
```

```js
// Node.js
const { getAvatarDefaults } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const defaults = await getAvatarDefaults();
```

### Response

```json
{
  "body": "body_ruid_32hex",
  "head": "head_ruid_32hex"
}
```

`body` and `head` are mandatory parts that must always be included when rendering an avatar.

---

## Inspecting an avatar item — use `GET /v3/resources/{ruid}`

> **There is no `/v3/avatars/{ruid}` endpoint.** Avatar item details
> live behind the same `GET /v3/resources/{ruid}` endpoint that returns
> sprites, animationclips, and resource_packs.

### Usage

```bash
# CLI
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs \
    get ITEM_RUID
```

```js
// Node.js
const { getResource } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const item = await getResource("ITEM_RUID");
```

### Response (avataritem branch)

```json
{
  "id": "71ce85c4acf04770949b7a55488974c2",
  "type": "avataritem",
  "category": "cap",
  "names": {"ko": ["주황버섯 빵모자"]},
  "dname": "cap-895",
  "payload": {
    "color_hex": "#ed8316",
    "group_size": 2,
    "group_canonical": false,
    "group_members": [...],
    "group_id": "cap:..."
  }
}
```

---

## POST /v3/avatar/render

Render a combined avatar (multiple parts) in a specific action pose.

### Usage

```bash
# CLI — body + head are required; equipment slots are optional.
# --actions defaults to ["stand1"] when omitted.
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs \
    avatar-render \
    --ruids body_ruid head_ruid hat_ruid weapon_ruid \
    --actions stand1 walk1
```

```js
// Node.js
const { renderAvatar } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const result = await renderAvatar(
  ["body_ruid", "head_ruid", "hat_ruid", "weapon_ruid"],
  { actions: ["stand1", "walk1"] },
);
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ruids` | string[] (1–20) | O | Array of part RUIDs. **body + head should be included**; equipment is optional. Same-category items: only the first one is used. |
| `actions` | string[] (1–40) | O (wrapper defaults to `["stand1"]`) | Action poses to render |
| `expressions` | string[] (1–25) | - | Default `["default"]`. Other values: `angry`, `bewildered`, `blaze`, `bowing`, `cheers`, `chu`, `cry`, `dam`, `despair`, `glitter`, `hit`, `hot`, `hum`, `love`, `oops`, `pain`, `qBlue`, `shine`, `smile`, `stunned`, `troubled`, `vomit`, `wink` |
| `earType` (body field `ear_type`) | string | - | `humanear` (default), `ear`, `lefear`, `highlefear` |
| `renderingType` (body field `rendering_type`) | string | - | `sprite` (default — per-frame PNGs) or `animationclip` (per-action WebPs) |

**Common actions:**

| Action | Description |
|--------|-------------|
| `stand1`, `stand2` | Idle standing |
| `walk1`, `walk2` | Walking |
| `alert` | Alert stance |
| `swingO1` … `swingOF` / `stabO1` … `stabOF` | One-handed weapon |
| `swingT1` … / `stabT1` … | Two-handed weapon |
| `swingP1` … | Pole-arm |
| `shoot1`, `shoot2`, `shootF` | Ranged |
| `prone`, `proneStab` | Prone / prone stab |
| `fly`, `jump`, `sit`, `ladder`, `rope`, `heal`, `dead` | Misc |

### Response (sprite mode)

```json
{
  "rendering_type": "sprite",
  "actions": {
    "stand1": {
      "default": {
        "frames": [
          {
            "filename": "<hash>_stand1_0.png",
            "width": 44,
            "height": 77,
            "delay": 500.0,
            "pivot_x": 23,
            "pivot_y": 0
          }
        ]
      }
    }
  },
  "animationclip_actions": {}
}
```

When `rendering_type=animationclip`, the per-action WebP info appears
under `animationclip_actions[action][expression]` instead.

### Rendered Image URL

Each frame image is served at:

```
https://maplestoryworlds-resourcesearch-new.nexon.com/v3/avatar/render/{filename}
```

The wrapper provides a helper that builds this URL safely (URL-encoding the
filename):

```bash
# CLI
node plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs \
    avatar-frame-url rendered_frame_name
```

```js
// Node.js
const { avatarFrameUrl } = require('plugins/msw-maker-base-skill/skills/msw-search/msw_resource_api.cjs');

const url = avatarFrameUrl("rendered_frame_name");
```

---

## Workflows

### Rendering an avatar
1. `getAvatarDefaults()` → get default body / head RUIDs
2. `searchAvatarItems("...")` → obtain equipment item RUIDs (hat, weapon, etc.)
3. `renderAvatar([body, head, hat, weapon, ...], { actions: [...] })` → render the combination
4. Build image URLs via `avatarFrameUrl(filename)` from the response

### Costume item search → application
1. `searchAvatarItems("...", { topK: N, categoryFilter: [slot] })` → obtain RUID
2. Use the slot mapping table in the `msw-avatar` skill to assign the RUID to the correct `Custom*Equip` property
3. Edit `./Global/DefaultPlayer.model` or the relevant `.map` file → `refresh`

### Inspecting avatar item details
1. `searchAvatarItems("...")` → search for a costume item and get its RUID
2. `getResource(ruid)` → inspect color_hex / group meta / variants
3. (Optional) `renderAvatar([body, head, ruid])` → preview the render
