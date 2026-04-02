import { Notification } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import {
  closeAppSession,
  closeWebSession,
  getLimits,
  getTodayTotalFor,
  openAppSession,
  openWebSession
} from './db'
import { checkAndBlockApp, checkAndBlockSite, clearBlockCooldown } from './focus-session'

// ─── PowerShell script (written to a temp file to avoid -Command escaping issues) ──
// Output format per line: {pid}\t{processName}\t{windowTitle}\t{url}
// url is non-empty only when a browser is the active window
// Default idle threshold — 5 minutes of no mouse/keyboard = pause tracking
const IDLE_THRESHOLD_SEC = 5 * 60

const PS_SCRIPT_CONTENT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class KronosWin32 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);

    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO p);
    [DllImport("kernel32.dll")] public static extern uint GetTickCount();
}
"@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$IDLE_THRESHOLD_SEC = ${IDLE_THRESHOLD_SEC}
$BROWSERS = @('chrome','msedge','brave','opera','vivaldi','firefox','waterfox','librewolf','arc','chromium','iexplore')

function Get-IdleSeconds {
    $lii = New-Object KronosWin32+LASTINPUTINFO
    $lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
    [KronosWin32]::GetLastInputInfo([ref]$lii) | Out-Null
    return ([KronosWin32]::GetTickCount() - $lii.dwTime) / 1000.0
}

function Get-BrowserUrl([IntPtr]$hwnd) {
    try {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
        $names = @('Address and search bar','Address bar','Search or enter address','Search or type a URL')
        foreach ($name in $names) {
            $cond = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::NameProperty, $name)
            $el = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
            if ($el -ne $null) {
                $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
                return $vp.Current.Value
            }
        }
    } catch {}
    return ''
}

$tab = [char]9
$wasIdle = $false
$lastPid = [uint32]0
$lastTitle = ''

while ($true) {
    try {
        $idleSec = Get-IdleSeconds

        if ($idleSec -ge $IDLE_THRESHOLD_SEC) {
            # User is idle — signal once, then stay quiet
            if (-not $wasIdle) {
                Write-Output "IDLE"
                [Console]::Out.Flush()
                $wasIdle = $true
            }
            Start-Sleep -Milliseconds 1500
            continue
        }

        # User just came back from idle — reset so the active window is re-reported
        if ($wasIdle) {
            $wasIdle = $false
            $lastPid = [uint32]0
            $lastTitle = ''
        }

        $h = [KronosWin32]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 512
        [KronosWin32]::GetWindowText($h, $sb, 512) | Out-Null
        $title = $sb.ToString()
        $winPid = [uint32]0
        [KronosWin32]::GetWindowThreadProcessId($h, [ref]$winPid) | Out-Null
        $proc = Get-Process -Id $winPid -ErrorAction SilentlyContinue

        if ($proc -and ($winPid -ne $lastPid -or $title -ne $lastTitle)) {
            $url = ''
            if ($BROWSERS -contains $proc.ProcessName.ToLower()) {
                $url = Get-BrowserUrl $h
            }
            Write-Output "$winPid$tab$($proc.ProcessName)$tab$title$tab$url"
            [Console]::Out.Flush()
            $lastPid = $winPid
            $lastTitle = $title
        }
    } catch {}
    Start-Sleep -Milliseconds 1500
}
`

// ─── State ────────────────────────────────────────────────────────────────────

interface AppSession {
  id: number
  processName: string
}

interface WebSession {
  id: number
  url: string
  domain: string
}

let ps: ChildProcessWithoutNullStreams | null = null
let currentApp: AppSession | null = null
let currentWeb: WebSession | null = null
let notifiedToday: Set<string> = new Set()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url.startsWith('http') ? url : `https://${url}`)
    return hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function checkLimit(target: string, targetType: string) {
  const limits = getLimits().filter(
    (l) => l.enabled && l.target_type === targetType && l.target === target
  )
  for (const l of limits) {
    const used = getTodayTotalFor(l.target, targetType)
    if (used >= l.daily_limit_ms && !notifiedToday.has(l.target)) {
      notifiedToday.add(l.target)
      new Notification({
        title: 'Kronos — Limit Reached',
        body: `You've hit your daily limit for ${l.target}`
      }).show()
    }
  }
}

function scheduleNotificationReset() {
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  setTimeout(() => {
    notifiedToday.clear()
    scheduleNotificationReset()
  }, midnight.getTime() - Date.now())
}

// ─── Idle handler ─────────────────────────────────────────────────────────────
// Called when PowerShell emits "IDLE" — closes open sessions so idle time
// doesn't accumulate in the totals. Sessions reopen when the user returns.

function handleIdle() {
  if (currentApp) {
    closeAppSession(currentApp.id)
    currentApp = null
  }
  if (currentWeb) {
    closeWebSession(currentWeb.id)
    currentWeb = null
  }
}

// ─── Core handler (called on each active window line) ─────────────────────────

function handleTick(processName: string, title: string, url: string) {
  // ── App session ──────────────────────────────────────────────────────────
  if (currentApp?.processName !== processName) {
    if (currentApp) {
      closeAppSession(currentApp.id)
      // App lost focus — clear its cooldown so next time it gains focus it blocks immediately
      clearBlockCooldown(currentApp.processName)
    }
    const id = openAppSession(processName, title)
    currentApp = { id, processName }
    checkLimit(processName, 'app')
  }

  // Check focus session blocking
  checkAndBlockApp(processName)

  // ── Web session ──────────────────────────────────────────────────────────
  // Chrome/Edge strip the https:// prefix in the address bar, so we just check non-empty
  const isBrowserWithUrl = url.length > 0

  if (isBrowserWithUrl) {
    const domain = extractDomain(url)

    if (currentWeb?.domain !== domain) {
      if (currentWeb) {
        closeWebSession(currentWeb.id)
        // Site lost focus — clear its cooldown so next visit blocks immediately
        clearBlockCooldown(`site:${currentWeb.domain}`)
      }
      const id = openWebSession(url, domain, title, processName)
      currentWeb = { id, url, domain }
      checkLimit(domain, 'website')
    }
    checkAndBlockSite(domain)
  } else {
    // Switched away from a browser tab
    if (currentWeb) {
      closeWebSession(currentWeb.id)
      currentWeb = null
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function startTracker() {
  scheduleNotificationReset()

  // Write script to a temp file — avoids all -Command argument escaping issues
  const scriptPath = path.join(tmpdir(), 'kronos_tracker.ps1')
  writeFileSync(scriptPath, PS_SCRIPT_CONTENT, 'utf8')

  ps = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let buf = ''
  ps.stdout.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed === 'IDLE') {
        handleIdle()
        continue
      }
      const parts = trimmed.split('\t')
      if (parts.length >= 2) {
        const processName = parts[1].trim()
        const title = parts[2]?.trim() ?? ''
        const url = parts[3]?.trim() ?? ''
        if (processName) handleTick(processName, title, url)
      }
    }
  })

  ps.stderr?.on('data', (chunk: Buffer) => {
    console.error('[tracker] PowerShell error:', chunk.toString().trim())
  })

  ps.on('exit', (code) => {
    console.log('[tracker] PowerShell exited with code', code)
    if (code !== 0 && code !== null) {
      setTimeout(startTracker, 3000)
    }
  })
}

export function stopTracker() {
  if (currentApp) {
    closeAppSession(currentApp.id)
    currentApp = null
  }
  if (currentWeb) {
    closeWebSession(currentWeb.id)
    currentWeb = null
  }
  ps?.kill()
  ps = null
}
