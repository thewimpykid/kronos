import { Notification } from 'electron'
import { getSetting, setSetting, logEyeBreak } from './db'

let timer: NodeJS.Timeout | null = null
let nextReminderTime = 0

export function startEyeReminder() {
  const enabled = getSetting('eye_enabled', '0') === '1'
  const intervalMs = parseInt(getSetting('eye_interval_ms', String(20 * 60 * 1000)))

  if (timer) { clearInterval(timer); timer = null }
  if (!enabled) return

  nextReminderTime = Date.now() + intervalMs
  timer = setInterval(() => {
    nextReminderTime = Date.now() + intervalMs
    logEyeBreak()
    new Notification({
      title: '👁️ Eye Break',
      body: 'Look at something 20 feet away for 20 seconds to reduce eye strain.'
    }).show()
  }, intervalMs)
}

export function stopEyeReminder() {
  if (timer) { clearInterval(timer); timer = null }
}

export function getNextEyeReminderTime(): number {
  return nextReminderTime
}

export function setEyeSettings(enabled: boolean, intervalMs: number) {
  setSetting('eye_enabled', enabled ? '1' : '0')
  setSetting('eye_interval_ms', String(intervalMs))
  startEyeReminder()
}

export function getEyeSettings(): { enabled: boolean; intervalMs: number; nextAt: number } {
  return {
    enabled: getSetting('eye_enabled', '0') === '1',
    intervalMs: parseInt(getSetting('eye_interval_ms', String(20 * 60 * 1000))),
    nextAt: nextReminderTime
  }
}
