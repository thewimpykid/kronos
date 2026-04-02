import { Notification } from 'electron'
import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { logFocusSession } from './db'
import { showBlockOverlay } from './overlay'

interface FocusSession {
  label: string
  startTime: number
  endTime: number
  blockedApps: string[]   // lowercase process names
  blockedSites: string[]  // lowercase domains
}

// The minimize PowerShell script — written to a temp file once
const MINIMIZE_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KronosBlock {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
[KronosBlock]::ShowWindow([KronosBlock]::GetForegroundWindow(), 6)
`

let session: FocusSession | null = null
// Cooldown prevents hammering the same window within 1.5 seconds.
// It is cleared when the app/site loses focus so every intentional re-open gets blocked.
const blockCooldown = new Map<string, number>()
let sessionEndTimer: NodeJS.Timeout | null = null

export function initFocusModule() {
  const scriptPath = path.join(tmpdir(), 'kronos_minimize.ps1')
  writeFileSync(scriptPath, MINIMIZE_SCRIPT, 'utf8')
}

export function startFocusSession(
  label: string,
  durationMs: number,
  blockedApps: string[],
  blockedSites: string[] = []
) {
  if (session) endFocusSession()
  const now = Date.now()
  session = {
    label,
    startTime: now,
    endTime: now + durationMs,
    blockedApps: blockedApps.map(a => a.toLowerCase()),
    blockedSites: blockedSites.map(s => s.toLowerCase())
  }

  sessionEndTimer = setTimeout(() => {
    const completedLabel = session?.label
    endFocusSession()
    new Notification({
      title: 'Focus Session Complete',
      body: `Great work${completedLabel ? ` on "${completedLabel}"` : ''}! You stayed focused.`
    }).show()
  }, durationMs)
}

export function endFocusSession() {
  if (!session) return
  if (sessionEndTimer) { clearTimeout(sessionEndTimer); sessionEndTimer = null }
  const now = Date.now()
  logFocusSession(session.label, session.startTime, now, session.blockedApps)
  session = null
  blockCooldown.clear()
}

export function getFocusSession(): FocusSession | null {
  if (!session) return null
  if (Date.now() >= session.endTime) {
    endFocusSession()
    return null
  }
  return session
}

// Called by tracker when an app/site LOSES focus — clears its cooldown so
// the next time it gains focus it gets blocked immediately (not after 1.5s).
export function clearBlockCooldown(key: string) {
  blockCooldown.delete(key.toLowerCase())
}

function minimizeForeground() {
  const scriptPath = path.join(tmpdir(), 'kronos_minimize.ps1')
  exec(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`)
}

export function checkAndBlockApp(processName: string) {
  if (!session) return
  if (Date.now() >= session.endTime) { endFocusSession(); return }

  const lower = processName.toLowerCase()
  if (!session.blockedApps.includes(lower)) return

  const last = blockCooldown.get(lower) ?? 0
  if (Date.now() - last < 1500) return
  blockCooldown.set(lower, Date.now())

  minimizeForeground()
  showBlockOverlay(processName, 'app')
  new Notification({
    title: 'Focus Mode',
    body: `${processName} is blocked during your focus session.`
  }).show()
}

export function checkAndBlockSite(domain: string) {
  if (!session) return
  if (Date.now() >= session.endTime) { endFocusSession(); return }

  const lower = domain.toLowerCase()
  if (!session.blockedSites.includes(lower)) return

  const key = `site:${lower}`
  const last = blockCooldown.get(key) ?? 0
  if (Date.now() - last < 1500) return
  blockCooldown.set(key, Date.now())

  minimizeForeground()
  showBlockOverlay(domain, 'site')
  new Notification({
    title: 'Focus Mode',
    body: `${domain} is blocked during your focus session.`
  }).show()
}
