const { contextBridge, ipcRenderer } = require('electron')

const IPC_CHANNELS = {
  GET_LOCAL_CONFIG: 'local-config:get',
  SAVE_LOCAL_CONFIG: 'local-config:save',
}

contextBridge.exposeInMainWorld('localConfig', {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_CONFIG),
  saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_LOCAL_CONFIG, config),
})
