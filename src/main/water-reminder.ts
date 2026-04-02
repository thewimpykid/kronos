import { Notification } from 'electron'
import { getSetting, setSetting } from './db'

let timer: NodeJS.Timeout | null = null
let nextReminderTime = 0

export function startWaterReminder() {
  const enabled = getSetting('water_enabled', '0') === '1'
  const intervalMs = parseInt(getSetting('water_interval_ms', String(60 * 60 * 1000)))

  if (timer) { clearInterval(timer); timer = null }
  if (!enabled) return

  nextReminderTime = Date.now() + intervalMs
  timer = setInterval(() => {
    nextReminderTime = Date.now() + intervalMs
    new Notification({
      title: '💧 Hydration Check',
      body: 'Time to drink a glass of water! Stay hydrated.'
    }).show()
  }, intervalMs)
}

export function stopWaterReminder() {
  if (timer) { clearInterval(timer); timer = null }
}

export function getNextReminderTime(): number {
  return nextReminderTime
}

export function setWaterSettings(enabled: boolean, intervalMs: number) {
  setSetting('water_enabled', enabled ? '1' : '0')
  setSetting('water_interval_ms', String(intervalMs))
  startWaterReminder()  // restart with new settings
}

export function getWaterSettings(): { enabled: boolean; intervalMs: number; nextAt: number } {
  return {
    enabled: getSetting('water_enabled', '0') === '1',
    intervalMs: parseInt(getSetting('water_interval_ms', String(60 * 60 * 1000))),
    nextAt: nextReminderTime
  }
}
