import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createController } from '../controller.js';
import { FIRE_IPTV, OWNTV } from 'fire-tv-toolkit/src/iptv-registry.js';
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
    executeShell: (...args) => api.executeShell(...args),
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
  assert.match(
    result.screensavers.find((entry) => entry.id === 'twilight-hearth').description,
    /Recorded wood fire/,
  );
  assert.equal(
    result.screensavers.find((entry) => entry.id === 'amazon').description,
    '',
  );
  assert.deepEqual(h.writes, []);
  const originalDirectory = h.state.directory;
  h.state.sleep = 60000;
  await h.controller.refresh();
  assert.equal(h.baselines.get(`${originalDirectory}:sleep`), 1200000);
  const initial = h.controller.initial();
  assert.equal(initial.savedIp, '192.168.1.10');
  assert.equal(initial.advanced, false);
  assert.equal(initial.profiles.length, 1);
  assert.equal(initial.profiles[0].ip, '192.168.1.10');
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

test('switching a saved TV clears the previous action target without contacting either TV', async t => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const oldDirectory = h.state.directory;
  const currentId = h.controller.initial().activeProfileId;
  const connect = t.mock.method(h.api, 'connect');
  const reach = t.mock.method(h.api, 'isReachable');
  const saved = await h.controller.profiles({ operation: 'save', profile: {
    name: 'Bedroom', ip: '192.168.1.11',
  } });
  assert.equal(saved.disconnected, true);
  assert.equal(h.controller.isConnected(), false);
  assert.equal(connect.mock.callCount(), 0);
  assert.equal(reach.mock.callCount(), 0);
  await assert.rejects(h.controller.action({ type: 'alexa', value: true }, async () => true), /Connect/);
  assert.deepEqual(h.writes, []);
  await h.controller.profiles({ operation: 'select', id: currentId });
  assert.equal(h.controller.isConnected(), false);
  await h.controller.connect('192.168.1.10');
  assert.equal(h.state.directory, oldDirectory);
  assert.equal(h.baselines.get(`${oldDirectory}:sleep`), 1200000);
});

test('renaming the connected TV preserves its connection; removing it clears the target', async t => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const id = h.controller.initial().activeProfileId;
  const result = await h.controller.profiles({ operation: 'save', profile: {
    id, name: 'Main TV', ip: '192.168.1.10',
  } });
  assert.equal(result.disconnected, false);
  assert.equal(h.controller.isConnected(), true);
  const removed = await h.controller.profiles({ operation: 'remove', id });
  assert.equal(removed.disconnected, true);
  assert.equal(h.controller.isConnected(), false);
  assert.equal(h.controller.initial().savedIp, '');
  assert.deepEqual(h.writes, []);
});

test('manual address edits disconnect locally and unsupported profile requests do nothing', async t => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const before = h.controller.initial();
  for (const request of [null, [], { operation: 'run' }])
    await assert.rejects(h.controller.profiles(request), /supported/);
  assert.deepEqual(h.controller.initial(), before);
  await h.controller.profiles({ operation: 'disconnect' });
  assert.equal(h.controller.isConnected(), false);
  assert.deepEqual(h.controller.initial(), before);
  assert.deepEqual(h.writes, []);
});

