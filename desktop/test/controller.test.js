import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createController } from '../controller.js';
import { SCREENSAVERS } from 'fire-tv-toolkit/src/screensaver-registry.js';

const aerial = SCREENSAVERS.find((entry) => entry.id === 'aerial');

function harness(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-controller-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const writes = [];
  const progress = [];
  const baselines = new Map();
  const state = {
    online: true,
    alexa: false,
    sleep: 1200000,
    screensaver: 300000,
    directory: '',
    active: aerial.dreamComponent,
  };
  const api = {
    TIMEOUTS: [{ id: 'sleep' }, { id: 'screensaver' }],
    isValidIp: (value) =>
      /^(\d{1,3}\.){3}\d{1,3}$/.test(value.trim()) &&
      value
        .trim()
        .split('.')
        .every((part) => Number(part) <= 255),
    isAdbInstalled: async () => true,
    connect: async () => {},
    isReachable: async () => state.online,
    deviceInfo: async (ip) => ({
      model: 'Test Fire TV',
      serial: `serial:${ip}`,
      android: '11',
    }),
    setConfigDirectory: (directory) => {
      state.directory = directory;
    },
    saveIp: (ip) =>
      fs.writeFileSync(path.join(state.directory, '.env'), `FIRE_TV_IP=${ip}`),
    listPackages: async () => [aerial.pkg],
    getActiveScreensaver: async () => state.active,
    isAlexaFixEnabled: async () => state.alexa,
    getTimeoutMs: async (_ip, definition) => state[definition.id],
    hasFactoryBaseline: (id) => baselines.has(`${state.directory}:${id}`),
    saveFactoryBaseline: (id, value) =>
      baselines.set(`${state.directory}:${id}`, value),
    getFactoryBaseline: (id) =>
      baselines.get(`${state.directory}:${id}`) ?? null,
    launcherState: async () => ({ home: 'amazon' }),
    guardState: () => ({ on: false }),
    setAlexaFix: async (ip, value) => {
      writes.push({ type: 'alexa', ip, value });
      state.alexa = value;
      return value;
    },
    findTimeoutById: (id) =>
      api.TIMEOUTS.find((definition) => definition.id === id),
    setTimeoutMs: async (ip, definition, value) => {
      writes.push({ type: 'timeout', ip, id: definition.id, value });
      state[definition.id] = value;
      return { applied: true };
    },
    uninstallPackage: async (ip, pkg) => {
      writes.push({ type: 'uninstall', ip, pkg });
      return true;
    },
    readOptimizeState: async () => ({}),
    planOptimizations: () => [
      { id: 'alexa-fix', label: 'Enable Alexa', to: '1' },
    ],
    applyOptimizations: async (ip, changes) => {
      writes.push({ type: 'optimize', ip, changes });
      return changes.map((change) => ({ change, ok: true }));
    },
  };
  const controller = createController({
    dataDir,
    api,
    onProgress: (text) => progress.push(text),
  });
  return { controller, api, state, writes, progress, dataDir, baselines };
}

test('connecting reads state and preserves the first captured timer values', async (t) => {
  const h = harness(t);
  const result = await h.controller.connect('192.168.1.10');
  assert.equal(result.device.model, 'Test Fire TV');
  assert.equal(
    result.screensavers.find((entry) => entry.id === 'aerial').active,
    true,
  );
  assert.deepEqual(h.writes, []);
  const originalDirectory = h.state.directory;
  h.state.sleep = 60000;
  await h.controller.refresh();
  assert.equal(h.baselines.get(`${originalDirectory}:sleep`), 1200000);
  assert.deepEqual(h.controller.initial(), { savedIp: '192.168.1.10' });
  await h.controller.connect('192.168.1.11');
  assert.notEqual(h.state.directory, originalDirectory);
  assert.equal(h.baselines.get(`${h.state.directory}:sleep`), 60000);
});

test('a declined native confirmation performs no writes', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  let proposal;
  const result = await h.controller.action(
    { type: 'alexa', value: true, ip: '192.168.1.99' },
    async (value) => {
      proposal = value;
      return false;
    },
  );
  assert.deepEqual(result, { cancelled: true });
  assert.equal(proposal.ip, '192.168.1.10');
  assert.deepEqual(h.writes, []);
});

test('actions target the connected TV and verify the resulting state', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const result = await h.controller.action(
    { type: 'alexa', value: true, ip: '192.168.1.99' },
    async () => true,
  );
  assert.equal(result.state.alexaEnabled, true);
  assert.deepEqual(h.writes, [
    { type: 'alexa', ip: '192.168.1.10', value: true },
  ]);
});

