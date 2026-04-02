import { BrowserWindow, screen } from 'electron'
import path from 'path'

let overlayWin: BrowserWindow | null = null
let hideTimer: NodeJS.Timeout | null = null

function getOverlayPreload() {
  return path.join(__dirname, '../preload/overlay.js')
}

function getOverlayURL() {
  if (process.env['ELECTRON_RENDERER_URL']) {
    return process.env['ELECTRON_RENDERER_URL'] + '/overlay.html'
  }
  return 'file://' + path.join(__dirname, '../renderer/overlay.html')
}

export function createOverlayWindow() {
  if (overlayWin && !overlayWin.isDestroyed()) return

  const { width } = screen.getPrimaryDisplay().workAreaSize

  overlayWin = new BrowserWindow({
    width: 380,
    height: 130,
    x: Math.round(width / 2) - 190,
    y: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: getOverlayPreload(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.loadURL(getOverlayURL())

  overlayWin.on('closed', () => {
    overlayWin = null
  })
}

export function showBlockOverlay(name: string, type: 'app' | 'site') {
  if (!overlayWin || overlayWin.isDestroyed()) {
    createOverlayWindow()
    // Wait for window to load before sending IPC
    overlayWin!.webContents.once('did-finish-load', () => {
      overlayWin?.showInactive()
      overlayWin?.webContents.send('show-blocked', name, type)
    })
  } else {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    overlayWin.showInactive()
    overlayWin.webContents.send('show-blocked', name, type)
  }

  // Auto-hide after 3.5s (slightly longer than the card animation)
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    overlayWin?.hide()
  }, 3500)
}
