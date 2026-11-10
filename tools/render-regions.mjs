import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGIONS, WORLDS } from '../src/catalog.js';

const url = process.env.PREVIEW_URL || 'http://localhost:4173/?debug';
const executablePath = process.env.CHROMIUM_PATH;
const output = new URL('../artifacts/regions/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForFunction(() => window.portalDebug?.journey?.getDebugState().worldId, { timeout: 60_000 });
  await page.addStyleTag({ content: 'body > :not(canvas) { display: none !important; } canvas { display: block !important; }' });
  await page.evaluate(() => { window.portalDebug.journey.setQuality('low'); window.portalDebug.journey.setPaused(true); });
  for (const region of REGIONS) {
    const world = WORLDS.find(world => world.regionId === region.id);
    await page.evaluate(id => {
      const journey = window.portalDebug.journey;
      journey.start(id); journey.setPaused(true);
    }, world.id);
    await page.waitForFunction(() => window.portalDebug.journey.getDebugState().liveWorlds === 2, { timeout: 60_000 });
    const state = await page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return window.portalDebug.journey.getDebugState();
    });
    await page.screenshot({ path: new URL(`${region.id}.png`, output).pathname, timeout: 60_000, animations: 'disabled' });
    results.push({ region: region.id, world: world.id, ...state });
    console.log(`${region.id}: ${state.failed ? 'FAILED' : 'rendered'}`);
  }
} finally {
  await browser.close();
  await writeFile(new URL('report.json', output), JSON.stringify({ url, width: 640, height: 400, errors, results }, null, 2));
}
if (errors.length || results.some(result => result.failed) || results.length !== 30) {
  console.error(errors);
  process.exitCode = 1;
}
