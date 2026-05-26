#!/usr/bin/env node
'use strict';

// MSW structured file guard hook (PreToolUse).
// Direct .model/.ui reads and writes are blocked; use the matching builder.

const fs = require('fs');

if (
  process.env.MSW_STRUCTURED_FILE_GUARD_DISABLE === '1' ||
  process.env.MSW_MODEL_FILE_GUARD_DISABLE === '1'
) {
  process.exit(0);
}

const POLICIES = [
  {
    ext: '.model',
    directReason:
      '.model files are builder-only. First read skills/msw-general/references/model.md (domain rules) and skills/msw-general/references/builder-protocol.md §2 (call protocol) in full, then use skills/msw-general/scripts/model/msw_model_builder.cjs (ModelBuilder.read/snapshot/fromTemplate/write), not direct Read/Edit/Write/MultiEdit.',
    bashReason:
      '.model files are builder-only. Do not read/edit/copy/delete them through shell commands. First read skills/msw-general/references/model.md (domain rules) and skills/msw-general/references/builder-protocol.md §2 (call protocol) in full, then use msw-general ModelBuilder; node commands that call the builder are allowed.',
  },
  {
    ext: '.ui',
    directReason:
      '.ui files are builder-only. First load the msw-ui-system skill and read skills/msw-general/references/builder-protocol.md §3 (call protocol) in full, then use skills/msw-ui-system/scripts/msw_ui_builder.cjs (UIBuilder.read/load/find/list_entities/write), not direct Read/Edit/Write/MultiEdit.',
    bashReason:
      '.ui files are builder-only. Do not read/edit/copy/delete them through shell commands. First load the msw-ui-system skill and read skills/msw-general/references/builder-protocol.md §3 (call protocol) in full, then use msw-ui-system UIBuilder; node commands that call the builder are allowed.',
  },
];

const CONTENT_TOOL_RE =
  /(^|[\s|;&(`])(cat|type|more|less|head|tail|Get-Content|gc|grep|rg|egrep|fgrep|findstr|Select-String|sls|awk|sed|vim|vi|nvim|nano|emacs|code|notepad|Set-Content|Add-Content|Out-File|tee|cp|copy|Copy-Item|mv|move|Move-Item|rm|del|erase|Remove-Item|touch|New-Item|xxd|od|strings)([\s|;&)`]|$)/i;

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function pathHasExtension(value, ext) {
  const escaped = ext.replace('.', '\\.');
  return new RegExp(`(^|/)[^/]+${escaped}$`, 'i').test(normalizePath(value));
}

function commandMentionsExtension(command, ext) {
  const escaped = ext.replace('.', '\\.');
  return new RegExp(`${escaped}\\b`, 'i').test(command);
}

function matchingPathPolicy(value) {
  return POLICIES.find((policy) => pathHasExtension(value, policy.ext));
}

function matchingCommandPolicy(command) {
  return POLICIES.find((policy) => commandMentionsExtension(command, policy.ext));
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

const input = readInput();
const toolName = input.tool_name || input.toolName || input.name || '';
const toolInput = input.tool_input || {};

if (/^(Read|Edit|Write|MultiEdit|NotebookEdit)$/.test(toolName)) {
  const filePath = toolInput.file_path || toolInput.path || toolInput.notebook_path || '';
  const policy = matchingPathPolicy(filePath);
  if (policy) {
    deny(policy.directReason);
  }
  process.exit(0);
}

if (toolName !== 'Bash') {
  process.exit(0);
}

const command = String(toolInput.command || '');
if (!command) {
  process.exit(0);
}

const policy = matchingCommandPolicy(command);
if (!policy || !CONTENT_TOOL_RE.test(command)) {
  process.exit(0);
}

deny(policy.bashReason);
