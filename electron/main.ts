import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import {
  getLocalConfig,
  initializeLocalDb,
  saveLocalConfig,
} from './local-db.js'
import type { LocalConfigInput } from '../src/types/config.js'

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.cjs'),
  ]

  const resolved = candidates.find((candidate) => fs.existsSync(candidate))

  if (!resolved) {
    throw new Error('No se encontro preload.cjs para inicializar el bridge de Electron.')
  }

  return resolved
}

function createMainWindow(): void {
  const preloadPath = resolvePreloadPath()

  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0f1218',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function assertHttpsUrl(value: string): void {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('El endpoint no es una URL valida.')
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('El endpoint debe usar HTTPS.')
  }
}

function normalizeApiProxyPayload(payload: ApiProxyRequestPayload): Required<ApiProxyRequestPayload> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload de proxy API invalido.')
  }

  const pathValue = typeof payload.path === 'string' ? payload.path.trim() : ''

  if (!pathValue.startsWith('/')) {
    throw new Error('La ruta del proxy API debe iniciar con "/".')
  }

  const method = (typeof payload.method === 'string' ? payload.method : 'GET').toUpperCase()
  const headers = payload.headers ?? {}
  const body = typeof payload.body === 'string' ? payload.body : ''

  return {
    path: pathValue,
    method,
    headers,
    body,
  }
}

async function handleApiProxyRequest(payload: ApiProxyRequestPayload): Promise<ApiProxyResponsePayload> {
  const config = getLocalConfig()

  if (!config) {
    throw new Error('Primero configura API Key, endpoint y region en Settings.')
  }

  assertHttpsUrl(config.apiEndpoint)

  const normalized = normalizeApiProxyPayload(payload)
  const baseUrl = config.apiEndpoint.replace(/\/$/, '')

  const response = await fetch(`${baseUrl}${normalized.path}`, {
    method: normalized.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'x-client-version': 'phase0',
      ...normalized.headers,
    },
    body: normalized.body || undefined,
  })

  return {
    ok: response.ok,
    status: response.status,
    bodyText: await response.text(),
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_LOCAL_CONFIG, () => getLocalConfig())

  ipcMain.handle(
    IPC_CHANNELS.SAVE_LOCAL_CONFIG,
    (_event, config: LocalConfigInput) => saveLocalConfig(config),
  )

  ipcMain.handle(
    IPC_CHANNELS.API_PROXY_REQUEST,
    (_event, payload: ApiProxyRequestPayload) => handleApiProxyRequest(payload),
  )
}

app.whenReady().then(() => {
  initializeLocalDb(path.join(app.getPath('userData'), 'config.sqlite'))
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
