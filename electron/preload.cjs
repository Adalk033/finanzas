const { contextBridge, ipcRenderer } = require('electron')

const IPC_CHANNELS = {
  GET_LOCAL_CONFIG: 'local-config:get',
  SAVE_LOCAL_CONFIG: 'local-config:save',
  API_PROXY_REQUEST: 'api:proxy-request',
}

contextBridge.exposeInMainWorld('localConfig', {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_CONFIG),
  saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_LOCAL_CONFIG, config),
})

contextBridge.exposeInMainWorld('apiProxy', {
  request: (payload) => ipcRenderer.invoke(IPC_CHANNELS.API_PROXY_REQUEST, payload),
})
