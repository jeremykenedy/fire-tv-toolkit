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
  assert.equal(await page.locator('[data-view="terminal"]').isVisible(), true);
  await page.getByLabel('Favorites', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Remove Channel 000 from favorites' })
    .waitFor();
  assert.equal(await page.locator('.channel-row').count(), 1);
});
