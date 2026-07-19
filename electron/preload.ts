import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import type { ApiResponse, DatabaseInfo } from '../src/types/config.js'
import type { LocalRequestPayload } from './local-service.js'

contextBridge.exposeInMainWorld('localDatabase', {
  request: (payload: LocalRequestPayload): Promise<ApiResponse<unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DATABASE_REQUEST, payload),
  getInfo: (): Promise<DatabaseInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.DATABASE_INFO),
})
