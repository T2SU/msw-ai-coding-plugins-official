---
name: msw-painter
description: "When msw-search cannot find a suitable sprite RUID, draw a pixel art sprite directly with SVG / HTML5 Canvas / HTML code, render it to PNG, and upload it via msw-mcp `asset_create_resource_storage_item` to obtain a sprite RUID. Triggers: draw sprite directly, create sprite, image generation, custom graphic, pixel art, painter, draw a sprite, make an icon, create NPC image directly, draw a slime, custom sprite."
---

# MSW Painter

A workflow for registering a hand-drawn pixel art sprite as a sprite resource. **Call `msw-search` first, and only invoke this skill when no suitable RUID is found.**

This skill is dedicated to the sprite category. It does not handle animation / audio / avatar / atlas.

---

## When to invoke

| Situation | Action |
|-----------|--------|
| User wants a specific sprite | First use `msw-search` (Resource search section, sprite category) |
| `msw-search` returns an RUID that matches the intent | Use that RUID directly. **Do not invoke painter.** |
| No search results, or all results are unsuitable | Invoke painter → create directly |
| User explicitly says "I need a hand-drawn looking character/icon" | Invoke painter directly |

---

## Workflow

1. **Choose the medium** — One of SVG / Canvas / HTML. See "Choosing the medium" below.
2. **Decide the size** — See [references/size-guide.md](references/size-guide.md). Default is 128×128.
3. **Write the code** — Follow the pixel art rules. Full rules in [references/pixel-art-rules.md](references/pixel-art-rules.md).
4. **Render to PNG** — Run `scripts/render.cjs`.
5. **Upload the resource** — `mcp__msw-mcp__asset_create_resource_storage_item` two-step pattern.
6. **Report the result** — RUID + a 1–2 sentence description. Entity placement / script application is outside the painter's scope.

---

## 1. Choosing the medium

| Medium | Recommended use | Strengths |
|--------|-----------------|-----------|
| **SVG** | Icons, logos, simple characters, shape-based pixel art | Intuitive code, easy to drop 1px `<rect>` dots |
| **Canvas** | Procedural patterns, iterative logic (loop-drawn textures / noise) | Generate complex patterns via JS programming logic |
| **HTML** | Composite layouts that can be styled quickly with CSS | Rarely used — SVG/Canvas is usually a better fit for pixel art |

### Minimal SVG template

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="128" height="128"
     style="image-rendering: pixelated;">
  <rect x="6" y="2" width="1" height="1" fill="#4A90D9"/>
  <!-- Place dots one by one with 1px rects -->
</svg>
```

### Minimal Canvas template

```javascript
// `c` (canvas element) and `ctx` (2D context) are auto-exposed by render.cjs.
// ctx.imageSmoothingEnabled = false is applied automatically as well.
const scale = 8;  // Map a 16×16 grid onto a 128×128 canvas
ctx.fillStyle = '#4A90D9';
ctx.fillRect(6 * scale, 2 * scale, scale, scale);
```

### Minimal HTML template

```html
<!doctype html>
<html><body style="margin:0; image-rendering: pixelated;">
  <!-- Anything you like -->
