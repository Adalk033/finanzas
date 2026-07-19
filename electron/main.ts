import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import { closeLocalDb, initializeLocalDb } from './local-db.js'
import {
  getLocalDatabaseInfo,
  handleLocalRequest,
  type LocalRequestPayload,
} from './local-service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const hasInstanceLock = app.requestSingleInstanceLock()

if (!hasInstanceLock) {
  app.quit()
}

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
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0f1218',
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function removeObsoleteConnectionDatabase(userDataPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const obsoletePath = path.join(userDataPath, `config.sqlite${suffix}`)
    if (fs.existsSync(obsoletePath)) {
      fs.rmSync(obsoletePath, { force: true })
    }
  }
}

function protectDatabaseFiles(dbPath: string): void {
  if (process.platform === 'win32') {
    return
  }
  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = `${dbPath}${suffix}`
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o600)
    }
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.DATABASE_REQUEST,
    (_event, payload: LocalRequestPayload) => handleLocalRequest(payload),
  )
  ipcMain.handle(IPC_CHANNELS.DATABASE_INFO, () => getLocalDatabaseInfo())
}

app.whenReady().then(() => {
  if (!hasInstanceLock) {
    return
  }
  const userDataPath = app.getPath('userData')
  removeObsoleteConnectionDatabase(userDataPath)
  const dbPath = path.join(userDataPath, 'finanzas.sqlite')
  initializeLocalDb(dbPath)
  protectDatabaseFiles(dbPath)
  registerIpcHandlers()
  createMainWindow()

  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('before-quit', () => {
  closeLocalDb()
})

app.on('window-all-closed', () => {
  app.quit()
})
