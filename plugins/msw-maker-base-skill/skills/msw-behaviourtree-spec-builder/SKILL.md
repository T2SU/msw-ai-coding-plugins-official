---
name: msw-behaviourtree-spec-builder
description: "Generates or refreshes the project's BehaviourTree authoring spec (`.behaviourDocs/bt-spec.md`) by scanning every `.codeblock` whose paired `.mlua` extends `ActionNode`/`DecoratorNode`, parsing property declarations, and emitting a markdown catalog of UUIDs, btNodeType values, propertyKey/type tables, Blackboard type strings, and authoring rules. Run this once per project and re-run whenever BT codeblocks/properties change. Triggers: 'build BT spec', 'refresh bt-spec', 'generate behaviourtree catalog', 'BT 스펙 생성', 'bt-spec.md 만들어', 'rescan BT nodes'."
---

# MSW BehaviourTree Spec Builder

Runs `scripts/build-spec.cjs` (Node.js) to (re)generate `<ProjectRoot>/.behaviourDocs/bt-spec.md` — the compact project-specific catalog the `msw-behaviourtree-creator` skill consumes when authoring `.behaviourtree` files.

## When to invoke

- First time working on BT in a project (no `.behaviourDocs/bt-spec.md` yet).
- After **any** change that affects BT node surface area:
  - new/renamed/removed `.codeblock` whose `.mlua` extends `ActionNode` / `DecoratorNode`
  - added/removed/renamed `property` lines in such a `.mlua`
  - `Environment/config` `CoreVersion` bumped (the type strings are version-tagged).
- The creator skill reports the spec is missing or stale.

## How to run

Invoke this skill's local script from any agent runtime:

```bash
node "<path-to-msw-behaviourtree-spec-builder>/scripts/build-spec.cjs" --projectRoot "<MSW project root>"
```

If the current working directory is already the MSW project root, `--projectRoot` can be omitted. Requires Node.js on `PATH` (no other dependencies — pure stdlib `fs`/`path`).

Optional overrides (pass as long flags, case-insensitive):

| Flag | Default | Notes |
|------|---------|-------|
| `--projectRoot` | current working directory | MSW project root to scan |
| `--outputPath` | `<ProjectRoot>/.behaviourDocs/bt-spec.md` | folder is created if missing |
| `--coreVersion` | read from `<ProjectRoot>/Environment/config` (`CoreVersion` field) | required if the config is missing |

Example with overrides:

```bash
node "<path-to-msw-behaviourtree-spec-builder>/scripts/build-spec.cjs" --projectRoot "C:/path/to/project" --coreVersion 26.5.0.0
```

The script throws if `Environment/config` is absent and `--coreVersion` is not passed — there is no fallback default.

## What the spec contains

The generated file intentionally contains only data that changes per project:

1. Project metadata — project root, `CoreVersion`, generated time, discovered node counts.
2. Built-in composite node names and their fixed `definitionId` / `btNodeType`.
3. Custom action nodes — `Name`, `definitionId`, `btNodeType`, visible property names.
4. Custom decorator nodes — same shape as action nodes.
5. Type map — mlua type to serialized `MODNativeType.type` plus Blackboard `ObjectValue` shape.

Fixed authoring rules, file skeletons, and validation checklists live in the `msw-behaviourtree-creator` skill references rather than in this generated spec. UUIDs come from real `.codeblock` files in the project — the spec never invents them. `@HideFromInspector` properties are filtered out automatically.

## After running

Tell the user the file was written, then suggest invoking `msw-behaviourtree-creator` for the actual tree authoring.