</body></html>
```

---

## 2. Size guide (summary)

| Use | Recommended size |
|-----|------------------|
| Icon / button | 48×48 ~ 64×64 |
| Character / item / NPC / monster | 96×96 ~ 128×128 |
| Tile / floor / block | 64×64 ~ 128×128 |
| Background / large object | 256×256 or larger (only on explicit request) |

The default is **128×128**. For detailed tables / aspect ratio guidelines, see [references/size-guide.md](references/size-guide.md).

---

## 3. Pixel art rules (summary)

- Antialiasing OFF, restricted palette, grid alignment, small logical grid (16×16, 32×32) → scaled up to a larger output.
- No curve APIs (`arc`, `bezierCurveTo`), no gradients, no blur/shadow filters, no fractional coordinates.
- Shade with stepped colors (2–4 levels), not gradients.

Full rules in [references/pixel-art-rules.md](references/pixel-art-rules.md).

---

## 4. PNG render — `render.cjs`

### One-time dependency install

```bash
cd scripts && npm install
```

This installs `puppeteer` (~200MB including headless Chromium). It is separate from other base skill dependencies, so run this only the first time you use painter.

### Invocation

```bash
node scripts/render.cjs --type <svg|canvas|html> --in <code-file> --out <out.png> --width <W> --height <H>
```

Or pass the code via stdin:

```bash
echo "<svg ...>" | node scripts/render.cjs --type svg --out out.png --width 128 --height 128
```

Options:
- `--type`: One of `svg` / `canvas` / `html`. **Required**.
- `--in`: Path to the code file. Omit or use `-` for stdin.
- `--out`: Output PNG path. **Required**.
- `--width` / `--height`: Output pixel size. Default 128.

On success, the absolute path of the output PNG is printed to stdout on a single line and exit code is 0. On failure, the error is printed to stderr and exit code is 1.

The PNG defaults to a transparent background. If you need a background color, draw it explicitly inside the SVG/Canvas/HTML.

---

## 5. Resource upload — two-step pattern

`mcp__msw-mcp__asset_create_resource_storage_item` is called twice.

### Step 1 — request a presigned URL

```
mcp__msw-mcp__asset_create_resource_storage_item({
  category: "sprite",
  subcategory: "<appropriate subcategory>",   // e.g. "monster", "npc", "object", "icon"
  name: "<resource name>",
  description: "<1–2 sentence description>",
  makerOwnerType: 0,                          // 0 = Account
  makerOwnerId: "<account id>",               // look up in advance with mcp__msw-mcp__account_get_my_user_id
  // omit fileUrl in this step
})
```

The response contains a `presignedUrl`.

### Step 2 — PUT the PNG binary

PowerShell:
```powershell
Invoke-WebRequest -Method PUT -InFile out.png -Uri "<presignedUrl>" -ContentType "image/png"
```

bash (Git for Windows / WSL):
```bash
curl -X PUT -T out.png "<presignedUrl>"
```

The PUT itself is a plain binary upload — no auth headers are needed (the signature is embedded in the presigned URL).

### Step 3 — report upload completion

```
mcp__msw-mcp__asset_create_resource_storage_item({
  ...same arguments,
  fileUrl: "<presignedUrl received in step 1>"
})
```

The response contains the sprite **RUID**. That is the final deliverable.

### Choosing a subcategory

First inspect the subcategory distribution of existing sprites with `asset_search_resources` or `asset_list_account_resources` and match it. When in doubt, fall back to a generic value such as `object` / `etc`.

---

## 6. Report format

When the painter task is done, hand the user only this:

```
RUID: <received RUID>
<1–2 sentence description: what you drew, at what size, and what sprite it was registered as>
```

Entity creation/movement/spawn, script authoring, and UI editing are outside the painter's scope. Handle those in another skill or a follow-up step.

---

## Common pitfalls

- **Not running `npm install` before `render.cjs`** → `Cannot find module 'puppeteer'`. Only needed the first time.
- **Omitting `--width` / `--height`** → It falls back to 128×128, and if the user wanted a different size you have to redraw. Always specify it.
- **Background comes out black** → You drew a background inside the SVG/Canvas/HTML. To keep it transparent, remove the background shape itself.
- **Curves look smooth** → Pixel art rule violation. Remove `arc()`/`bezierCurveTo()`/gradients and redraw with dots.
- **PUT step fails with 401/403** → The presigned URL expired or is wrong. Restart from step 1.
- **Changing other metadata in the step-2 completion call** → Pass the exact same `category`/`subcategory`/`name`/`description`/`makerOwnerType`/`makerOwnerId` as in step 1. Only add `fileUrl`.
