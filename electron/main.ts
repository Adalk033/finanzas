import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Notification, type IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from './ipc-channels.js'
import {
  backupLocalDb,
  closeLocalDb,
  initializeLocalDb,
  restoreLocalDb,
} from './local-db.js'
import {
  getLocalDatabaseInfo,
  exportTransactionsCsv,
  getDueReminderNotifications,
  handleLocalRequest,
  importTransactionsCsv,
  runLocalMaintenance,
  type LocalRequestPayload,
} from './local-service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const hasInstanceLock = app.requestSingleInstanceLock()
const shownNotificationIds = new Set<number>()

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
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function isTrustedIpcEvent(event: IpcMainInvokeEvent): boolean {
  if (event.senderFrame !== event.sender.mainFrame) return false
  const url = event.senderFrame?.url ?? ''
  if (url.startsWith('file://')) return true
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (!devServerUrl) return false
  try {
    return new URL(url).origin === new URL(devServerUrl).origin
  } catch {
    return false
  }
}

function assertTrustedIpcEvent(event: IpcMainInvokeEvent): void {
  if (!isTrustedIpcEvent(event)) {
    throw new Error('Origen IPC no autorizado.')
  }
}

function showDueNotifications(): void {
  if (!Notification.isSupported()) return
  for (const reminder of getDueReminderNotifications()) {
    if (shownNotificationIds.has(reminder.id)) continue
    shownNotificationIds.add(reminder.id)
    const notification = new Notification({
      title: reminder.title,
      body: reminder.body || 'Tienes un recordatorio financiero pendiente.',
      silent: true,
    })
    notification.on('click', () => {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow?.show()
      mainWindow?.focus()
    })
    notification.show()
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
    (event, payload: LocalRequestPayload) => {
      assertTrustedIpcEvent(event)
      const response = handleLocalRequest(payload)
      showDueNotifications()
      return response
    },
  )
  ipcMain.handle(IPC_CHANNELS.DATABASE_INFO, (event) => {
    assertTrustedIpcEvent(event)
    return getLocalDatabaseInfo()
  })
  ipcMain.handle(IPC_CHANNELS.DATABASE_BACKUP, async (event) => {
    assertTrustedIpcEvent(event)
    const result = await dialog.showSaveDialog({
      title: 'Guardar respaldo de Finanzas Lit',
      defaultPath: `finanzas-lit-${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
    })
    if (result.canceled || !result.filePath) return { success: true, canceled: true }
    try {
      await backupLocalDb(result.filePath)
      return { success: true, path: result.filePath }
    } catch {
      return { success: false, error: 'No se pudo crear el respaldo.' }
    }
  })
  ipcMain.handle(IPC_CHANNELS.DATABASE_RESTORE, async (event) => {
    assertTrustedIpcEvent(event)
    const result = await dialog.showOpenDialog({
      title: 'Restaurar respaldo de Finanzas Lit',
      properties: ['openFile'],
      filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { success: true, canceled: true }
    try {
      restoreLocalDb(result.filePaths[0])
      runLocalMaintenance()
      return { success: true }
    } catch {
      return { success: false, error: 'El respaldo no es valido o no pudo restaurarse.' }
    }
  })
  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_EXPORT_CSV, async (event) => {
    assertTrustedIpcEvent(event)
    const result = await dialog.showSaveDialog({
      title: 'Exportar movimientos',
      defaultPath: `movimientos-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return { success: true, canceled: true }
    try {
      fs.writeFileSync(result.filePath, exportTransactionsCsv(), { encoding: 'utf8', mode: 0o600 })
      return { success: true, path: result.filePath }
    } catch {
      return { success: false, error: 'No se pudieron exportar los movimientos.' }
    }
  })
  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_IMPORT_CSV, async (event) => {
    assertTrustedIpcEvent(event)
    const result = await dialog.showOpenDialog({
      title: 'Importar movimientos',
      properties: ['openFile'],
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { success: true, canceled: true }
    try {
      const stat = fs.statSync(result.filePaths[0])
      if (stat.size > 20 * 1024 * 1024) {
        return { success: false, error: 'El archivo CSV supera el limite de 20 MB.' }
      }
      return {
        success: true,
        ...importTransactionsCsv(fs.readFileSync(result.filePaths[0], 'utf8')),
      }
    } catch {
      return { success: false, error: 'El CSV no es valido o no pudo importarse.' }
    }
  })
}

void app.whenReady().then(() => {
  if (!hasInstanceLock) {
    return
  }
  const userDataPath = app.getPath('userData')
  if (process.platform !== 'win32') {
    process.umask(0o077)
  }
  removeObsoleteConnectionDatabase(userDataPath)
  const dbPath = path.join(userDataPath, 'finanzas.sqlite')
  initializeLocalDb(dbPath)
  protectDatabaseFiles(dbPath)
  runLocalMaintenance()
  registerIpcHandlers()
  createMainWindow()
  showDueNotifications()

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
}).catch(() => {
  dialog.showErrorBox(
    'Finanzas Lit no pudo iniciar',
    'No se pudo abrir o actualizar la base de datos local. Tus archivos no fueron eliminados.',
  )
  app.quit()
})

app.on('before-quit', () => {
  closeLocalDb()
})

app.on('window-all-closed', () => {
  app.quit()
})
