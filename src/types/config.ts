export interface LocalConfig {
  apiKey: string
  apiEndpoint: string
  awsRegion: string
  updatedAt: string
}

export interface LocalConfigInput {
  apiKey: string
  apiEndpoint: string
  awsRegion: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
