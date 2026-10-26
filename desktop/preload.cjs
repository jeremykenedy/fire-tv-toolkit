const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toolkit', {
  initial: () => ipcRenderer.invoke('toolkit:initial'),
  connect: (ip) => ipcRenderer.invoke('toolkit:connect', ip),
  profiles: (request) => ipcRenderer.invoke('toolkit:profiles', request),
  refresh: () => ipcRenderer.invoke('toolkit:refresh'),
  updates: (request) => ipcRenderer.invoke('toolkit:updates', request),
  action: (request) => ipcRenderer.invoke('toolkit:action', request),
  assistant: (request) => ipcRenderer.invoke('toolkit:assistant', request),
  openLink: (name) => ipcRenderer.invoke('toolkit:open-link', name),
  advanced: (value) => ipcRenderer.invoke('toolkit:advanced', value),
  shell: (command) => ipcRenderer.invoke('toolkit:shell', command),
  stopShell: () => ipcRenderer.invoke('toolkit:stop-shell'),
  onShellOutput: (callback) => {
    const listener = (_event, output) => callback(output);
    ipcRenderer.on('toolkit:shell-output', listener);
    return () => ipcRenderer.removeListener('toolkit:shell-output', listener);
  },
  channels: (filters, refresh) =>
    ipcRenderer.invoke('toolkit:channels', filters, refresh),
  favorite: (id, value) => ipcRenderer.invoke('toolkit:favorite', id, value),
  source: (channelId, sourceId) =>
    ipcRenderer.invoke('toolkit:source', channelId, sourceId),
  stop: () => ipcRenderer.invoke('toolkit:stop'),
  onProgress: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('toolkit:progress', listener);
    return () => ipcRenderer.removeListener('toolkit:progress', listener);
  },
});
