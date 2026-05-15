# Image size guide

Most entities in a Maker workspace are based on small sprites. **Always specify an appropriate size** so the size ratio matches surrounding entities.

## Recommended size table

| Use | Recommended size | Examples |
|-----|------------------|----------|
| Icon, small object, button icon | `48×48` ~ `64×64` | Heart, coin, arrow, star |
| General character, item, NPC, monster | `96×96` ~ `128×128` | Slime, sword, shield, tree |
| Tile, floor, block | `64×64` ~ `128×128` | Grass tile, brick, platform |
| Background, large object | `256×256` or larger | **Only when the user explicitly requests a large size** |

## Rules

- **The default 512×512 is too large** — always specify `--width` / `--height`.
- Use **128×128** as the default when there is no special requirement.
- Transparent background (PNG alpha) is the default — if you do not draw a background in the SVG/Canvas/HTML, the output is automatically transparent.

## Aspect ratio guide

- Square (`width === height`) is the default. Characters / icons are almost always square.
- Horizontally elongated objects (vehicles, bridges) use `2:1` (e.g. 192×96).
- Vertically elongated objects (trees, flags) use `1:2` (e.g. 96×192).
- Avoid irregular ratios when possible — they can affect collider / hit-box alignment of the entity.

## Pixel art working grid

The standard pixel art workflow is to scale up from a **small logical grid → a large output canvas**.

| Output size | Recommended logical grid | Pixels per dot |
|-------------|--------------------------|----------------|
| 48×48 | 16×16 | 3 |
| 64×64 | 16×16 | 4 |
| 96×96 | 24×24 or 16×16 | 4 or 6 |
| 128×128 | 16×16 or 32×32 | 8 or 4 |
| 256×256 | 32×32 or 64×64 | 8 or 4 |

A smaller logical grid means chunkier, more classic-looking dots; a larger one allows more detail but increases the workload.
