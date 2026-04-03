import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { startTracker, stopTracker } from './tracker'
import { initFocusModule } from './focus-session'
import { startWaterReminder, stopWaterReminder } from './water-reminder'
import { startEyeReminder, stopEyeReminder } from './eye-reminder'
import { createOverlayWindow } from './overlay'
import { getAppIcon, getTrayIcon } from './appicon'
import { initAutoUpdater } from './updater'

// Must be set before app is ready — makes Windows show "Kronos" in notifications
// and the taskbar instead of "Electron"
app.name = 'Kronos'
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kronos.screentimetracker')
}

// Enforce single instance — if a second instance launches, focus the first and quit.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Remove the default File/Edit/View/Window/Help menu bar
Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Kronos',
    icon: getAppIcon(),
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function createTray() {
  tray = new Tray(getTrayIcon())
  const menu = Menu.buildFromTemplate([
    { label: 'Open Kronos', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setToolTip('Kronos — Screen Time Tracker')
  tray.setContextMenu(menu)
  tray.on('click', () => mainWindow?.show())
}

// If a second instance tries to launch, bring the existing window to the front
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  initFocusModule()
  initAutoUpdater()
  startWaterReminder()
  startEyeReminder()
  startTracker()
  createWindow()
  createTray()
  createOverlayWindow()
})

app.on('before-quit', () => {
  stopTracker()
  stopWaterReminder()
  stopEyeReminder()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') return
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
