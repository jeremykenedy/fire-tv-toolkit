import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setAdbExecutable } from 'fire-tv-toolkit/src/adb.js';
import { checkToolkitUpdate, downloadDesktopUpdate } from 'fire-tv-toolkit/src/self-update.js';
import { createController } from './controller.js';
import { createIptvCatalog, streamUrl } from './iptv.js';
import { configurePlayerNetwork } from './player-network.js';
import { runTvShell } from './tv-shell.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = 'app://toolkit/index.html';
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
app.setName('Fire TV Toolkit');
let window;
let controller;
let playingSource = null;
let sourceRequest = 0;
let checkedToolkitUpdate = null;
let updatingToolkit = false;

function message(error) {
  return error instanceof Error
    ? error.message
    : 'The task could not finish. Try again.';
}

async function confirmChanges(proposal) {
  const result = await dialog.showMessageBox(window, {
    type: 'question',
    title: proposal.title,
    message: proposal.title,
    detail: `Fire TV at ${proposal.ip}\n\n${proposal.detail}`,
    buttons: ['Cancel', 'Continue'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  return result.response === 1;
}

async function uninstall() {
  if (controller.isBusy()) {
    await dialog.showMessageBox(window, {
      message:
        'Wait for the TV task to finish before removing the desktop app.',
    });
    return;
  }
  if (!app.isPackaged) {
    await dialog.showMessageBox(window, {
      message: 'This is a development copy.',
      detail:
        'Packaged Windows apps include an uninstaller. On macOS, the installed app can move itself to Trash. Linux packages are removed through the system package manager.',
    });
    return;
  }
  const approved = await dialog.showMessageBox(window, {
    type: 'question',
    message: 'Remove Fire TV Toolkit from this computer?',
    detail:
      'TV settings and apps stay as they are. Your saved device settings stay on this computer so you can reinstall later.',
    buttons: ['Cancel', 'Remove desktop app'],
    defaultId: 0,
    cancelId: 0,
  });
  if (approved.response !== 1) return;
  if (process.platform === 'darwin') {
    const bundle = path.resolve(path.dirname(app.getPath('exe')), '..', '..');
    if (!bundle.endsWith('.app'))
      throw new Error(
        'Locate Fire TV Toolkit in Applications and move it to Trash.',
      );
    await shell.trashItem(bundle);
    app.quit();
  } else if (process.platform === 'win32') {
    const executable = path.join(
      path.dirname(app.getPath('exe')),
      'Uninstall Fire TV Toolkit.exe',
    );
    if (!fs.existsSync(executable))
      throw new Error(
        'Open Windows Settings, then Apps, then Installed apps, and uninstall Fire TV Toolkit.',
      );
    const child = spawn(executable, [], { detached: true, stdio: 'ignore' });
    child.once('error', (error) =>
      dialog.showErrorBox('Could not open the uninstaller', message(error)),
    );
    child.once('spawn', () => {
      child.unref();
      app.quit();
    });
  } else {
    await dialog.showMessageBox(window, {
      message: 'Remove Fire TV Toolkit through your system package manager.',
      detail:
        'For the Debian package, run: sudo apt remove fire-tv-toolkit-desktop\n\nFor AppImage, close the app and delete its AppImage file. Saved device settings remain in your user configuration folder.',
    });
  }
}

function createWindow() {
  window = new BrowserWindow({
    title: 'Fire TV Toolkit',
    width: 1160,
    height: 820,
    minWidth: 780,
    minHeight: 600,
    backgroundColor: '#202328',
    show: false,
    webPreferences: {
      preload: path.join(directory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== pageUrl) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  window.on('close', (event) => {
    if (controller.isBusy()) {
      event.preventDefault();
      dialog.showMessageBox(window, {
        message: 'Wait for the TV task to finish before closing this window.',
      });
    }
  });
  window.on('closed', () => {
    window = null;
  });
  window.loadURL(pageUrl);
}

function handle(channel, work) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== pageUrl
    ) {
      throw new Error('This request did not come from the desktop app.');
    }
    try {
      return { ok: true, data: await work(...args) };
    } catch (error) {
      return {
        ok: false,
        error: message(error),
        connected: controller.isConnected(),
        state: error?.state,
      };
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(() => {
      protocol.handle('app', (request) => {
        const url = new URL(request.url);
        const name = url.pathname.slice(1);
        if (url.hostname === 'toolkit' && name === 'hls.min.js')
          return net.fetch(
            pathToFileURL(
              path.join(directory, 'node_modules/hls.js/dist/hls.min.js'),
            ).href,
          );
        if (
          url.hostname !== 'toolkit' ||
          !['index.html', 'app.js', 'style.css'].includes(name)
        )
          return new Response('Not found', { status: 404 });
        return net.fetch(
          pathToFileURL(path.join(directory, 'renderer', name)).href,
        );
      });
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      configurePlayerNetwork(
        session.defaultSession.webRequest,
        () => window?.webContents.id,
        () => playingSource,
      );
      const resources = app.isPackaged
        ? process.resourcesPath
        : path.join(directory, 'resources');
      const adbExecutable = path.join(
        resources,
        'platform-tools',
        process.platform === 'win32' ? 'adb.exe' : 'adb',
      );
      setAdbExecutable(adbExecutable, { rememberDeviceGuard: true });
      controller = createController({
        dataDir: app.getPath('userData'),
        executeShell: (ip, command, options) =>
          runTvShell(adbExecutable, ip, command, options),
        onShellOutput: (output) => {
          if (window && !window.isDestroyed())
            window.webContents.send('toolkit:shell-output', output);
        },
        onProgress: (text) => {
          if (window && !window.isDestroyed())
            window.webContents.send('toolkit:progress', text);
        },
      });
      const catalog = createIptvCatalog({ dataDir: app.getPath('userData') });
      handle('toolkit:channels', (filters, refresh) =>
        catalog.query(filters, refresh),
      );
      handle('toolkit:favorite', (id, value) => catalog.favorite(id, value));
      handle('toolkit:source', async (channelId, sourceId) => {
        const request = ++sourceRequest;
        const source = await catalog.source(channelId, sourceId);
        if (request !== sourceRequest)
          throw new Error('Another channel was selected.');
        if (!streamUrl(source.url))
          throw new Error(
            'This source does not have a public HTTP or HTTPS stream.',
          );
        playingSource = source;
        return source;
      });
      handle('toolkit:stop', () => {
        sourceRequest++;
        playingSource = null;
      });
      handle('toolkit:initial', () => ({
        ...controller.initial(),
        version: app.getVersion(),
        platform: process.platform,
      }));
      handle('toolkit:connect', (ip) => controller.connect(ip));
      handle('toolkit:profiles', (request) => {
        if (updatingToolkit) throw new Error('Wait for the current task to finish.');
        return controller.profiles(request);
      });
      handle('toolkit:refresh', () => controller.refresh());
      handle('toolkit:updates', async (request) => {
        if (!request || typeof request !== 'object' || Array.isArray(request))
          throw new Error('Choose a supported update action.');
        if (request.operation === 'check-apps') return controller.checkUpdates();
        if (request.operation === 'install-app')
          return controller.installCheckedUpdate(request.id, confirmChanges);
        if (updatingToolkit || controller.isBusy()) throw new Error('Wait for the current task to finish.');
        updatingToolkit = true;
        try {
          if (request.operation === 'check-self') {
            checkedToolkitUpdate = await checkToolkitUpdate();
            return { installed: checkedToolkitUpdate.installed, tag: checkedToolkitUpdate.tag,
              comparison: checkedToolkitUpdate.comparison, checkedAt: checkedToolkitUpdate.checkedAt };
          }
          if (request.operation !== 'install-self') throw new Error('Choose a supported update action.');
          const approved = await dialog.showMessageBox(window, {
            type: 'question', message: 'Download and open the verified Toolkit installer?',
            detail: 'Complete the operating-system installer and reopen Toolkit. Your saved settings are retained. Installation is not complete until the new version runs.',
            buttons: ['Cancel', 'Download installer'], defaultId: 0, cancelId: 0,
          });
          if (approved.response !== 1) return { cancelled: true };
          const downloaded = await downloadDesktopUpdate(checkedToolkitUpdate);
          const error = await shell.openPath(downloaded.file);
          if (error) throw new Error(error);
          return { message: downloaded.message };
        } finally {
          updatingToolkit = false;
        }
      });
      handle('toolkit:advanced', (value) =>
        controller.setAdvanced(value, async () => {
          const result = await dialog.showMessageBox(window, {
            type: 'warning',
            title: 'Enable Advanced settings?',
            message:
              'Only enable Advanced settings if you know what you are doing.',
            detail:
              'Advanced settings reveal Activity and the TV terminal. Shell commands run directly on your connected Fire TV and can change settings, remove apps or erase data. If you do not understand these tools, do not enable them.',
            buttons: ['Cancel', 'I understand, enable'],
            defaultId: 0,
            cancelId: 0,
            noLink: true,
          });
          return result.response === 1;
        }),
      );
      handle('toolkit:shell', (command) => controller.shell(command));
      handle('toolkit:stop-shell', () => controller.stopShell());
      handle('toolkit:open-link', (name) => {
        const links = {
          repository: 'https://github.com/jeremykenedy/fire-tv-toolkit',
          license:
            'https://github.com/jeremykenedy/fire-tv-toolkit/blob/main/LICENSE',
          releases:
            'https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest',
        };
        if (!Object.hasOwn(links, name))
          throw new Error('Choose a supported link.');
        return shell.openExternal(links[name]);
      });
      handle('toolkit:assistant', (request) =>
        controller.assistant(request, confirmChanges),
      );
      handle('toolkit:action', (request) =>
        controller.action(request, confirmChanges),
      );
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === 'darwin'
            ? [
                {
                  label: app.name,
                  submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' },
                  ],
                },
              ]
            : []),
          {
            label: 'File',
            submenu: [
              {
                label: 'Remove desktop app...',
                click: () =>
                  uninstall().catch((error) =>
                    dialog.showErrorBox('Remove desktop app', message(error)),
                  ),
              },
              { type: 'separator' },
              { role: 'close' },
            ],
          },
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' },
              { role: 'redo' },
              { type: 'separator' },
              { role: 'cut' },
              { role: 'copy' },
              { role: 'paste' },
              { role: 'selectAll' },
            ],
          },
          {
            label: 'View',
            submenu: [
              { role: 'resetZoom' },
              { role: 'zoomIn' },
              { role: 'zoomOut' },
              { role: 'togglefullscreen' },
            ],
          },
          {
            label: 'Help',
            submenu: [
              {
                label: 'Fire TV setup guide',
                click: () =>
                  shell.openExternal(
                    'https://github.com/jeremykenedy/fire-tv-toolkit/blob/main/docs/SETUP.md',
                  ),
              },
            ],
          },
        ]),
      );
      createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox('Fire TV Toolkit could not start', message(error));
      app.quit();
    });
  app.on('before-quit', (event) => {
    if (controller?.isBusy()) {
      event.preventDefault();
      dialog.showMessageBox(window, {
        message: 'A TV task is still running.',
        detail: 'Wait for it to finish, then close Fire TV Toolkit.',
      });
    }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