test('a failed local connection save cannot leave an undisplayed TV as the action target', async t => {
  const h = harness(t);
  t.mock.method(fs, 'renameSync', () => { throw new Error('Disk unavailable'); });
  await assert.rejects(h.controller.connect('192.168.1.10'), /Disk unavailable/);
  assert.equal(h.controller.isConnected(), false);
  await assert.rejects(h.controller.refresh(), /Connect/);
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
  await assert.rejects(h.controller.profiles({ operation: 'save', profile: {
    name: 'Another TV', ip: '192.168.1.11',
  } }), /current task/);
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

test('advanced tools default off, require approval and persist only after approval', async (t) => {
  const h = harness(t);
  assert.equal(h.controller.initial().advanced, false);
  await assert.rejects(h.controller.shell('id'), /Enable Advanced/);
  assert.deepEqual(await h.controller.setAdvanced(true, async () => false), {
    advanced: false,
    cancelled: true,
  });
  assert.equal(
    fs.existsSync(path.join(h.dataDir, 'desktop-settings.json')),
    false,
  );
  await h.controller.setAdvanced(true, async () => true);
  assert.equal(
    createController({ dataDir: h.dataDir, api: h.api }).initial().advanced,
    true,
  );
  await h.controller.setAdvanced(false, () => {
    throw new Error('Disabling must not ask');
  });
  await assert.rejects(h.controller.shell('id'), /Enable Advanced/);
  assert.equal(
    createController({ dataDir: h.dataDir, api: h.api }).initial().advanced,
    false,
  );
});

test('TV commands use the connected target and lock other tasks until stopped', async (t) => {
  const h = harness(t);
  await h.controller.setAdvanced(true, async () => true);
  await assert.rejects(h.controller.shell('id'), /Connect/);
  await h.controller.connect('192.168.1.10');
  for (const command of ['', 'x'.repeat(8193), null, 'id\0'])
    await assert.rejects(h.controller.shell(command), /Enter a command/);
  let ready;
  const started = new Promise((resolve) => {
    ready = resolve;
  });
  h.api.executeShell = async (ip, command, { signal }) => {
    assert.equal(ip, '192.168.1.10');
    assert.equal(command, 'id; getprop ro.product.model');
    ready();
    await new Promise((resolve) =>
      signal.addEventListener('abort', resolve, { once: true }),
    );
    return { code: null, stopped: 'stopped' };
  };
  const pending = h.controller.shell('id; getprop ro.product.model');
  await started;
  await assert.rejects(
    h.controller.setAdvanced(false, async () => true),
    /current task/,
  );
  await assert.rejects(h.controller.connect('192.168.1.11'), /current task/);
  assert.equal(h.controller.stopShell(), true);
  assert.equal((await pending).stopped, 'stopped');
  assert.equal(h.controller.stopShell(), false);
  assert.equal(h.controller.isBusy(), false);
  h.state.online = false;
  await assert.rejects(h.controller.shell('id'), /disconnected/);
});

const setup = {
  mode: 'setup',
  screensaver: 'keep',
  home: 'keep',
  ownTv: false,
  optimize: false,
};

test('stopping during the reachability check prevents the command from starting', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  await h.controller.setAdvanced(true, async () => true);
  let reachable;
  h.api.isReachable = () =>
    new Promise((resolve) => {
      reachable = resolve;
    });
  h.api.executeShell = () => {
    throw new Error('The command must not start');
  };
  const pending = h.controller.shell('id');
  assert.equal(h.controller.stopShell(), true);
  reachable(true);
  assert.equal((await pending).stopped, 'stopped');
  assert.equal(h.controller.isBusy(), false);
});

test('guided setup reviews changes once, respects cancellation and applies selections in order', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  const request = { ...setup, optimize: true, alexa: false, sleepMs: 1800000 };
  let proposal;
  assert.deepEqual(
    await h.controller.assistant(request, async (value) => {
      proposal = value;
      return false;
    }),
    { cancelled: true },
  );
  assert.match(proposal.detail, /Optimize for screensavers/);
  assert.match(proposal.detail, /30 minutes/);
  assert.match(proposal.detail, /Disable Alexa/);
  assert.equal(proposal.ip, '192.168.1.10');
  assert.deepEqual(h.writes, []);
  let confirmations = 0;
  const result = await h.controller.assistant(request, async () => {
    confirmations++;
    return true;
  });
  assert.equal(confirmations, 1);
  assert.deepEqual(
    h.writes.map((write) => write.type),
    ['optimize', 'timeout', 'alexa'],
  );
  assert.equal(result.state.sleepMs, 1800000);
  assert.equal(result.state.alexaEnabled, false);
  assert.match(result.message, /3 changes verified/);
});

test('guided setup installs before activation and reports a failed step without running later changes', async (t) => {
  const h = harness(t);
  const entry = SCREENSAVERS.find((entry) => entry.id === 'aquarium-4k');
  let installed = false;
  h.api.downloadApk = async (selected) => {
    assert.equal(selected.id, entry.id);
    return '/download/verified.apk';
  };
  h.api.installApk = async () => {
    installed = true;
    h.writes.push({ type: 'install' });
  };
  h.api.removeDownload = () => {};
  h.api.listPackages = async () =>
    installed ? [aerial.pkg, entry.pkg] : [aerial.pkg];
  h.api.setActiveScreensaver = async (_ip, component) => {
    h.state.active = component;
    h.writes.push({ type: 'activate' });
  };
  await h.controller.connect('192.168.1.10');
  const result = await h.controller.assistant(
    { ...setup, screensaver: entry.id },
    async () => true,
  );
  assert.deepEqual(
    h.writes.map((write) => write.type),
    ['install', 'activate'],
  );
  assert.equal(
    result.state.screensavers.find((item) => item.id === entry.id).active,
    true,
  );
  h.writes.length = 0;
  h.api.setTimeoutMs = async () => ({ applied: false });
  await assert.rejects(
    h.controller.assistant(
      { ...setup, sleepMs: 1800000, alexa: true },
      async () => true,
    ),
    (error) => {
      assert.match(error.message, /0 of 2 changes completed/);
      assert.match(error.message, /Remaining changes were not run/);
      assert.equal(error.state.alexaEnabled, false);
      return true;
    },
  );
  assert.deepEqual(h.writes, []);
});

