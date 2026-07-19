export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface DatabaseInfo {
  path: string
  schemaVersion: string
  journalMode: string
  banks: number
  instruments: number
  transactions: number
}
