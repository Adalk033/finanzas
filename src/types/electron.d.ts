import type { ApiResponse, DatabaseInfo } from './config'

type LocalRequestPayload = {
  path: string
  method?: string
  body?: string
}

type LocalDatabaseBridge = {
  request: (payload: LocalRequestPayload) => Promise<ApiResponse<unknown>>
  getInfo: () => Promise<DatabaseInfo>
}

declare global {
  interface Window {
    localDatabase?: LocalDatabaseBridge
  }
}

export {}