test('unsupported tasks, IDs and timer values are rejected before confirmation', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  let confirmations = 0;
  for (const request of [
    null,
    { type: 'shell', value: 'rm' },
    { type: 'install-screensaver', id: '../../other' },
    { type: 'home', id: 'other' },
    { type: 'timeout', id: 'sleep', value: -1 },
    { type: 'timeout', id: 'screensaver', value: 0 },
    { type: 'timeout', id: 'sleep', value: '60000' },
    { type: 'timeout', id: 'sleep', value: Infinity },
    { type: 'alexa', value: 'true' },
  ]) {
    await assert.rejects(
      h.controller.action(request, async () => {
        confirmations++;
        return true;
      }),
    );
  }
  assert.equal(confirmations, 0);
  assert.deepEqual(h.writes, []);
});

test('a pending action prevents a second action or a device switch', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  let approve;
  let opened;
  const ready = new Promise((resolve) => {
    opened = resolve;
  });
  const pending = h.controller.action({ type: 'alexa', value: true }, () => {
    opened();
    return new Promise((resolve) => {
      approve = resolve;
    });
  });
  await ready;
  await assert.rejects(h.controller.connect('192.168.1.11'), /current task/);
  await assert.rejects(
    h.controller.action({ type: 'alexa', value: false }, async () => true),
    /current task/,
  );
  approve(false);
  await pending;
  assert.equal((await h.controller.refresh()).device.ip, '192.168.1.10');
});

test('a dropped connection after confirmation prevents the write', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  await assert.rejects(
    h.controller.action({ type: 'alexa', value: true }, async () => {
      h.state.online = false;
      return true;
    }),
    /disconnected/,
  );
  assert.equal(h.controller.isConnected(), false);
  assert.deepEqual(h.writes, []);
});

test('a rejected device setting is never reported as complete', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  h.api.setAlexaFix = async () => false;
  await assert.rejects(
    h.controller.action({ type: 'alexa', value: true }, async () => true),
    (error) => {
      assert.match(error.message, /did not save/);
      assert.equal(error.state.alexaEnabled, false);
      return true;
    },
  );
  assert.equal(
    h.progress.some((text) => text.includes('complete.')),
    false,
  );
});

test('the active screensaver cannot be removed', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  await assert.rejects(
    h.controller.action(
      { type: 'remove-screensaver', id: aerial.id },
      async () => true,
    ),
    /another screensaver/,
  );
  assert.deepEqual(h.writes, []);
});

test('a setting reverted before the final readback never reports completion', async (t) => {
  for (const type of ['timeout', 'alexa']) {
    await t.test(type, async (t) => {
      const h = harness(t);
      await h.controller.connect('192.168.1.10');
      h.api.setTimeoutMs = async () => ({ applied: true });
      h.api.setAlexaFix = async () => true;
      const request =
        type === 'timeout'
          ? { type, id: 'screensaver', value: 360000 }
          : { type, value: true };
      await assert.rejects(
        h.controller.action(request, async () => true),
        (error) => {
          assert.match(error.message, /before verification/);
          assert.equal(error.state.screensaverMs, 300000);
          assert.equal(error.state.alexaEnabled, false);
          return true;
        },
      );
      assert.equal(
        h.progress.some((text) => text.includes('complete.')),
        false,
      );
    });
  }
});

test('resetting timers restores captured values', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  await h.controller.action(
    { type: 'timeout', id: 'sleep', value: 0 },
    async () => true,
  );
  await h.controller.action({ type: 'reset-timeouts' }, async () => true);
  assert.equal(h.state.sleep, 1200000);
  assert.equal(h.writes.filter((write) => write.type === 'timeout').length, 3);
});

test('timer changes accept the supported ceiling and reject values above it', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const ceiling = 35_791 * 60_000;
  const result = await h.controller.action(
    { type: 'timeout', id: 'screensaver', value: ceiling },
    async () => true,
  );
  assert.equal(result.state.screensaverMs, ceiling);
  await assert.rejects(
    h.controller.action(
      { type: 'timeout', id: 'screensaver', value: ceiling + 1 },
      async () => true,
    ),
    /valid timeout/,
  );
  assert.equal(h.writes.length, 1);
});

test('optimization changes are computed from the TV and ignore supplied commands', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  await h.controller.action(
    { type: 'optimize', changes: [{ id: 'arbitrary', to: 'bad' }] },
    async () => true,
  );
  assert.deepEqual(h.writes[0].changes, [
    { id: 'alexa-fix', label: 'Enable Alexa', to: '1' },
  ]);
});

test('an incomplete connection leaves every action unavailable', async (t) => {
  const h = harness(t);
  h.api.listPackages = async () => {
    throw new Error('Read failed');
  };
  await assert.rejects(h.controller.connect('192.168.1.10'), /Read failed/);
  assert.equal(h.controller.isConnected(), false);
  await assert.rejects(
    h.controller.action({ type: 'alexa', value: true }, async () => true),
    /Connect/,
  );
  assert.deepEqual(h.writes, []);
});
