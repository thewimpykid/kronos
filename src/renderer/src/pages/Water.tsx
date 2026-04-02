import { useEffect, useState } from 'react'
import { api, fmtCountdown, WaterSettings } from '../lib/api'

const WATER_INTERVALS = [
  { label: '30 min', ms: 30 * 60_000 },
  { label: '45 min', ms: 45 * 60_000 },
  { label: '1 hour', ms: 60 * 60_000 },
  { label: '90 min', ms: 90 * 60_000 },
  { label: '2 hours', ms: 2 * 60 * 60_000 },
]

const DAILY_GOAL = 8

function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 32 40"
      width="28"
      height="35"
      style={{ display: 'block' }}
    >
      {/* glass body */}
      <path
        d="M6 4 L4 38 L28 38 L26 4 Z"
        fill={filled ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.04)'}
        stroke={filled ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* water fill */}
      {filled && (
        <path
          d="M7 22 L5.2 38 L26.8 38 L25 22 Z"
          fill="rgba(34,211,238,0.35)"
        />
      )}
    </svg>
  )
}

export default function Water() {
  const [settings, setSettings] = useState<WaterSettings | null>(null)
  const [glasses, setGlasses] = useState<number[]>([])
  const [nextIn, setNextIn] = useState(0)
  const [logging, setLogging] = useState(false)

  async function load() {
    const [s, g] = await Promise.all([api.getWaterSettings(), api.getTodayGlasses()])
    setSettings(s)
    setGlasses(g)
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

  async function handleLogGlass() {
    setLogging(true)
    await api.logGlass()
    await load()
    setLogging(false)
  }

  async function toggle() {
    if (!settings) return
    await api.setWaterSettings(!settings.enabled, settings.intervalMs)
    load()
  }

  async function changeInterval(ms: number) {
    if (!settings) return
    await api.setWaterSettings(settings.enabled, ms)
    load()
  }

  const count = glasses.length
  const overGoal = count > DAILY_GOAL
  const pct = Math.min(100, (count / DAILY_GOAL) * 100)

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Hydration</div>
        <div className="page-subtitle">Track your daily water intake and set reminders</div>
      </div>

      {/* Main log card */}
      <div className="card water-hero-card" style={{ marginBottom: 16 }}>
        {/* Glass count display */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 6 }}>
          <span style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1,
            color: overGoal ? 'var(--green)' : 'var(--cyan)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -2
          }}>
            {count}
          </span>
          <span style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 500 }}>
            / {DAILY_GOAL} glasses
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6,
          background: 'var(--surface3)',
          borderRadius: 99,
          marginBottom: 20,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: overGoal
              ? 'linear-gradient(90deg, var(--green), #4ade80)'
              : 'linear-gradient(90deg, var(--accent), var(--cyan))',
            borderRadius: 99,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Glass icons grid */}
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 24,
          padding: '16px 20px',
          background: 'var(--surface3)',
          borderRadius: 12
        }}>
          {Array.from({ length: DAILY_GOAL }).map((_, i) => (
            <GlassIcon key={i} filled={i < count} />
          ))}
          {count > DAILY_GOAL && (
            <span style={{ fontSize: 13, color: 'var(--green)', alignSelf: 'center', fontWeight: 600 }}>
              +{count - DAILY_GOAL} extra
            </span>
          )}
        </div>

        <button
          className="btn-log-glass"
          onClick={handleLogGlass}
          disabled={logging}
        >
          <span style={{ fontSize: 18 }}>💧</span>
          {logging ? 'Logging...' : 'Log a Glass'}
        </button>

        {count >= DAILY_GOAL && (
          <div style={{
            marginTop: 14,
            padding: '10px 16px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--green)',
            textAlign: 'center',
            fontWeight: 500
          }}>
            Goal reached! Great job staying hydrated.
          </div>
        )}
      </div>

      {/* Reminder settings */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settings?.enabled ? 20 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Water Reminders</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Get notified when it's time to drink
            </div>
          </div>
          <button
            className={`toggle-btn ${settings?.enabled ? 'on' : ''}`}
            onClick={toggle}
            aria-label="Toggle water reminder"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {settings?.enabled && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Remind me every
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WATER_INTERVALS.map(i => (
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

            {nextIn > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface3)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 13
              }}>
                <span style={{ color: 'var(--text-dim)' }}>Next reminder in</span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--cyan)',
                  fontWeight: 700,
                  fontSize: 15
                }}>
                  {fmtCountdown(nextIn)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Today's log */}
      {glasses.length > 0 && (
        <div className="card">
          <div className="card-title">Today's Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...glasses].reverse().map((ts, i) => (
              <div
                key={ts}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 4px',
                  borderBottom: i < glasses.length - 1 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span style={{ fontSize: 14 }}>💧</span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(ts)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                  glass {glasses.length - i}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
