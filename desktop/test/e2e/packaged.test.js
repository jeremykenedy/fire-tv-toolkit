import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { _electron as electron } from 'playwright';

const directory = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(directory, '../..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(desktop, 'package.json')),
);
const version = manifest.version;
const output = path.join(desktop, 'dist', 'verification');

function executable() {
  if (process.platform === 'win32')
    return path.join(
      process.env.RUNNER_TEMP,
      'Fire TV Toolkit',
      'Fire TV Toolkit.exe',
    );
  if (process.platform === 'linux') return '/usr/bin/fire-tv-toolkit-desktop';
  const folder = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
  return path.join(
    desktop,
    'dist',
    folder,
    'Fire TV Toolkit.app',
    'Contents',
    'MacOS',
    'Fire TV Toolkit',
  );
}

test('the installed app browses IPTV, plays HLS and retains favorites', async (t) => {
  assert.equal(
    process.env.CI,
    'true',
    'Run this test on an isolated CI runner.',
  );
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-packaged-'));
  fs.mkdirSync(output, { recursive: true });
  const channels = Array.from({ length: 103 }, (_, index) => ({
    id: `channel-${index}`,
    name: `Channel ${String(index).padStart(3, '0')}`,
    country: index === 0 ? 'JP' : 'US',
    languages: [index === 0 ? 'jpn' : 'eng'],
    categories: ['news'],
    sources: [
      {
        id: 'primary',
        title: 'Test broadcast',
        url: 'https://media.example.org/stream.m3u8',
        quality: '180p',
        labels: [],
        referrer: '',
        userAgent: '',
      },
    ],
  }));
  fs.writeFileSync(
    path.join(data, 'iptv-catalog.json'),
    JSON.stringify({ version: 2, loadedAt: Date.now(), channels }),
  );
  let application;
  async function launch() {
    application = await electron.launch({
      executablePath: executable(),
      args: [`--user-data-dir=${data}`],
    });
    const runtime = await application.evaluate(({ app }) => ({
      packaged: app.isPackaged,
      version: app.getVersion(),
      electron: process.versions.electron,
      data: app.getPath('userData'),
      resources: process.resourcesPath,
    }));
    assert.equal(runtime.packaged, true);
    assert.equal(runtime.version, version);
    assert.equal(runtime.electron, manifest.devDependencies.electron);
    assert.equal(fs.realpathSync(runtime.data), fs.realpathSync(data));
    const adb = path.join(
      runtime.resources,
      'platform-tools',
      process.platform === 'win32' ? 'adb.exe' : 'adb',
    );
    assert.match(
      execFileSync(adb, ['version'], { encoding: 'utf8', timeout: 10000 }),
      /37\.0\.1/,
    );
    for (const name of ['LICENSE', 'NOTICE']) {
      assert.equal(
        fs.readFileSync(
          path.join(runtime.resources, `${name}.fire-tv-toolkit`),
          'utf8',
        ),
        fs.readFileSync(path.join(desktop, '..', name), 'utf8'),
      );
    }
    const page = await application.firstWindow();
    await page
      .locator('#catalog-count')
      .filter({ hasText: '103 channels / 103 sources' })
      .waitFor();
    return page;
  }
  t.after(async () => {
    if (application) {
      const page = application.windows()[0];
      if (page)
        await page
          .screenshot({
            path: path.join(output, `${process.platform}-final-state.png`),
            timeout: 5000,
          })
          .catch(() => {});
      await application.close();
    }
    fs.rmSync(data, { recursive: true, force: true });
  });
  let page = await launch();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await page.evaluate(() => typeof window.process), 'undefined');
  assert.equal(await page.locator('[data-view="activity"]').isVisible(), false);
  assert.equal(await page.locator('[data-view="terminal"]').isVisible(), false);
  assert.equal(await page.locator('.channel-row').count(), 100);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page
    .locator('#channel-page')
    .filter({ hasText: '101 to 103 of 103' })
    .waitFor();
  await page.getByLabel('Country', { exact: true }).selectOption('JP');
  await page
    .locator('#channel-page')
    .filter({ hasText: '1 to 1 of 1' })
    .waitFor();
  await page
    .getByRole('button', { name: 'Save Channel 000 to favorites' })
    .click();
  await page
    .getByRole('button', { name: 'Remove Channel 000 from favorites' })
    .waitFor();
  await page.getByLabel('Favorites', { exact: true }).check();
  assert.equal(await page.locator('.channel-row').count(), 1);
  await page.context().route('https://media.example.org/**', async (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    assert.match(name, /^stream(?:\d+\.ts|\.m3u8)$/);
    await route.fulfill({
      path: path.join(directory, 'fixtures', name),
      contentType: name.endsWith('.ts')
        ? 'video/mp2t'
        : 'application/vnd.apple.mpegurl',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.locator('.channel-play').click();
  await page.waitForFunction(
    () =>
      document.querySelector('video').currentTime > 1 &&
      document.querySelector('video').videoWidth === 320,
  );
  await page.screenshot({
    path: path.join(output, `${process.platform}-live-tv.png`),
  });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page
    .locator('#player-status')
    .filter({ hasText: 'Playback stopped' })
    .waitFor();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('heading', { name: 'Connect your Fire TV' }).waitFor();
  await page.screenshot({
    path: path.join(output, `${process.platform}-device-setup.png`),
  });
  await page.getByRole('button', { name: 'Manage TVs', exact: true }).click();
  await page.getByLabel('TV name', { exact: true }).fill('Main TV');
  await page.getByLabel('IP address', { exact: true }).fill('192.0.2.10');
  await page.getByRole('button', { name: 'Save TV', exact: true }).click();
  await page.locator('#profile-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Manage TVs', exact: true }).click();
  await page.getByLabel('TV to edit', { exact: true }).selectOption('');
  await page.getByLabel('TV name', { exact: true }).fill('Bedroom');
  await page.getByLabel('IP address', { exact: true }).fill('192.0.2.11');
  await page.getByRole('button', { name: 'Save TV', exact: true }).click();
  await page.locator('#profile-dialog').waitFor({ state: 'hidden' });
  const saved = (await page.evaluate(() => window.toolkit.initial())).data;
  assert.equal(saved.profiles.length, 2);
  const mainTv = saved.profiles.find(profile => profile.name === 'Main TV');
  await page.getByLabel('Saved TV', { exact: true }).selectOption(mainTv.id);
  await page.locator('#notice').filter({ hasText: 'TV selected' }).waitFor();
  assert.equal(await page.locator('#address').inputValue(), '192.0.2.10');
  assert.equal(await page.locator('#refresh').isEnabled(), false);
  assert.equal(await page.locator('#connection-label').innerText(), 'No TV connected');
  await page.getByRole('button', { name: 'Manage TVs', exact: true }).click();
  await page.getByLabel('TV name', { exact: true }).fill('Living room');
  await page.getByRole('button', { name: 'Save TV', exact: true }).click();
  await page.locator('#profile-dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Manage TVs', exact: true }).click();
  await page.getByLabel('TV to edit', { exact: true }).selectOption('');
  await page.getByLabel('TV name', { exact: true }).fill('Duplicate');
  await page.getByLabel('IP address', { exact: true }).fill('192.0.2.10');
  await page.getByRole('button', { name: 'Save TV', exact: true }).click();
  await page.locator('#profile-error').filter({ hasText: 'already saved' }).waitFor();
  assert.equal((await page.evaluate(() => window.toolkit.initial())).data.profiles.length, 2);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Manage TVs', exact: true }).click();
  await page.screenshot({ path: path.join(output, `${process.platform}-tv-profiles.png`) });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  // Exercise native launcher views with sample device data, without contacting a TV.
  await application.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('toolkit:connect');
    let connections = 0;
    ipcMain.handle('toolkit:connect', () => {
      const existing = connections++ > 0;
      return { ok: true, data: {
        device: { ip: '192.0.2.10', model: 'Sample Fire TV', android: '11' },
        home: existing ? 'ltv' : 'amazon',
        alexaEnabled: false, sleepMs: 1200000, screensaverMs: 300000,
        guardConfigured: false, ownTvInstalled: false, fireIptvInstalled: false,
        homeRedirectInstalled: existing, screensavers: [], playlist: '',
        launchers: [
          { id: 'fire-tv-ui', name: 'Fire TV UI', recommended: true, installed: false, ready: false },
          { id: 'at4k', name: 'AT4K Launcher', recommended: false, installed: false, ready: false },
          { id: 'ltv', name: 'LTvLauncher', recommended: false, installed: existing, ready: existing },
        ],
      } };
    });
  });
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.locator('#connection-label').filter({ hasText: 'Living room / 192.0.2.10' }).waitFor();
  await page.locator('[data-view="home"]').click();
  assert.match(await page.locator('#launcher-list .app-row').first().innerText(), /Fire TV UI.*Recommended/s);
  assert.equal(await page.locator('#launcher-list .app-row').first().getByRole('button', { name: 'Install', exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(output, `${process.platform}-preferred-fire-tv-ui.png`) });
  await page.locator('[data-view="setup"]').click();
  assert.equal(await page.locator('#setup-home').inputValue(), 'fire-tv-ui');
  await page.locator('[data-view="overview"]').click();
  await page.getByRole('button', { name: 'Connect again', exact: true }).click();
  await page.locator('#notice').filter({ hasText: 'Connected to Sample Fire TV' }).waitFor();
  await page.locator('[data-view="setup"]').click();
  assert.equal(await page.locator('#setup-home').inputValue(), 'keep');
  await page.locator('#refresh').click();
  await page.locator('#connection-label').filter({ hasText: 'No TV connected' }).waitFor();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Where it works', exact: true })
    .waitFor();
  assert.match(await page.locator('#view-about').innerText(), /Jeremy Kenedy/);
  assert.equal(
    await page.locator('[data-link="license"]').innerText(),
    'Apache License 2.0',
  );
  assert.match(
    await page.locator('#view-about').innerText(),
    /without warranty/,
  );
  await page.screenshot({
    path: path.join(output, `${process.platform}-about.png`),
  });
  await page
    .getByRole('button', { name: 'Advanced settings', exact: true })
    .click();
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBox = async (...args) => {
      dialog.testWarning = args.at(-1);
      return { response: 0 };
    };
  });
  await page.getByRole('switch', { name: 'Enable Advanced settings' }).click();
  await page.locator('#notice').filter({ hasText: 'remain off' }).waitFor();
  const warning = await application.evaluate(
    ({ dialog }) => dialog.testWarning,
  );
  assert.equal(warning.type, 'warning');
  assert.equal(warning.defaultId, 0);
  assert.match(warning.detail, /erase data/);
  assert.equal(await page.locator('[data-view="terminal"]').isVisible(), false);
  assert.match(
    (await page.evaluate(() => window.toolkit.shell('id'))).error,
    /Enable Advanced/,
  );
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1 });
  });
  await page.getByRole('switch', { name: 'Enable Advanced settings' }).click();
  await page.locator('[data-view="terminal"]').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'TV terminal', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Run on TV', exact: true })
      .isEnabled(),
    false,
  );
  await page
    .getByRole('button', { name: 'Advanced settings', exact: true })
    .click();
  await page.screenshot({
    path: path.join(output, `${process.platform}-advanced.png`),
  });
  assert.deepEqual(errors, []);
  await application.close();
  application = null;
  page = await launch();
  const restoredProfiles = (await page.evaluate(() => window.toolkit.initial())).data;
  assert.equal(restoredProfiles.profiles.length, 2);
  assert.equal(restoredProfiles.savedIp, '192.0.2.10');
  assert.equal(restoredProfiles.profiles.find(profile => profile.id === restoredProfiles.activeProfileId).name, 'Living room');
  assert.equal(await page.locator('[data-view="terminal"]').isVisible(), true);
  await page.getByLabel('Favorites', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Remove Channel 000 from favorites' })
    .waitFor();
  assert.equal(await page.locator('.channel-row').count(), 1);
});
