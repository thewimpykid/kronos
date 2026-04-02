import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('overlayAPI', {
  onShow: (cb: (name: string, type: 'app' | 'site') => void) => {
    ipcRenderer.on('show-blocked', (_e, name: string, type: 'app' | 'site') => cb(name, type))
  }
})