test('the updater only accepts installed supported apps and preserves app selection', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  for (const request of [
    {
      mode: 'update',
      screensavers: ['aquarium-4k'],
      launchers: [],
      ownTv: false,
    },
    { mode: 'update', screensavers: [], launchers: ['bad'], ownTv: false },
    { mode: 'update', screensavers: [], launchers: [], ownTv: true },
    { ...setup, home: 'bad' },
    { ...setup, sleepMs: -1 },
  ])
    await assert.rejects(
      h.controller.assistant(request, () => {
        throw new Error('Must validate first');
      }),
      /Choose|Install|valid/,
    );
  h.api.downloadApk = async (entry) => {
    assert.equal(entry.id, aerial.id);
    return '/download/verified.apk';
  };
  h.api.installApk = async (ip) => h.writes.push({ type: 'install', ip });
  h.api.removeDownload = () => {};
  const result = await h.controller.assistant(
    {
      mode: 'update',
      screensavers: [aerial.id, aerial.id],
      launchers: [],
      ownTv: false,
    },
    async () => true,
  );
  assert.deepEqual(h.writes, [{ type: 'install', ip: '192.168.1.10' }]);
  assert.equal(
    result.state.screensavers.find((entry) => entry.id === aerial.id).active,
    true,
  );
  assert.equal(result.state.sleepMs, 1200000);
});

test('the guided updater reviews and applies optional settings with the selected app updates', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  let proposal;
  const result = await h.controller.assistant(
    {
      mode: 'update',
      screensavers: [],
      launchers: [],
      ownTv: false,
      sleepMs: 1800000,
      alexa: true,
    },
    async (value) => {
      proposal = value;
      return true;
    },
  );
  assert.match(proposal.detail, /30 minutes/);
  assert.match(proposal.detail, /Enable Alexa/);
  assert.deepEqual(
    h.writes.map((write) => write.type),
    ['timeout', 'alexa'],
  );
  assert.equal(result.state.sleepMs, 1800000);
  assert.equal(result.state.alexaEnabled, true);
});


test('fire-iptv setup installs the pinned player, opens it and preserves OwnTV', async (t) => {
  const h = harness(t);
  const installed = [OWNTV.pkg];
  h.api.listPackages = async () => [...installed];
  h.api.downloadApk = async (entry) => {
    assert.equal(entry.id, FIRE_IPTV.id);
    return '/private/test-fire-iptv.apk';
  };
  h.api.installApk = async (ip, file) => {
    h.writes.push({ ip, file });
    installed.push(FIRE_IPTV.pkg);
  };
  const removed = [];
  h.api.removeDownload = (file) => removed.push(file);
  h.api.openApp = async (_ip, pkg) => pkg === FIRE_IPTV.pkg;
  await h.controller.connect('192.168.1.10');
  const result = await h.controller.assistant(
    { ...setup, fireIptv: true }, async () => true,
  );
  assert.equal(result.state.fireIptvInstalled, true);
  assert.equal(result.state.ownTvInstalled, true);
  assert.deepEqual(removed, ['/private/test-fire-iptv.apk']);
  assert.equal(h.writes.length, 1);
  await h.controller.assistant({ ...setup, fireIptv: true }, async () => true);
  assert.equal(h.writes.length, 1);
});

test('fire-iptv download rejection prevents desktop installation and launch', async (t) => {
  const h = harness(t);
  await h.controller.connect('192.168.1.10');
  h.api.downloadApk = async () => { throw new Error('Checksum mismatch'); };
  h.api.installApk = async () => { throw new Error('Must not install'); };
  h.api.openApp = async () => { throw new Error('Must not launch'); };
  await assert.rejects(
    h.controller.action({ type: 'install-fire-iptv' }, async () => true),
    /Checksum mismatch/,
  );
  assert.deepEqual(h.writes, []);
});

test('published updates stay scoped to the checked TV and require confirmation', async (t) => {
  const h = harness(t);
  h.api.checkAppUpdates = async (ip) => [{id:'aquarium-live',name:'Aquarium Live',status:'checked',ip}];
  h.api.installAppUpdate = async (ip,row) => {h.writes.push({ip,id:row.id});return {message:'verified'};};
  await h.controller.connect('192.168.1.10');
  await assert.rejects(h.controller.installCheckedUpdate('aquarium-live',async()=>true),/Check published/);
  const checked = await h.controller.checkUpdates();
  assert.equal(checked.ip,'192.168.1.10');
  assert.equal((await h.controller.installCheckedUpdate('aquarium-live',async()=>false)).cancelled,true);
  assert.equal(h.writes.length,0);
  await assert.rejects(h.controller.installCheckedUpdate('unknown',async()=>true),/checked update/);
  await h.controller.installCheckedUpdate('aquarium-live',async()=>true);
  assert.deepEqual(h.writes,[{ip:'192.168.1.10',id:'aquarium-live'}]);
  await h.controller.connect('192.168.1.11');
  await assert.rejects(h.controller.installCheckedUpdate('aquarium-live',async()=>true),/Check published/);
});
