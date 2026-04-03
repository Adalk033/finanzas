import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import type { LocalConfig, LocalConfigInput } from '../src/types/config.js'

contextBridge.exposeInMainWorld('localConfig', {
  getConfig: (): Promise<LocalConfig | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_CONFIG),
  saveConfig: (config: LocalConfigInput): Promise<LocalConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_LOCAL_CONFIG, config),
})
