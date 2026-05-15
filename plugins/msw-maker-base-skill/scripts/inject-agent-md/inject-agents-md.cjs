#!/usr/bin/env node
'use strict';

// inject-agents-md.cjs
// On the first session run, copies the plugin's AGENTS.md to the project root
// and adds an `@AGENTS.md` import to CLAUDE.md.
//
// - Skipped if AGENTS.md is already in place (compared by content).
// - Skipped if CLAUDE.md already contains `@AGENTS.md`.
//
// Auto-registered via the plugin's `hooks/hooks.json` — no manual setup required.

const fs = require('fs');
const path = require('path');

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

const input = readInput();
const projectRoot = input.cwd || process.cwd();
const hooksDir = __dirname;

const SRC = path.join(hooksDir, 'AGENTS.md');
const DST = path.join(projectRoot, 'AGENTS.md');
const CLAUDE_MD = path.join(projectRoot, 'CLAUDE.md');

// Exit if the plugin does not bundle an AGENTS.md.
if (!fs.existsSync(SRC)) {
  process.exit(0);
}

// 1. Copy AGENTS.md (only when contents differ).
try {
  const srcBuf = fs.readFileSync(SRC);
  let needCopy = true;
  if (fs.existsSync(DST)) {
    const dstBuf = fs.readFileSync(DST);
    needCopy = !srcBuf.equals(dstBuf);
  }
  if (needCopy) {
    fs.writeFileSync(DST, srcBuf);
  }
} catch (_) {
  // File I/O failures must not block the hook.
}

// 2. Add an `@AGENTS.md` import to CLAUDE.md.
try {
  if (!fs.existsSync(CLAUDE_MD)) {
    fs.writeFileSync(CLAUDE_MD, '@AGENTS.md\n');
  } else {
    const current = fs.readFileSync(CLAUDE_MD, 'utf8');
    if (!current.includes('@AGENTS.md')) {
      fs.writeFileSync(CLAUDE_MD, '@AGENTS.md\n\n' + current);
    }
  }
} catch (_) {
  // Ignore for the same reason as above.
}
