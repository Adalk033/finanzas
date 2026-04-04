import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import type { LocalConfig, LocalConfigInput } from '../src/types/config.js'

type ApiProxyRequestPayload = {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

type ApiProxyResponsePayload = {
  ok: boolean
  status: number
  bodyText: string
}

contextBridge.exposeInMainWorld('localConfig', {
  getConfig: (): Promise<LocalConfig | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_CONFIG),
  saveConfig: (config: LocalConfigInput): Promise<LocalConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_LOCAL_CONFIG, config),
})

contextBridge.exposeInMainWorld('apiProxy', {
  request: (payload: ApiProxyRequestPayload): Promise<ApiProxyResponsePayload> =>
    ipcRenderer.invoke(IPC_CHANNELS.API_PROXY_REQUEST, payload),
})
