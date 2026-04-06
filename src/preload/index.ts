import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('kronos', {
  getStatsToday:     () => ipcRenderer.invoke('get-stats-today'),
  getStatsRange:     (s: number, e: number) => ipcRenderer.invoke('get-stats-range', s, e),
  getLimits:         () => ipcRenderer.invoke('get-limits'),
  upsertLimit:       (t: string, tt: string, ms: number) => ipcRenderer.invoke('upsert-limit', t, tt, ms),
  deleteLimit:       (id: number) => ipcRenderer.invoke('delete-limit', id),
  getFocusSession:   () => ipcRenderer.invoke('get-focus-session'),
  startFocusSession: (label: string, durationMs: number, blockedApps: string[], blockedSites: string[]) =>
    ipcRenderer.invoke('start-focus-session', label, durationMs, blockedApps, blockedSites),
  endFocusSession:   () => ipcRenderer.invoke('end-focus-session'),
  getWaterSettings:  () => ipcRenderer.invoke('get-water-settings'),
  setWaterSettings:  (enabled: boolean, intervalMs: number) =>
    ipcRenderer.invoke('set-water-settings', enabled, intervalMs),
  logGlass:          () => ipcRenderer.invoke('log-glass'),
  getTodayGlasses:   () => ipcRenderer.invoke('get-today-glasses'),
  getEyeSettings:    () => ipcRenderer.invoke('get-eye-settings'),
  setEyeSettings:    (enabled: boolean, intervalMs: number) =>
    ipcRenderer.invoke('set-eye-settings', enabled, intervalMs),
  logEyeBreak:       () => ipcRenderer.invoke('log-eye-break'),
  getTodayEyeBreaks: () => ipcRenderer.invoke('get-today-eye-breaks'),
  getTrackedToday:      () => ipcRenderer.invoke('get-tracked-today'),
  getWeeklyTimeline:    () => ipcRenderer.invoke('get-weekly-timeline'),
})
