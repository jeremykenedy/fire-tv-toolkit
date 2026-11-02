import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { installFakeAdb } from '../../../test/helpers/fake-adb.js';
import { FIRE_TV_UI as UI, HOME_REDIRECT, LTV } from '../../../src/launcher-registry.js';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('native desktop source setup follows saved TV selection and preserves Home', { timeout: 60000, skip: process.platform !== 'darwin' }, async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-source-ui-'));
  const fake = installFakeAdb();
  const adb = path.join(desktop, 'resources/platform-tools/adb');
  const previous = fs.existsSync(adb) ? { bytes: fs.readFileSync(adb), mode: fs.statSync(adb).mode, link: fs.lstatSync(adb).isSymbolicLink() ? fs.readlinkSync(adb) : null } : null;
  let application;
  try {
    fs.mkdirSync(path.dirname(adb), { recursive: true });
    fs.rmSync(adb, { force: true });
    fs.symlinkSync(path.join(fake.dir, 'adb'), adb);
    fake.setState({ installed: [UI.pkg, HOME_REDIRECT.pkg, LTV.pkg], versionCodes: { [UI.pkg]: 78 },
      properties: { 'ro.serialno': 'fixture-tv', 'ro.product.model': 'Fixture TV', 'ro.build.version.sdk': '30' },
      features: ['android.software.leanback'], guard: { home: 'ltv' },
      secure: { ...fake.readState().secure, enabled_accessibility_services: HOME_REDIRECT.service, accessibility_enabled: '1' } });
    const profiles = { version: 1, activeId: 'living', profiles: [
      { id: 'living', name: 'Living room', ip: '192.0.2.4' }, { id: 'bedroom', name: 'Bedroom', ip: '192.0.2.5' },
    ] };
    const profileFile = path.join(data, 'tv-profiles.json');
    fs.writeFileSync(profileFile, JSON.stringify(profiles));
    fs.writeFileSync(path.join(data, 'iptv-catalog.json'), JSON.stringify({ version: 2, loadedAt: Date.now(), channels: [] }));
    application = await electron.launch({ args: [path.join(desktop, 'main.js'), `--user-data-dir=${data}`] });
    assert.equal(await application.evaluate(({ app }) => app.isPackaged), false);
    const fixture = await application.evaluate(async ({ app }) => {
      const { execFileSync } = process.getBuiltinModule('node:child_process');
      const path = process.getBuiltinModule('node:path');
      try {
        return execFileSync(path.join(app.getAppPath(), 'resources/platform-tools/adb'), ['version'], { encoding: 'utf8' });
      } catch (error) { return error.message; }
    });
    assert.match(fixture, /Android Debug Bridge version/);
    const page = await application.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-view="home"]').click();
    await page.locator('#connect').click();
    await page.waitForFunction(() => !document.body.classList.contains('busy'));
    assert.match(await page.locator('#connection-label').innerText(), /Living room \/ 192\.0\.2\.4/, await page.locator('#notice').innerText());
    const before = fake.readState();
    const saved = fs.readFileSync(profileFile, 'utf8');
    await page.getByRole('button', { name: 'Check setup and recovery', exact: true }).click();
    await page.locator('#source-ui-target').filter({ hasText: 'Living room at 192.0.2.4' }).waitFor();
    assert.match(await page.locator('#source-ui-current').innerText(), /Current Home: ltv/);
    assert.match(await page.locator('#source-ui-blockers').innerText(), /native hardware acceptance/);
    assert.match(await page.locator('#source-ui-recovery').innerText(), /--use=amazon/);
    assert.equal(fs.readFileSync(profileFile, 'utf8'), saved);
    assert.deepEqual(fake.readState(), before);
    const output = path.join(desktop, 'dist/verification');
    fs.mkdirSync(output, { recursive: true });
    await page.locator('#source-ui-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'source-ui-preflight.png') });
    await page.locator('#tv-profile').selectOption('bedroom');
    assert.equal(await page.locator('#source-ui-result').isVisible(), false);
    await page.locator('#connect').click();
    await page.locator('#connection-label').filter({ hasText: 'Bedroom / 192.0.2.5' }).waitFor();
    await page.getByRole('button', { name: 'Check setup and recovery', exact: true }).click();
    await page.locator('#source-ui-target').filter({ hasText: 'Bedroom at 192.0.2.5' }).waitFor();
    await page.locator('#source-ui-recovery').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'source-ui-recovery.png') });
    assert.deepEqual(errors, []);
    assert.equal(fake.readState().guard.home, 'ltv');
    assert.equal(fake.readState().lastInstallPath, undefined);
  } finally {
    if (application) await application.close();
    fs.rmSync(adb, { force: true });
    if (previous?.link) fs.symlinkSync(previous.link, adb);
    else if (previous) { fs.writeFileSync(adb, previous.bytes); fs.chmodSync(adb, previous.mode); }
    fake.restore();
    fs.rmSync(data, { recursive: true, force: true });
  }
});
