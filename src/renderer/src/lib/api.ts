// Typed wrappers around the contextBridge API

export interface AppStat    { process_name: string; total_ms: number }
export interface WebStat    { domain: string; total_ms: number }
export interface HourBucket { hour: number; total_ms: number }
export interface DayBucket  { dayStart: number; total_ms: number }
export interface StatsToday { apps: AppStat[]; websites: WebStat[]; hourly: HourBucket[]; screenTime: number }
export interface StatsRange { apps: AppStat[]; websites: WebStat[] }

export interface LimitWithUsage {
  id: number
  target: string
  target_type: string
  daily_limit_ms: number
  enabled: number
  used_today_ms: number
}

export interface FocusSessionInfo {
  label: string
  startTime: number
  endTime: number
  blockedApps: string[]
  blockedSites: string[]
  remainingMs: number
}

export interface WaterSettings {
  enabled: boolean
  intervalMs: number
  nextAt: number
}

export interface EyeSettings {
  enabled: boolean
  intervalMs: number
  nextAt: number
}

export interface TrackedToday {
  apps:  { process_name: string; total_ms: number }[]
  sites: { domain: string; total_ms: number }[]
}

declare global {
  interface Window {
    kronos: {
      getStatsToday:      () => Promise<StatsToday>
      getStatsRange:      (startMs: number, endMs: number) => Promise<StatsRange>
      getLimits:          () => Promise<LimitWithUsage[]>
      upsertLimit:        (target: string, targetType: string, dailyLimitMs: number) => Promise<void>
      deleteLimit:        (id: number) => Promise<void>
      getFocusSession:    () => Promise<FocusSessionInfo | null>
      startFocusSession:  (label: string, durationMs: number, blockedApps: string[], blockedSites: string[]) => Promise<void>
      endFocusSession:    () => Promise<void>
      getWaterSettings:   () => Promise<WaterSettings>
      setWaterSettings:   (enabled: boolean, intervalMs: number) => Promise<void>
      logGlass:           () => Promise<void>
      getTodayGlasses:    () => Promise<number[]>
      getEyeSettings:     () => Promise<EyeSettings>
      setEyeSettings:     (enabled: boolean, intervalMs: number) => Promise<void>
      logEyeBreak:        () => Promise<void>
      getTodayEyeBreaks:  () => Promise<number[]>
      getTrackedToday:    () => Promise<TrackedToday>
      getWeeklyTimeline:  () => Promise<DayBucket[]>
    }
  }
}

export function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export const api = window.kronos
