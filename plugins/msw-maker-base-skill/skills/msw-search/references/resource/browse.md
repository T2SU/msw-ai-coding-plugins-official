# Listing, Random Recommendations, and Pack Lookups

Browse resources by type/category, get random recommendations, and find
which resource packs include a given RUID.

> **All examples in this file go through the Node.js wrapper
> `skills/msw-search/msw_resource_api.cjs`.** Use it either as a CLI from a
> shell or via `require(...)` inside Node.js — never assemble curl commands
> by hand.

## GET /v3/resources

Qdrant Scroll over all resources with embeddings. Supports filters and
opaque-string cursor pagination.

### Usage

```bash
# CLI — list 3 monster sprites
node ../../msw_resource_api.cjs \
    list --resource-type sprite --category mob --limit 3
```

```js
// Node.js
const { listResources } = require('../../msw_resource_api.cjs');

const result = await listResources({
  resourceTypeFilter: ["sprite"],
  categoryFilter: ["mob"],
  limit: 3,
});
// Next page:
const nextPage = await listResources({
  resourceTypeFilter: ["sprite"],
  categoryFilter: ["mob"],
  limit: 3,
  offset: result.nextOffset,
});
```

| Query param (server) | Wrapper arg / CLI flag | Type | Description |
|----------------------|------------------------|------|-------------|
| `resourceTypeFilter` | `resourceTypeFilter` / `--resource-type` | string[] | `sprite`, `animationclip`, `resource_pack`, `bgm`, `voice`, `effect`, `avataritem` |
| `categoryFilter` | `categoryFilter` / `--category` | string[] | `mob`, `npc`, `map`, `item`, `effect`, `skill`, `object`, `background`, `foothold`, `ladder`, `rope`, `etc` (or avatar slot) |
| `limit` | `limit` / `--limit` | int (1–100) | Page size (server default 50 / **this skill's recommended default 3**) |
| `offset` | `offset` / `--offset` | **string** | Opaque cursor returned in `nextOffset`. **Omit on the first page** — sending `0` would be treated as a cursor and return empty. |
| `canonicalOnly` | `canonicalOnly` / `--canonical-only` | bool | Server default `true` |
| `widthMin` / `widthMax` / `heightMin` / `heightMax` | `widthMin/Max`, `heightMin/Max` | int | Sprite/animationclip size filter |
| `lengthMin` / `lengthMax` | `lengthMin/Max` | float | Sound length filter (seconds) |

> **Earlier wrapper used `type` / `category` (singular, string) and
> `offset=0` (int).** Both are wrong: the server expects array filters
> named `resourceTypeFilter` / `categoryFilter`, and `offset` is an
> opaque string cursor (`null` for the first page).

### Response

```json
{
  "items": [
    {
      "id": "RUID",
      "type": "sprite",
      "category": "mob",
      "names": {"ko": ["초록버섯"], "en": ["Green Mushroom"]},
      "payload": {
        "width": 64,
        "height": 64,
        "thumbnail": "https://..."
      }
    }
  ],
  "nextOffset": "0008f952-65b8-56bc-9023-98f3eeb28730",
  "total": null
}
```

`nextOffset` is the cursor for the next page (pass it back in `offset`).
Reaches `null` at the end.

---

## GET /v3/resources/random

Random resource recommendation — useful for inspiration or when you just
need a sample.

### Usage

```bash
# CLI — 3 random monster sprites
node ../../msw_resource_api.cjs \
    random --resource-type sprite --category mob --count 3

# 3 random voice clips
node ../../msw_resource_api.cjs \
    random --resource-type voice --count 3

# Fully random with no filters (always specify count explicitly — default 3)
node ../../msw_resource_api.cjs \
    random --count 3
```

```js
// Node.js
const { randomResources } = require('../../msw_resource_api.cjs');

const result = await randomResources({
  resourceTypeFilter: ["sprite"],
  categoryFilter: ["mob"],
  count: 3,
});
```

| Query param (server) | Wrapper arg / CLI flag | Type | Description |
|----------------------|------------------------|------|-------------|
| `resourceTypeFilter` | `resourceTypeFilter` / `--resource-type` | string[] | Resource type filter |
| `categoryFilter` | `categoryFilter` / `--category` | string[] | Category filter |
| `count` | `count` / `--count` | int (1–100) | Number of results (server default 20 / **this skill's recommended default 3**) |
| `canonicalOnly` | `canonicalOnly` / `--canonical-only` | bool | Server default `true` |
| `widthMin/Max`, `heightMin/Max`, `lengthMin/Max` | wrapper option keys | int / float | Same shape as `listResources` |

> **Earlier wrapper sent `limit` / `type` / `category`** — the server's
> parameters are `count` / `resourceTypeFilter` / `categoryFilter`.

### Response

Same shape as the listing endpoint (`items` + `nextOffset` + `total`).

---

## GET /v3/resources/packs/{ruid}

List resource packs **that contain the given RUID**. The path parameter
is a 32-char-hex RUID, **NOT a pack id**.

> **Looking up a pack's own contents?** Use `getResource(packId)`
> (i.e. `GET /v3/resources/{packId}`) instead — that endpoint returns
> the pack with each `payload.elements[*]` already populated.

### Usage

```bash
# CLI — find packs that include this animationclip RUID
node ../../msw_resource_api.cjs \
    packs e5fff311269b464984a9b7885a6401e7 --limit 3
```

```js
// Node.js
const { findPacksContaining } = require('../../msw_resource_api.cjs');

const packs = await findPacksContaining("e5fff311269b464984a9b7885a6401e7", { limit: 3 });
```

| Param (server) | Wrapper arg / CLI flag | Type | Description |
|----------------|------------------------|------|-------------|
| `id` (path) | `ruid` (positional) | string | 32-char-hex RUID to search for |
| `limit` | `limit` / `--limit` | int (1–100) | Page size (server default 50 / **this skill's default 3**) |
| `offset` | `offset` / `--offset` | string | Opaque cursor (`nextOffset` from previous page) |

### Response

```json
{
  "items": [
    {
      "id": "npc/9072309.img",
      "type": "resource_pack",
      "category": "npc",
      "names": {"ko": ["주황버섯"]},
      "assetGuid": "304aba4bea874f948a7548c0d8e393f5",
      "payload": {
        "elements": [
          {
            "resource_type": "animationclip",
            "ruid": "0a4cee60c89a42bea0d52fd8df00f17c",
            "rel_path": "move"
          },
          {
            "resource_type": "animationclip",
            "ruid": "e5fff311269b464984a9b7885a6401e7",
            "rel_path": "stand"
          }
        ]
      }
    }
  ]
}
```

### Pack contents (use `getResource` instead)

To fetch a pack's full contents — same `elements` array but with each
element's payload also filled in — call `getResource(packId)`:

```js
const { getResource } = require('../../msw_resource_api.cjs');

const pack = await getResource("npc/1013617.img");
for (const element of pack.payload.elements) {
  // element has resource_type, ruid, rel_path, and payload (width/height/thumbnail/...)
}
```

A resource pack usually consists of multiple animations (stand, walk,
attack, etc.), sounds, and per-frame sprites. The RUID of an individual
element can be used directly in fields like
`SpriteRendererComponent.SpriteRUID`.
