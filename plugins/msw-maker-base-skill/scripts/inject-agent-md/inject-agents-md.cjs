#!/usr/bin/env node
'use strict';

// inject-agents-md.cjs
// 세션 첫 실행 시 플러그인의 AGENTS.md를 프로젝트 루트에 복사하고
// CLAUDE.md에 @AGENTS.md import를 추가한다.
//
// - 이미 복사되어 있으면 스킵 (내용 비교)
// - CLAUDE.md에 이미 @AGENTS.md가 있으면 스킵
//
// 플러그인 hooks/hooks.json 으로 자동 등록 — 수동 설정 불필요.

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

// 플러그인에 AGENTS.md가 없으면 종료
if (!fs.existsSync(SRC)) {
  process.exit(0);
}

// 1. AGENTS.md 복사 (내용이 다를 때만)
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
  // 파일 I/O 실패는 훅을 차단하지 않는다.
}

// 2. CLAUDE.md에 @AGENTS.md import 추가
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
  // 동일하게 무시.
}
