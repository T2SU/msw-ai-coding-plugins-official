#!/usr/bin/env node
'use strict';

// MSW Core Version Check Hook
// 세션당 1회만 실행: 락 파일로 중복 실행 방지.
// Environment/config 의 CoreVersion 과 플러그인 지원 버전을 비교한다.
//
// 플러그인 hooks/hooks.json 으로 자동 등록 — 수동 설정 불필요.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SUPPORTED_VERSION = '26.5.0.0';
const CONFIG_FILE = 'Environment/config';

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

const input = readInput();
const cwd = input.cwd || process.cwd();

const lockId = crypto.createHash('sha1').update(cwd).digest('hex').slice(0, 16);
const lockPath = path.join(os.tmpdir(), `.msw-corecheck-${lockId}`);

if (fs.existsSync(lockPath)) {
  process.exit(0);
}

const configPath = path.join(cwd, CONFIG_FILE);
if (!fs.existsSync(configPath)) {
  process.exit(0);
}

let configText;
try {
  configText = fs.readFileSync(configPath, 'utf8');
} catch (_) {
  process.exit(0);
}

const match = configText.match(/"CoreVersion"\s*:\s*"([^"]+)"/);
if (!match) {
  process.exit(0);
}
const coreVersion = match[1];

try {
  fs.writeFileSync(lockPath, '');
} catch (_) {
  // 락 생성 실패해도 본 체크는 계속 진행
}

if (coreVersion === SUPPORTED_VERSION) {
  process.exit(0);
}

process.stdout.write(
  `<core-version-mismatch>\n` +
  `MSW Core Version 불일치. 워크스페이스: ${coreVersion} / 플러그인: ${SUPPORTED_VERSION}\n` +
  `사용자에게 아래 내용을 안내하고, MSW 개발 작업(코드 작성, 파일 수정 등)을 절대 진행하지 마라.\n` +
  `- 워크스페이스가 더 높으면 → msw-ai-coding-plugins-official 플러그인을 최신 버전으로 업데이트\n` +
  `- 워크스페이스가 더 낮으면 → MSW 클라이언트를 최신 버전으로 업데이트\n` +
  `</core-version-mismatch>\n`
);
