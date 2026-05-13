#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function findProjectRoot(startPath) {
  let current = path.resolve(startPath || process.cwd());
  try {
    if (!fs.statSync(current).isDirectory()) current = path.dirname(current);
  } catch (_) {}

  while (true) {
    if (path.basename(current) === 'RootDesk') return path.dirname(current);
    try {
      if (fs.statSync(path.join(current, 'RootDesk')).isDirectory()) return current;
    } catch (_) {}

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function splitArgs(raw) {
  return String(raw || '').trim().split(/\s+/).filter(Boolean);
}

const input = readInput();
const projectRoot = process.env.MLUA_LSP_PROJECT_ROOT || findProjectRoot(input.cwd);

if (!projectRoot) process.exit(0);

const cmd = process.env.MLUA_LSP_CMD || 'mlua-lsp';
const args = splitArgs(process.env.MLUA_LSP_ARGS).concat(['start', projectRoot]);
const timeout = Number.parseInt(process.env.MLUA_LSP_HOOK_START_TIMEOUT_MS || '120000', 10);

const result = spawnSync(cmd, args, {
  encoding: 'utf8',
  timeout: Number.isFinite(timeout) ? timeout : 120000,
  windowsHide: true,
  shell: process.platform === 'win32',
});

if (result.error || result.status !== 0) {
  const message = result.error?.message || result.stderr || `exit ${result.status}`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `mLua LSP daemon start failed: ${String(message).trim()}`,
    },
  }));
}
