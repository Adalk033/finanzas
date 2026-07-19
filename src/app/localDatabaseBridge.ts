import type { ApiResponse, DatabaseInfo } from '../types/config'

export type LocalRequestPayload = {
  path: string
  method?: string
  body?: string
}

export type LocalDatabaseBridge = {
  request: (payload: LocalRequestPayload) => Promise<ApiResponse<unknown>>
  getInfo: () => Promise<DatabaseInfo>
}

type ElectronWindow = Window & {
  localDatabase?: LocalDatabaseBridge
}

export const MISSING_DATABASE_BRIDGE_MESSAGE =
  'No se encontro la base de datos local. Abre la aplicacion de escritorio.'

export function getLocalDatabaseBridge(): LocalDatabaseBridge | null {
  return (window as ElectronWindow).localDatabase ?? null
}
