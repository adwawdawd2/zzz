const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getEnvApiKey: () => ipcRenderer.invoke('get-env-api-key'),
  processBatch: (payload) => ipcRenderer.invoke('process-batch', payload),
  onProgress: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('process-progress', listener);
    return () => ipcRenderer.removeListener('process-progress', listener);
  },
  loadImageBuffer: (filePath) => ipcRenderer.invoke('load-image-buffer', filePath),
  saveManualResult: (payload) => ipcRenderer.invoke('save-manual-result', payload),
});
