#!/usr/bin/env node
'use strict';

/**
 * msw-painter render helper — converts SVG/Canvas/HTML code to PNG.
 *
 * Usage:
 *   node render.cjs --type <svg|canvas|html> --in <path> --out <path.png> --width <px> --height <px>
 *
 * Code can also be passed via stdin instead of --in (use `--in -` or omit --in).
 * Transparent background by default. width/height default to 128×128 when omitted.
 *
 * Exit code: 0 = success, 1 = failure (message on stderr).
 *
 * Dependency: puppeteer (one-time `npm install` required).
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { type: null, in: null, out: null, width: 128, height: 128 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--type') { args.type = v; i++; }
    else if (k === '--in') { args.in = v; i++; }
    else if (k === '--out') { args.out = v; i++; }
    else if (k === '--width') { args.width = parseInt(v, 10); i++; }
    else if (k === '--height') { args.height = parseInt(v, 10); i++; }
    else if (k === '-h' || k === '--help') { args.help = true; }
  }
  return args;
}

function usage() {
  console.error('Usage: node render.cjs --type <svg|canvas|html> [--in <path>|-] --out <path.png> [--width N] [--height N]');
}

function readInput(inPath) {
  if (!inPath || inPath === '-') {
    return fs.readFileSync(0, 'utf8');
  }
  return fs.readFileSync(inPath, 'utf8');
}

function buildHtml(type, code, width, height) {
  const base = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { width: ${width}px; height: ${height}px; image-rendering: pixelated; image-rendering: crisp-edges; }
  svg, canvas, img { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
</style></head><body>`;
  const closer = `</body></html>`;

  if (type === 'svg') {
    return base + code + closer;
  }

  if (type === 'canvas') {
    return base
      + `<canvas id="__c" width="${width}" height="${height}"></canvas>`
      + `<script>
          (function(){
            var c = document.getElementById('__c');
            var ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            try {
              ${code}
              window.__painterDone = true;
            } catch (e) {
              window.__painterError = String(e && e.stack || e);
            }
          })();
        </script>`
      + closer;
  }

  if (type === 'html') {
    return code;
  }

  throw new Error(`unknown type: ${type}`);
}

async function render(args) {
  const puppeteer = require('puppeteer');

  const code = readInput(args.in);
  const html = buildHtml(args.type, code, args.width, args.height);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: args.width, height: args.height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    if (args.type === 'canvas') {
      await page.waitForFunction(
        () => window.__painterDone === true || typeof window.__painterError === 'string',
        { timeout: 10000 }
      );
      const err = await page.evaluate(() => window.__painterError);
      if (err) throw new Error('canvas code threw:\n' + err);
    }

    const outDir = path.dirname(path.resolve(args.out));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const clip = { x: 0, y: 0, width: args.width, height: args.height };
    await page.screenshot({ path: args.out, type: 'png', omitBackground: true, clip });
  } finally {
    await browser.close();
  }
}

(async () => {
  const args = parseArgs(process.argv);
  if (args.help) { usage(); process.exit(0); }
  if (!args.type || !args.out) {
    usage();
    process.exit(1);
  }
  if (!['svg', 'canvas', 'html'].includes(args.type)) {
    console.error(`--type must be svg|canvas|html (got: ${args.type})`);
    process.exit(1);
  }
  if (!Number.isFinite(args.width) || !Number.isFinite(args.height) || args.width <= 0 || args.height <= 0) {
    console.error(`--width / --height must be positive integers`);
    process.exit(1);
  }

  try {
    await render(args);
    process.stdout.write(path.resolve(args.out) + '\n');
  } catch (e) {
    console.error('render failed:', e && e.stack || e);
    process.exit(1);
  }
})();
