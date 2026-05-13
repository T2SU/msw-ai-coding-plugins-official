#!/usr/bin/env node
/**
 * MSW Resource Search API — Node.js (CommonJS) wrapper.
 *
 * Node.js 구현. MSW 리소스 검색 REST API의 모든 엔드포인트를
 * 함수와 CLI 서브커맨드 형태로 제공한다.
 *
 *   const api = require('./msw_resource_api');
 *   const hits = await api.searchResources('주황버섯', {
 *     resourceTypeFilter: ['resource_pack'],
 *     categoryFilter: ['npc'],
 *     topK: 3,
 *   });
 *   const detail = await api.getResource(hits.results[0].id);
 *
 * CLI:
 *   node msw_resource_api.cjs search "주황버섯" \
 *     --resource-type resource_pack --category npc --topK 3
 *   node msw_resource_api.cjs get 0017da7385e04bc4b2ddbe5949b4b462
 *   node msw_resource_api.cjs avatar-render \
 *     --ruids body_ruid head_ruid hat_ruid --actions stand1 walk1
 *
 * 설계 메모:
 *  - 외부 의존성 없음. Node 18+ 내장 `fetch`/`AbortController`만 사용.
 *  - 모든 POST 본문은 UTF-8 JSON으로 인코딩되어
 *    `Content-Type: application/json; charset=utf-8`로 전송됨.
 *    한국어/일본어/이모지 페이로드도 안전.
 *  - 리스트류 엔드포인트의 기본 페이지 크기는 3 (SKILL.md 규약).
 */

'use strict';

const BASE_URL = 'https://maplestoryworlds-resourcesearch-new.nexon.com';
const DEFAULT_TIMEOUT_MS = 15_000; // SKILL.md 권장 15s
const DEFAULT_LIMIT = 3;           // 스킬 규약 (서버 기본값은 5/10)

