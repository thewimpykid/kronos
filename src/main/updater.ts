import { autoUpdater } from 'electron-updater'
import { Notification, app } from 'electron'

// Don't run update checks in dev — no GitHub release to compare against
export function initAutoUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    new Notification({
      title: 'Kronos Update Available',
      body: `Version ${info.version} is downloading in the background.`
    }).show()
  })

  autoUpdater.on('update-downloaded', () => {
    new Notification({
      title: 'Kronos Ready to Update',
      body: 'Update downloaded. It will install automatically when you quit Kronos.'
    }).show()
  })

  // Check on launch, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)
}
