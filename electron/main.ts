import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import {
  getLocalConfig,
  initializeLocalDb,
  saveLocalConfig,
} from './local-db.js'
import type { LocalConfigInput } from '../src/types/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0f1218',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_LOCAL_CONFIG, () => getLocalConfig())

  ipcMain.handle(
    IPC_CHANNELS.SAVE_LOCAL_CONFIG,
    (_event, config: LocalConfigInput) => saveLocalConfig(config),
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