class MswApiError extends Error {
  constructor(status, url, body) {
    const snippet = typeof body === 'string' ? body.slice(0, 500) : String(body);
    super(`MSW API ${status} on ${url}: ${snippet}`);
    this.name = 'MswApiError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Low-level HTTP helper
// ---------------------------------------------------------------------------

/**
 * 쿼리 객체를 URLSearchParams 문자열로 직렬화.
 * - null/undefined 값은 제거.
 * - 배열/튜플은 동일 키로 반복(`types=a&types=b`).
 */
function _buildQuery(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue;
        params.append(key, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function _request(method, path, { query, body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const url = BASE_URL + path + _buildQuery(query);

  const headers = { Accept: 'application/json' };
  let payload;
  if (body !== undefined && body !== null) {
    payload = Buffer.from(JSON.stringify(body), 'utf8');
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err && err.name === 'AbortError'
      ? `timeout after ${timeout}ms`
      : (err && err.message) || String(err);
    throw new MswApiError(0, url, reason);
  }
  clearTimeout(timer);

  const text = await resp.text();
  if (!resp.ok) {
    throw new MswApiError(resp.status, url, text);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    return text;
  }
}

const _enc = (s) => encodeURIComponent(s);

// ---------------------------------------------------------------------------
// Section: Semantic Search — POST /v3/search/resources & similar
// ---------------------------------------------------------------------------

/**
 * 자연어 시맨틱 검색.
 * `POST /v3/search/resources` (SearchRequest 스키마).
 * sprite / animationclip / resource_pack / sound / avataritem 검색에 사용.
 * 아바타 코스튬은 `searchAvatarItems` 사용 권장 — 그쪽이
 * `resourceTypeFilter=["avataritem"]`을 자동으로 고정.
 *
 * 본문 키는 OpenAPI 스펙 그대로 (`topK`, `resourceTypeFilter`,
 * `categoryFilter` …). 과거 wrapper의 `limit` / `types` / `categories`는
 * 서버가 조용히 무시.
 *
 * @param {string} query
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
async function searchResources(query, opts = {}) {
  const {
    resourceTypeFilter,
    categoryFilter,
    topK = DEFAULT_LIMIT,
    offset = 0,
    canonicalOnly,
    widthMin, widthMax, heightMin, heightMax,
    lengthMin, lengthMax,
    compact = true,
  } = opts;
  const payload = { query, topK, offset };
  if (resourceTypeFilter !== undefined) payload.resourceTypeFilter = [...resourceTypeFilter];
  if (categoryFilter !== undefined) payload.categoryFilter = [...categoryFilter];
  if (canonicalOnly !== undefined && canonicalOnly !== null) payload.canonicalOnly = canonicalOnly;
  if (widthMin !== undefined && widthMin !== null) payload.widthMin = widthMin;
  if (widthMax !== undefined && widthMax !== null) payload.widthMax = widthMax;
  if (heightMin !== undefined && heightMin !== null) payload.heightMin = heightMin;
  if (heightMax !== undefined && heightMax !== null) payload.heightMax = heightMax;
  if (lengthMin !== undefined && lengthMin !== null) payload.lengthMin = lengthMin;
  if (lengthMax !== undefined && lengthMax !== null) payload.lengthMax = lengthMax;
  return _request('POST', '/v3/search/resources', {
    query: compact ? { compact: 'true' } : undefined,
    body: payload,
  });
}

/**
 * 아바타 코스튬 아이템 검색 (cap, coat, pants, shoes, weapon, …).
 * `POST /v3/search/resources` + `resourceTypeFilter=["avataritem"]`.
 */
async function searchAvatarItems(query, opts = {}) {
  const {
    topK = DEFAULT_LIMIT,
    offset = 0,
    categoryFilter,
    canonicalOnly,
    compact = true,
  } = opts;
  const payload = {
    query, topK, offset,
    resourceTypeFilter: ['avataritem'],
  };
  if (categoryFilter !== undefined) payload.categoryFilter = [...categoryFilter];
  if (canonicalOnly !== undefined && canonicalOnly !== null) payload.canonicalOnly = canonicalOnly;
  return _request('POST', '/v3/search/resources', {
    query: compact ? { compact: 'true' } : undefined,
    body: payload,
  });
}

/**
 * RUID와 유사한 리소스 검색.
 * `GET /v3/search/resources/similar/{id}`. 서버는 `topK` 사용
 * (default 20, max 100). 과거 wrapper의 `limit`은 무시됨.
 */
async function findSimilarResources(ruid, opts = {}) {
  const {
    topK = DEFAULT_LIMIT,
    resourceTypeFilter,
    categoryFilter,
    canonicalOnly,
    widthMin, widthMax, heightMin, heightMax,
    compact = true,
  } = opts;
  const query = { topK };
  if (resourceTypeFilter !== undefined) query.resourceTypeFilter = [...resourceTypeFilter];
  if (categoryFilter !== undefined) query.categoryFilter = [...categoryFilter];
  if (canonicalOnly !== undefined && canonicalOnly !== null) query.canonicalOnly = canonicalOnly ? 'true' : 'false';
  if (widthMin !== undefined && widthMin !== null) query.widthMin = widthMin;
  if (widthMax !== undefined && widthMax !== null) query.widthMax = widthMax;
  if (heightMin !== undefined && heightMin !== null) query.heightMin = heightMin;
  if (heightMax !== undefined && heightMax !== null) query.heightMax = heightMax;
  if (compact) query.compact = 'true';
  return _request('GET', `/v3/search/resources/similar/${_enc(ruid)}`, { query });
}

// ---------------------------------------------------------------------------
// Section: Resource Details & Tags
// ---------------------------------------------------------------------------

/** 단건 리소스 상세 조회. `GET /v3/resources/{ruid}`. */
async function getResource(ruid) {
  return _request('GET', `/v3/resources/${_enc(ruid)}`);
}

/** 다건 리소스 일괄 조회. `POST /v3/resources/batch`. */
async function getResourcesBatch(ids) {
  return _request('POST', '/v3/resources/batch', { body: { ids: [...ids] } });
}

/** AI 다국어 태그 조회. `GET /v3/resources/tags/{ruid}`. */
async function getResourceTags(ruid) {
  return _request('GET', `/v3/resources/tags/${_enc(ruid)}`);
}

// ---------------------------------------------------------------------------
// Section: Browsing — listings, random, and pack details
// ---------------------------------------------------------------------------

/**
 * Qdrant Scroll 기반 리소스 목록. `GET /v3/resources`.
 * `offset`은 직전 응답의 `nextOffset` 문자열 커서. 첫 페이지에서는 생략.
 * 과거 wrapper가 `offset=0`(int)을 보내 매칭이 0건이 되던 버그를 수정.
 *
 * 필터는 OpenAPI 정식 키인 `resourceTypeFilter` / `categoryFilter`로 전송.
 */
async function listResources(opts = {}) {
  const {
    resourceTypeFilter,
    categoryFilter,
    limit = DEFAULT_LIMIT,
    offset,
    canonicalOnly,
    widthMin, widthMax, heightMin, heightMax,
    lengthMin, lengthMax,
    compact = true,
  } = opts;
  const query = { limit };
  if (resourceTypeFilter !== undefined) query.resourceTypeFilter = [...resourceTypeFilter];
  if (categoryFilter !== undefined) query.categoryFilter = [...categoryFilter];
  if (offset !== undefined && offset !== null) query.offset = offset;
  if (canonicalOnly !== undefined && canonicalOnly !== null) query.canonicalOnly = canonicalOnly ? 'true' : 'false';
  if (widthMin !== undefined && widthMin !== null) query.widthMin = widthMin;
  if (widthMax !== undefined && widthMax !== null) query.widthMax = widthMax;
  if (heightMin !== undefined && heightMin !== null) query.heightMin = heightMin;
  if (heightMax !== undefined && heightMax !== null) query.heightMax = heightMax;
  if (lengthMin !== undefined && lengthMin !== null) query.lengthMin = lengthMin;
  if (lengthMax !== undefined && lengthMax !== null) query.lengthMax = lengthMax;
  if (compact) query.compact = 'true';
  return _request('GET', '/v3/resources', { query });
}

/**
 * 랜덤 리소스 추천. `GET /v3/resources/random`.
 * 서버는 `count`(=`limit` 아님)와 `resourceTypeFilter`/`categoryFilter` 사용.
 */
async function randomResources(opts = {}) {
  const {
    resourceTypeFilter,
    categoryFilter,
    count = DEFAULT_LIMIT,
    canonicalOnly,
    widthMin, widthMax, heightMin, heightMax,
    lengthMin, lengthMax,
    compact = true,
  } = opts;
  const query = { count };
  if (resourceTypeFilter !== undefined) query.resourceTypeFilter = [...resourceTypeFilter];
  if (categoryFilter !== undefined) query.categoryFilter = [...categoryFilter];
  if (canonicalOnly !== undefined && canonicalOnly !== null) query.canonicalOnly = canonicalOnly ? 'true' : 'false';
  if (widthMin !== undefined && widthMin !== null) query.widthMin = widthMin;
  if (widthMax !== undefined && widthMax !== null) query.widthMax = widthMax;
  if (heightMin !== undefined && heightMin !== null) query.heightMin = heightMin;
  if (heightMax !== undefined && heightMax !== null) query.heightMax = heightMax;
  if (lengthMin !== undefined && lengthMin !== null) query.lengthMin = lengthMin;
  if (lengthMax !== undefined && lengthMax !== null) query.lengthMax = lengthMax;
  if (compact) query.compact = 'true';
  return _request('GET', '/v3/resources/random', { query });
}

/**
 * 주어진 RUID를 포함하는 리소스 팩 목록.
 * `GET /v3/resources/packs/{id}` — 경로 파라미터는 32-hex RUID
 * (팩 id가 아님). 서버는 `payload.elements`에 그 RUID가 들어있는 팩들을 반환.
 *
 * 팩 자신의 메타데이터 + populated elements를 가져오려면 `getResource(packId)`
 * 사용 — 그 엔드포인트가 각 element의 payload를 채워서 반환함.
 */
async function findPacksContaining(ruid, opts = {}) {
  const { limit = DEFAULT_LIMIT, offset, compact = true } = opts;
  const query = { limit };
  if (offset !== undefined && offset !== null) query.offset = offset;
  if (compact) query.compact = 'true';
  return _request('GET', `/v3/resources/packs/${_enc(ruid)}`, { query });
}

// ---------------------------------------------------------------------------
// Section: Avatar — listings, defaults, render
// ---------------------------------------------------------------------------

/**
 * 모든 아바타 아이템 목록 (서버 캐시).
 * `GET /v3/avatars`. 키워드 검색은 `searchAvatarItems` 사용.
 */
async function listAvatars({ canonicalOnly = true } = {}) {
  return _request('GET', '/v3/avatars', {
    query: { canonicalOnly: canonicalOnly ? 'true' : 'false' },
  });
}

/** 기본 body / head RUID 조회. `GET /v3/avatars/defaults`. */
async function getAvatarDefaults() {
  return _request('GET', '/v3/avatars/defaults');
}

/**
 * 결합 아바타를 1개 이상의 액션 포즈로 렌더링.
 * `POST /v3/avatar/render`. `ruids`는 기본 body+head(`getAvatarDefaults`)와
 * 선택적 장착 아이템들. 서버 필수 파라미터인 `actions`는 미지정 시 `["stand1"]`
 * 자동 적용. `expressions`는 미지정 시 서버가 `["default"]` 적용.
 *
 * `renderingType`은 `"sprite"`(기본 — 프레임별 PNG) 또는
 * `"animationclip"`(액션별 WebP) 중 선택.
 */
async function renderAvatar(ruids, opts = {}) {
  const { actions, expressions, earType, renderingType } = opts;
  const payload = {
    ruids: [...ruids],
    actions: actions !== undefined && actions !== null ? [...actions] : ['stand1'],
  };
  if (expressions !== undefined && expressions !== null) payload.expressions = [...expressions];
  if (earType !== undefined && earType !== null) payload.ear_type = earType;
  if (renderingType !== undefined && renderingType !== null) payload.rendering_type = renderingType;
  return _request('POST', '/v3/avatar/render', { body: payload });
}

/** 아바타 렌더 프레임 이미지 URL 생성. */
function avatarFrameUrl(filename) {
  return `${BASE_URL}/v3/avatar/render/${_enc(filename)}`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** 매우 작은 argv 파서. argparse를 그대로 옮기진 않고 필요한 기능만 구현. */
function _parseArgs(argv, spec) {
  // spec: { positional: [{name, nargs?: '+'|undefined}], options: { flag: {dest, type, nargs?, const?, default?} } }
  const result = {};
  for (const [, opt] of Object.entries(spec.options || {})) {
    if (opt.default !== undefined) result[opt.dest] = opt.default;
  }
  const positionals = [];
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const opt = spec.options && spec.options[tok];
      if (!opt) throw new Error(`unknown option: ${tok}`);
      if (opt.nargs === '+') {
        const values = [];
        i += 1;
        while (i < argv.length && !argv[i].startsWith('--')) {
          values.push(argv[i]);
          i += 1;
        }
        if (values.length === 0) throw new Error(`option ${tok} requires at least one value`);
        result[opt.dest] = opt.type === 'int' ? values.map((v) => parseInt(v, 10))
          : opt.type === 'float' ? values.map((v) => parseFloat(v))
            : values;
        continue;
      }
      if (opt.const !== undefined) {
        result[opt.dest] = opt.const;
        i += 1;
        continue;
      }
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`option ${tok} requires a value`);
      result[opt.dest] = opt.type === 'int' ? parseInt(v, 10)
        : opt.type === 'float' ? parseFloat(v)
          : v;
      i += 2;
      continue;
    }
    positionals.push(tok);
    i += 1;
  }
  let pi = 0;
  for (const p of spec.positional || []) {
    if (p.nargs === '+') {
      if (pi >= positionals.length) throw new Error(`missing positional: ${p.name}`);
      result[p.name] = positionals.slice(pi);
      pi = positionals.length;
    } else {
      if (pi >= positionals.length) throw new Error(`missing positional: ${p.name}`);
      result[p.name] = positionals[pi];
      pi += 1;
    }
  }
  return result;
}

function _printJson(value) {
  if (value === null || value === undefined) return;
  if (typeof value === 'object') {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  } else {
    process.stdout.write(String(value) + '\n');
  }
}

const COMMON_FILTERS = {
  '--resource-type': { dest: 'resourceTypeFilter', nargs: '+' },
  '--category':      { dest: 'categoryFilter',     nargs: '+' },
  '--canonical-only':    { dest: 'canonicalOnly', const: true },
  '--no-canonical-only': { dest: 'canonicalOnly', const: false },
  '--no-compact': { dest: 'compact', const: false },
  '--width-min':  { dest: 'widthMin',  type: 'int' },
  '--width-max':  { dest: 'widthMax',  type: 'int' },
  '--height-min': { dest: 'heightMin', type: 'int' },
  '--height-max': { dest: 'heightMax', type: 'int' },
  '--length-min': { dest: 'lengthMin', type: 'float' },
  '--length-max': { dest: 'lengthMax', type: 'float' },
};

const CLI_USAGE = `\
MSW Resource Search API CLI

Usage:
  node msw_resource_api.cjs <command> [args]

Commands:
  search <query> [--resource-type ...] [--category ...] [--topK N] [--offset N]
                 [--canonical-only|--no-canonical-only] [--width-min N] ...
                 [--no-compact]
  search-avatar <query> [--topK N] [--offset N] [--category ...] [--no-compact]
  similar <ruid> [--topK N] [--resource-type ...] [--category ...] [--no-compact]
  get <ruid>
  batch <id1> <id2> ...
  tags <ruid>
  list [--resource-type ...] [--category ...] [--limit N] [--offset CURSOR] ...
  random [--resource-type ...] [--category ...] [--count N] ...
  packs <ruid> [--limit N] [--offset CURSOR] [--no-compact]
  avatars [--no-canonical-only]
  avatar-defaults
  avatar-render --ruids R1 R2 ... [--actions A1 ...] [--expressions E1 ...]
                [--ear-type ...] [--rendering-type sprite|animationclip]
  avatar-frame-url <filename>
`;

const CLI_HANDLERS = {
  search: async (argv) => {
    const a = _parseArgs(argv, {
      positional: [{ name: 'query' }],
      options: {
        ...COMMON_FILTERS,
        '--topK':   { dest: 'topK',   type: 'int', default: DEFAULT_LIMIT },
        '--offset': { dest: 'offset', type: 'int', default: 0 },
      },
    });
    return searchResources(a.query, {
      resourceTypeFilter: a.resourceTypeFilter,
      categoryFilter: a.categoryFilter,
      topK: a.topK, offset: a.offset,
      canonicalOnly: a.canonicalOnly,
      widthMin: a.widthMin, widthMax: a.widthMax,
      heightMin: a.heightMin, heightMax: a.heightMax,
      lengthMin: a.lengthMin, lengthMax: a.lengthMax,
      compact: a.compact !== false,
    });
  },
  'search-avatar': async (argv) => {
    const a = _parseArgs(argv, {
      positional: [{ name: 'query' }],
      options: {
        '--category':          { dest: 'categoryFilter', nargs: '+' },
        '--canonical-only':    { dest: 'canonicalOnly', const: true },
        '--no-canonical-only': { dest: 'canonicalOnly', const: false },
        '--no-compact':        { dest: 'compact', const: false },
        '--topK':   { dest: 'topK',   type: 'int', default: DEFAULT_LIMIT },
        '--offset': { dest: 'offset', type: 'int', default: 0 },
      },
    });
    return searchAvatarItems(a.query, {
      topK: a.topK, offset: a.offset,
      categoryFilter: a.categoryFilter,
      canonicalOnly: a.canonicalOnly,
      compact: a.compact !== false,
    });
  },
  similar: async (argv) => {
    const a = _parseArgs(argv, {
      positional: [{ name: 'ruid' }],
      options: {
        '--resource-type':     { dest: 'resourceTypeFilter', nargs: '+' },
        '--category':          { dest: 'categoryFilter',     nargs: '+' },
        '--canonical-only':    { dest: 'canonicalOnly', const: true },
        '--no-canonical-only': { dest: 'canonicalOnly', const: false },
        '--no-compact':        { dest: 'compact', const: false },
        '--topK': { dest: 'topK', type: 'int', default: DEFAULT_LIMIT },
      },
    });
    return findSimilarResources(a.ruid, {
      topK: a.topK,
      resourceTypeFilter: a.resourceTypeFilter,
      categoryFilter: a.categoryFilter,
      canonicalOnly: a.canonicalOnly,
      compact: a.compact !== false,
    });
  },
  get: async (argv) => {
    const a = _parseArgs(argv, { positional: [{ name: 'ruid' }] });
    return getResource(a.ruid);
  },
  batch: async (argv) => {
    const a = _parseArgs(argv, { positional: [{ name: 'ids', nargs: '+' }] });
    return getResourcesBatch(a.ids);
  },
  tags: async (argv) => {
    const a = _parseArgs(argv, { positional: [{ name: 'ruid' }] });
    return getResourceTags(a.ruid);
  },
  list: async (argv) => {
    const a = _parseArgs(argv, {
      options: {
        ...COMMON_FILTERS,
        '--limit':  { dest: 'limit', type: 'int', default: DEFAULT_LIMIT },
        '--offset': { dest: 'offset' }, // 문자열 커서
      },
    });
    return listResources({
      resourceTypeFilter: a.resourceTypeFilter,
      categoryFilter: a.categoryFilter,
      limit: a.limit, offset: a.offset,
      canonicalOnly: a.canonicalOnly,
      widthMin: a.widthMin, widthMax: a.widthMax,
      heightMin: a.heightMin, heightMax: a.heightMax,
      lengthMin: a.lengthMin, lengthMax: a.lengthMax,
      compact: a.compact !== false,
    });
  },
  random: async (argv) => {
    const a = _parseArgs(argv, {
      options: {
        ...COMMON_FILTERS,
        '--count': { dest: 'count', type: 'int', default: DEFAULT_LIMIT },
      },
    });
    return randomResources({
      resourceTypeFilter: a.resourceTypeFilter,
      categoryFilter: a.categoryFilter,
      count: a.count,
      canonicalOnly: a.canonicalOnly,
      widthMin: a.widthMin, widthMax: a.widthMax,
      heightMin: a.heightMin, heightMax: a.heightMax,
      lengthMin: a.lengthMin, lengthMax: a.lengthMax,
      compact: a.compact !== false,
    });
  },
  packs: async (argv) => {
    const a = _parseArgs(argv, {
      positional: [{ name: 'ruid' }],
      options: {
        '--limit':       { dest: 'limit', type: 'int', default: DEFAULT_LIMIT },
        '--offset':      { dest: 'offset' },
        '--no-compact':  { dest: 'compact', const: false },
      },
    });
    return findPacksContaining(a.ruid, {
      limit: a.limit, offset: a.offset,
      compact: a.compact !== false,
    });
  },
  avatars: async (argv) => {
    const a = _parseArgs(argv, {
      options: { '--no-canonical-only': { dest: 'canonicalOnly', const: false } },
    });
    return listAvatars({ canonicalOnly: a.canonicalOnly !== false });
  },
  'avatar-defaults': async () => getAvatarDefaults(),
  'avatar-render': async (argv) => {
    const a = _parseArgs(argv, {
      options: {
        '--ruids':          { dest: 'ruids', nargs: '+' },
        '--actions':        { dest: 'actions', nargs: '+' },
        '--expressions':    { dest: 'expressions', nargs: '+' },
        '--ear-type':       { dest: 'earType' },
        '--rendering-type': { dest: 'renderingType' },
      },
    });
    if (!a.ruids || a.ruids.length === 0) throw new Error('--ruids is required');
    if (a.earType !== undefined
        && !['humanear', 'ear', 'lefear', 'highlefear'].includes(a.earType)) {
      throw new Error(`invalid --ear-type: ${a.earType}`);
    }
    if (a.renderingType !== undefined
        && !['sprite', 'animationclip'].includes(a.renderingType)) {
      throw new Error(`invalid --rendering-type: ${a.renderingType}`);
    }
    return renderAvatar(a.ruids, {
      actions: a.actions,
      expressions: a.expressions,
      earType: a.earType,
      renderingType: a.renderingType,
    });
  },
  'avatar-frame-url': async (argv) => {
    const a = _parseArgs(argv, { positional: [{ name: 'filename' }] });
    return avatarFrameUrl(a.filename);
  },
};

async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    process.stdout.write(CLI_USAGE);
    return 0;
  }
  const [cmd, ...rest] = argv;
  const handler = CLI_HANDLERS[cmd];
  if (!handler) {
    process.stderr.write(`unknown command: ${cmd}\n\n${CLI_USAGE}`);
    return 2;
  }
  try {
    const value = await handler(rest);
    _printJson(value);
    return 0;
  } catch (err) {
    if (err instanceof MswApiError) {
      process.stderr.write(`[msw-api error] ${err.message}\n`);
      return 2;
    }
    process.stderr.write(`[error] ${err && err.message ? err.message : String(err)}\n`);
    return 2;
  }
}

module.exports = {
  BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_LIMIT,
  MswApiError,
  searchResources,
  searchAvatarItems,
  findSimilarResources,
  getResource,
  getResourcesBatch,
  getResourceTags,
  listResources,
  randomResources,
  findPacksContaining,
  listAvatars,
  getAvatarDefaults,
  renderAvatar,
  avatarFrameUrl,
  main,
};

if (require.main === module) {
  main().then((code) => process.exit(code));
}
