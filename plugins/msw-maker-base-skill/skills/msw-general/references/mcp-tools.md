# MSW MCP Tools (msw-maker-mcp)

All Maker interactions go through the tools provided by the **msw-maker-mcp** MCP server.

> **If an MCP tool call fails, or the user asks for "setup", "MCP connection", or "API Key"**, refer to the `msw-env-setup` skill to create `.mcp.json` and configure the API Key.

---

## Tool List

| MCP Tool | Description |
|----------|-------------|
| **play** | Enter play mode |
| **stop** | Exit play mode |
| **screenshot** | Capture a screenshot of the current viewport |
| **refresh** | Refresh Maker state and sync visuals |
| **logs** | Read logs (filter by runtime / build category) |
| **clear_logs** | Clear all logs |
| **keyboard_input** | Simulate keyboard input (down/up/press/wait actions) |
| **mouse_input** | Simulate mouse input (move/click/scroll, etc.) |

---

## play

Enter play mode. Can only be called from edit mode.

**Note**: After entering play mode, edit operations (entity create / modify, refresh, etc.) are blocked.

## stop

Exit play mode and return to edit mode.

## screenshot

Capture a screenshot of the current Maker viewport.

**Usage limits (important):**
- Call **only when the user explicitly requests it**, e.g., **"take a screenshot"**, **"check it"**, **"show me"**.
- Do not auto-screenshot after a task completes.
- For questions about screen content, take a screenshot and have the AI analyze the image directly.

## refresh

Refresh Maker state and synchronize all visual elements.

**Mandatory call timing**: **Always call after any change to the workspace** — file create / modify / delete, `.model` edit, `.mlua` authoring, etc.

**Constraint**: Not available during play mode.

## logs

Read logs. Can filter runtime logs or build logs by category.

**Use for:**
- Checking script errors
- Runtime debugging
- Diagnosing build errors

## clear_logs

Clear all logs (runtime + build).

## keyboard_input

Simulate a keyboard input sequence. Combine down/up/press/wait actions.

**Use for:**
- Testing character control in play mode
- Triggering shortcuts

## mouse_input

Simulate a mouse input sequence. Supports move/click/scroll and similar actions.

**Use for:**
- Testing click/drag in play mode
- Testing UI interactions

---

## Constraints

- `screenshot` is asynchronous and the response wait can be long.
- `refresh` is unavailable during play mode.
- Call `screenshot` only when the user explicitly requests it. Do not call it automatically.
- After editing a file directly, always call `refresh` to push the change into Maker.
- `save_workspace`, `backup_workspace`, `restore_workspace`, `undo`, `redo` and similar operations are not provided by MCP. If needed, instruct the user to perform them directly in the Maker editor.

---

## Initial Setup

**Two MCP servers must be configured:**

- **`msw-maker-mcp`** — local Maker application binary. Provides `play`, `stop`, `refresh`, `screenshot`, `logs`, `keyboard_input`, `mouse_input`. Requires the Maker app to be running.
- **`msw-mcp`** — HTTP MCP server. Provides API search and resource search tools. Requires a Bearer token.

### Setting the API token for `msw-mcp`

1. Issue a token at: **https://maplestoryworlds-insight.nexon.com/credentials/api-keys**
2. Set the token as `Authorization: Bearer <your-token>` in the `msw-mcp` server config.
3. Reload the agent after saving.

---

## Troubleshooting

### Codex: MCP connected but tools not visible

**Fully restart Codex.** Reconnecting or reloading config alone does not re-register the tools.
