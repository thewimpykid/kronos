import { useEffect, useState } from 'react'
import { api, fmtCountdown, EyeSettings } from '../lib/api'

const INTERVALS = [
  { label: '15 min', ms: 15 * 60_000 },
  { label: '20 min', ms: 20 * 60_000 },
  { label: '25 min', ms: 25 * 60_000 },
  { label: '30 min', ms: 30 * 60_000 },
]

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 40 28" width="36" height="26" style={{ display: 'block' }}>
      <ellipse
        cx="20" cy="14" rx="18" ry="12"
        fill={active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)'}
        stroke={active ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}
        strokeWidth="1.5"
      />
      <circle
        cx="20" cy="14" r="6"
        fill={active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}
        stroke={active ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="1.5"
      />
      <circle
        cx="20" cy="14" r="2.5"
        fill={active ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}
      />
    </svg>
  )
}

export default function EyeBreak() {
  const [settings, setSettings] = useState<EyeSettings | null>(null)
  const [breaks, setBreaks] = useState<number[]>([])
  const [nextIn, setNextIn] = useState(0)
  const [logging, setLogging] = useState(false)

  async function load() {
    const [s, b] = await Promise.all([api.getEyeSettings(), api.getTodayEyeBreaks()])
    setSettings(s)
    setBreaks(b)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!settings?.enabled) { setNextIn(0); return }
    const id = setInterval(() => {
      setNextIn(Math.max(0, settings.nextAt - Date.now()))
    }, 1000)
    setNextIn(Math.max(0, settings.nextAt - Date.now()))
    return () => clearInterval(id)
  }, [settings])

  async function handleLogBreak() {
    setLogging(true)
    await api.logEyeBreak()
    await load()
    setLogging(false)
  }

  async function toggle() {
    if (!settings) return
    await api.setEyeSettings(!settings.enabled, settings.intervalMs)
    load()
  }

  async function changeInterval(ms: number) {
    if (!settings) return
    await api.setEyeSettings(settings.enabled, ms)
    load()
  }

  const count = breaks.length

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Progress ring for countdown
  const intervalMs = settings?.intervalMs ?? 20 * 60_000
  const elapsed = settings?.enabled && settings.nextAt > 0
    ? Math.max(0, intervalMs - nextIn)
    : 0
  const pct = settings?.enabled ? Math.min(100, (elapsed / intervalMs) * 100) : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = circumference - (pct / 100) * circumference

  return (
    <>
      <div className="page-header">
        <div className="page-title">Eye Break</div>
        <div className="page-subtitle">20-20-20 rule — every 20 min, look 20 ft away for 20 sec</div>
      </div>

      {/* Hero card */}
      <div className="card water-hero-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>

          {/* Countdown ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="64" cy="64" r={radius}
                fill="none"
                stroke="var(--surface3)"
                strokeWidth="8"
              />
              <circle
                cx="64" cy="64" r={radius}
                fill="none"
                stroke={settings?.enabled ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dash}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              {settings?.enabled && nextIn > 0 ? (
                <>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--accent)',
                    letterSpacing: -0.5
                  }}>
                    {fmtCountdown(nextIn)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>next break</span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '0 8px' }}>
                  {settings?.enabled ? 'ready' : 'off'}
                </span>
              )}
            </div>
          </div>

          {/* Break count + icons */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1,
                color: count > 0 ? 'var(--accent)' : 'var(--text-dim)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: -2
              }}>
                {count}
              </span>
              <span style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 500 }}>
                break{count !== 1 ? 's' : ''} today
              </span>
            </div>

            {/* Eye icons row */}
            <div style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              padding: '12px 16px',
              background: 'var(--surface3)',
              borderRadius: 12,
              marginBottom: 16,
              minHeight: 50
            }}>
              {count === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
                  No breaks yet
                </span>
              ) : (
                Array.from({ length: Math.min(count, 12) }).map((_, i) => (
                  <EyeIcon key={i} active={true} />
                ))
              )}
              {count > 12 && (
                <span style={{ fontSize: 12, color: 'var(--accent)', alignSelf: 'center', fontWeight: 600 }}>
                  +{count - 12} more
                </span>
              )}
            </div>

            <button
              className="btn-log-glass"
              style={{ '--btn-color': 'var(--accent)' } as React.CSSProperties}
              onClick={handleLogBreak}
              disabled={logging}
            >
              <span style={{ fontSize: 16 }}>👁️</span>
              {logging ? 'Logging...' : 'Log a Break'}
            </button>
          </div>
        </div>

        {/* What to do card */}
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          background: 'rgba(139,92,246,0.06)',
          border: '1px solid rgba(139,92,246,0.18)',
          borderRadius: 12,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>💡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
              How to do it
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Every <strong style={{ color: 'var(--accent)' }}>20 minutes</strong>, look at something at least{' '}
              <strong style={{ color: 'var(--accent)' }}>20 feet away</strong> for{' '}
              <strong style={{ color: 'var(--accent)' }}>20 seconds</strong>.
              This relaxes the focusing muscle in your eye and reduces digital eye strain.
            </div>
          </div>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: settings?.enabled ? 20 : 0
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Break Reminders</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Get a notification when it's time to look away
            </div>
          </div>
          <button
            className={`toggle-btn ${settings?.enabled ? 'on' : ''}`}
            onClick={toggle}
            aria-label="Toggle eye break reminder"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {settings?.enabled && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              Remind me every
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {INTERVALS.map(i => (
                <button
                  key={i.ms}
                  className={`range-btn ${settings.intervalMs === i.ms ? 'active' : ''}`}
                  onClick={() => changeInterval(i.ms)}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's log */}
      {breaks.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...breaks].reverse().map((ts, i) => (
              <div
                key={ts}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 4px',
                  borderBottom: i < breaks.length - 1 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span style={{ fontSize: 14 }}>👁️</span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(ts)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                  break {breaks.length - i}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
