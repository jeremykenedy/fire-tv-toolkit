const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toolkit', {
  initial: () => ipcRenderer.invoke('toolkit:initial'),
  connect: (ip) => ipcRenderer.invoke('toolkit:connect', ip),
  refresh: () => ipcRenderer.invoke('toolkit:refresh'),
  action: (request) => ipcRenderer.invoke('toolkit:action', request),
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
