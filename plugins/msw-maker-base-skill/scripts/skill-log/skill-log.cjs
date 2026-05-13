#!/usr/bin/env node
'use strict';

// MSW Skill Log Hook
// Claude Code 가 스킬을 읽거나(`Read` on SKILL.md / references), 호출하거나(`Skill` tool),
// CLAUDE.md / .claude/rules/*.md 가 컨텍스트에 로드될 때(`InstructionsLoaded`)
// 한 줄짜리 사람이 읽기 쉬운 로그를 working dir 의 `.claude/skill.log` 에 append 한다.
//
// 플러그인 hooks/hooks.json 으로 자동 등록 — 수동 설정 불필요.
// 비-스킬 이벤트는 무시하고 즉시 종료한다.

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

function toPosix(p) {
  return typeof p === 'string' ? p.replace(/\\/g, '/') : '';
}

function parseSkillFromPath(filePath) {
  const norm = toPosix(filePath);
  const m = norm.match(/\/skills\/([^/]+)(\/.*)?$/);
  if (!m) return null;
  return { name: m[1], rest: m[2] || '' };
}

function relPath(cwd, filePath) {
  try {
    const r = path.relative(cwd, filePath);
    return r ? toPosix(r) : toPosix(filePath);
  } catch (_) {
    return toPosix(filePath);
  }
}

function formatLocalISO(date) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  // getTimezoneOffset() 은 UTC - local 분 단위. 부호 반전 후 ±HH:MM 으로 포맷.
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMin);
  const offH = pad(Math.floor(absOffset / 60));
  const offM = pad(absOffset % 60);
  return `${y}-${M}-${d}T${h}:${m}:${s}.${ms}${sign}${offH}:${offM}`;
}

function measureText(text) {
  if (typeof text !== 'string' || text.length === 0) return { lines: '', bytes: '' };
  return {
    lines: text.split('\n').length,
    bytes: Buffer.byteLength(text, 'utf8'),
  };
}

function extractResponseText(toolResponse) {
  if (typeof toolResponse === 'string') return toolResponse;
  if (toolResponse && typeof toolResponse === 'object') {
    if (typeof toolResponse.content === 'string') return toolResponse.content;
    if (typeof toolResponse.text === 'string') return toolResponse.text;
    if (toolResponse.file && typeof toolResponse.file.content === 'string') return toolResponse.file.content;
    if (Array.isArray(toolResponse.content)) {
      return toolResponse.content
        .map((c) => (c && typeof c.text === 'string' ? c.text : ''))
        .join('');
    }
  }
  return '';
}

function formatLine(parts) {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== '')
    .join(' | ');
}

function buildLine(input) {
  const eventName = input.hook_event_name;
  const sessionId = String(input.session_id || '').slice(0, 8);
  const ts = formatLocalISO(new Date());
  const cwd = input.cwd || process.cwd();

  if (eventName === 'PostToolUse') {
    const toolName = input.tool_name;
    const toolInput = input.tool_input || {};
    const toolResponse = input.tool_response;
    const durationMs = input.duration_ms;

    if (toolName === 'Read') {
      const filePath = toolInput.file_path || '';
      if (!/\.md$/i.test(filePath)) return null;
      const skill = parseSkillFromPath(filePath);
      if (!skill) return null;

      const offset = toolInput.offset;
      const limit = toolInput.limit;
      const isPartial =
        (offset !== undefined && offset !== null) || (limit !== undefined && limit !== null);
      const mode = isPartial ? 'partial' : 'full';
      const fileKind = /\/SKILL\.md$/i.test(toPosix(filePath)) ? 'SKILL.md' : 'reference';
      const { lines, bytes } = measureText(extractResponseText(toolResponse));

      return formatLine([
        ts,
        `session=${sessionId}`,
        `event=${eventName}`,
        `tool=Read`,
        `skill=${skill.name}`,
        `kind=${fileKind}`,
        `file=${relPath(cwd, filePath)}`,
        `mode=${mode}`,
        isPartial && offset !== undefined && offset !== null ? `offset=${offset}` : '',
        isPartial && limit !== undefined && limit !== null ? `limit=${limit}` : '',
        lines !== '' ? `lines=${lines}` : '',
        bytes !== '' ? `bytes=${bytes}` : '',
        durationMs !== undefined && durationMs !== null ? `duration_ms=${durationMs}` : '',
      ]);
    }

    if (toolName === 'Skill') {
      const skillName =
        toolInput.name ||
        toolInput.skill ||
        toolInput.skill_name ||
        toolInput.skillName ||
        toolInput.command ||
        '';
      const { lines, bytes } = measureText(extractResponseText(toolResponse));

      return formatLine([
        ts,
        `session=${sessionId}`,
        `event=${eventName}`,
        `tool=Skill`,
        `skill=${skillName}`,
        `mode=invoke`,
        lines !== '' ? `lines=${lines}` : '',
        bytes !== '' ? `bytes=${bytes}` : '',
        durationMs !== undefined && durationMs !== null ? `duration_ms=${durationMs}` : '',
      ]);
    }

    return null;
  }

  if (eventName === 'InstructionsLoaded') {
    const filePath = input.file_path || '';
    const memoryType = input.memory_type || '';
    const loadReason = input.load_reason || '';

    let lines = '';
    let bytes = '';
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const m = measureText(content);
      lines = m.lines;
      bytes = m.bytes;
    } catch (_) {}

    return formatLine([
      ts,
      `session=${sessionId}`,
      `event=${eventName}`,
      `memory=${memoryType}`,
      `reason=${loadReason}`,
      `file=${relPath(cwd, filePath)}`,
      `mode=full`,
      lines !== '' ? `lines=${lines}` : '',
      bytes !== '' ? `bytes=${bytes}` : '',
    ]);
  }

  return null;
}

function main() {
  const input = readInput();
  const cwd = input.cwd || process.cwd();

  let line;
  try {
    line = buildLine(input);
  } catch (_) {
    return;
  }
  if (!line) return;

  try {
    const logDir = path.join(cwd, '.claude');
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'skill.log');
    fs.appendFileSync(logFile, line + '\n', 'utf8');
  } catch (_) {
    // 로깅 실패는 모델 흐름에 영향 주지 않도록 조용히 무시.
  }
}

main();
process.exit(0);
