import { ipcMain } from 'electron'
import {
  deleteLimit,
  getAppDailyForRange,
  getAppHourlyToday,
  getAppStatsForRange,
  getLimits,
  getTodayGlasses,
  getTodayEyeBreaks,
  getTodayTotalFor,
  getTrackedAppsToday,
  getTrackedSitesToday,
  getWebStatsForRange,
  logGlass,
  logEyeBreak,
  todayStart,
  upsertLimit
} from './db'
import { getFocusSession, startFocusSession, endFocusSession } from './focus-session'
import { getWaterSettings, setWaterSettings } from './water-reminder'
import { getEyeSettings, setEyeSettings } from './eye-reminder'

export function registerIpcHandlers() {
  // Today's stats
  ipcMain.handle('get-stats-today', () => {
    const start = todayStart()
    const end = Date.now()
    const hourly = getAppHourlyToday()
    return {
      apps: getAppStatsForRange(start, end),
      websites: getWebStatsForRange(start, end),
      hourly,
      screenTime: hourly.reduce((a, b) => a + b.total_ms, 0)
    }
  })

  // Range stats (for weekly view, etc.)
  ipcMain.handle('get-stats-range', (_e, startMs: number, endMs: number) => {
    return {
      apps: getAppStatsForRange(startMs, endMs),
      websites: getWebStatsForRange(startMs, endMs)
    }
  })

  // Weekly timeline — daily buckets for the past 7 days
  ipcMain.handle('get-weekly-timeline', () => {
    const end = Date.now()
    const start = todayStart() - 6 * 86400000
    return getAppDailyForRange(start, end)
  })

  // Limits
  ipcMain.handle('get-limits', () => {
    const limits = getLimits()
    // Attach today's usage to each limit
    return limits.map((l) => ({
      ...l,
      used_today_ms: getTodayTotalFor(l.target, l.target_type)
    }))
  })

  ipcMain.handle(
    'upsert-limit',
    (_e, target: string, targetType: string, dailyLimitMs: number) => {
      upsertLimit(target, targetType, dailyLimitMs)
    }
  )

  ipcMain.handle('delete-limit', (_e, id: number) => {
    deleteLimit(id)
  })

  // Focus session handlers
  ipcMain.handle('get-focus-session', () => {
    const s = getFocusSession()
    if (!s) return null
    return { ...s, remainingMs: Math.max(0, s.endTime - Date.now()) }
  })

  ipcMain.handle('start-focus-session', (_e, label: string, durationMs: number, blockedApps: string[], blockedSites: string[]) => {
    startFocusSession(label, durationMs, blockedApps, blockedSites)
  })

  ipcMain.handle('end-focus-session', () => {
    endFocusSession()
  })

  // Water reminder handlers
  ipcMain.handle('get-water-settings', () => getWaterSettings())
  ipcMain.handle('set-water-settings', (_e, enabled: boolean, intervalMs: number) => {
    setWaterSettings(enabled, intervalMs)
  })

  // Water log
  ipcMain.handle('log-glass', () => logGlass())
  ipcMain.handle('get-today-glasses', () => getTodayGlasses())

  // Eye reminder handlers
  ipcMain.handle('get-eye-settings', () => getEyeSettings())
  ipcMain.handle('set-eye-settings', (_e, enabled: boolean, intervalMs: number) => {
    setEyeSettings(enabled, intervalMs)
  })
  ipcMain.handle('log-eye-break', () => logEyeBreak())
  ipcMain.handle('get-today-eye-breaks', () => getTodayEyeBreaks())

  // Tracked today (for quick-add limits)
  ipcMain.handle('get-tracked-today', () => ({
    apps: getTrackedAppsToday(),
    sites: getTrackedSitesToday()
  }))
}
