import type { ApiResponse, DatabaseInfo } from './config'

type LocalRequestPayload = {
  path: string
  method?: string
  body?: string
}

type LocalDatabaseBridge = {
  request: (payload: LocalRequestPayload) => Promise<ApiResponse<unknown>>
  getInfo: () => Promise<DatabaseInfo>
  backup: () => Promise<FileActionResult>
  restore: () => Promise<FileActionResult>
  exportCsv: () => Promise<FileActionResult>
  importCsv: () => Promise<FileActionResult>
}

type FileActionResult = {
  success: boolean
  canceled?: boolean
  path?: string
  imported?: number
  skipped?: number
  error?: string
}

declare global {
  interface Window {
    localDatabase?: LocalDatabaseBridge
  }
}

export {}
