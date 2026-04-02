import { useEffect, useState } from 'react'
import { api, FocusSessionInfo, fmtCountdown, fmtDuration, TrackedToday } from '../lib/api'
import { resolveApp } from '../lib/appnames'

const DURATIONS = [
  { label: '25 min', ms: 25 * 60_000 },
  { label: '45 min', ms: 45 * 60_000 },
  { label: '1 hour', ms: 60 * 60_000 },
  { label: '2 hours', ms: 2 * 60 * 60_000 },
]

// ─── Active Session Card ───────────────────────────────────────────────────────
function ActiveSession({ session, onEnd }: { session: FocusSessionInfo; onEnd: () => void }) {
  const [remaining, setRemaining] = useState(session.remainingMs)
  const total = session.endTime - session.startTime
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100))

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, session.endTime - Date.now())
      setRemaining(r)
      if (r === 0) onEnd()
    }, 500)
    return () => clearInterval(id)
  }, [session.endTime])

  const isAlmostDone = remaining < 5 * 60_000

  return (
    <div className="focus-active-card">
      <div className="focus-active-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="focus-pulse-dot" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Session Active
          </span>
        </div>
        {session.label && (
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{session.label}</span>
        )}
      </div>

      <div className="focus-timer">
        {fmtCountdown(remaining)}
      </div>

      <div className="focus-progress-bar-wrap">
        <div className="focus-progress-track">
          <div
            className="focus-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtDuration(total - remaining)} elapsed
        </span>
      </div>

      {(session.blockedApps.length > 0 || session.blockedSites.length > 0) && (
        <div style={{ marginTop: 20 }}>
          {session.blockedApps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Blocked Apps
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {session.blockedApps.map(p => {
                  const info = resolveApp(p)
                  return (
                    <span key={p} className="blocked-tag">
                      {info.emoji} {info.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {session.blockedSites.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Blocked Sites
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {session.blockedSites.map(s => (
                  <span key={s} className="blocked-tag">
                    🌐 {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button className="btn-end-session" onClick={onEnd} style={{ marginTop: 24 }}>
        End Session Early
      </button>
    </div>
  )
}

// ─── New Session Builder ───────────────────────────────────────────────────────
function NewSession({ trackedToday, onStart }: {
  trackedToday: TrackedToday
  onStart: () => void
}) {
  const [durationMs, setDurationMs] = useState(25 * 60_000)
  const [customMin, setCustomMin] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [blockedApps, setBlockedApps] = useState<Set<string>>(new Set())
  const [blockedSites, setBlockedSites] = useState<Set<string>>(new Set())
  const [label, setLabel] = useState('')

  const topApps = trackedToday.apps
    .filter(a => !['electron', 'kronos'].includes(a.process_name.toLowerCase().replace(/\.exe$/i, '')))
    .slice(0, 12)

  const topSites = trackedToday.sites.slice(0, 12)

  function toggleApp(p: string) {
    setBlockedApps(prev => {
      const n = new Set(prev)
      n.has(p) ? n.delete(p) : n.add(p)
      return n
    })
  }

  function toggleSite(d: string) {
    setBlockedSites(prev => {
      const n = new Set(prev)
      n.has(d) ? n.delete(d) : n.add(d)
      return n
    })
  }

  async function handleStart() {
    const ms = useCustom
      ? Math.max(1, parseInt(customMin || '25')) * 60_000
      : durationMs
    await api.startFocusSession(label, ms, [...blockedApps], [...blockedSites])
    onStart()
  }

  return (
    <div className="card">
      {/* Label */}
      <div style={{ marginBottom: 22 }}>
        <div className="card-title">Session name (optional)</div>
        <input
          className="focus-input"
          placeholder='e.g. "Study", "Deep work", "Reading"'
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>

      {/* Duration */}
      <div style={{ marginBottom: 22 }}>
        <div className="card-title">Duration</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {DURATIONS.map(d => (
            <button
              key={d.ms}
              className={`range-btn ${!useCustom && durationMs === d.ms ? 'active' : ''}`}
              onClick={() => { setDurationMs(d.ms); setUseCustom(false) }}
            >
              {d.label}
            </button>
          ))}
          <button
            className={`range-btn ${useCustom ? 'active' : ''}`}
            onClick={() => setUseCustom(true)}
          >
            Custom
          </button>
          {useCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="focus-input-sm"
                type="number"
                placeholder="60"
                value={customMin}
                onChange={e => setCustomMin(e.target.value)}
                min={1}
                style={{ width: 70 }}
              />
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>minutes</span>
            </div>
          )}
        </div>
      </div>

      {/* App blocker */}
      <div style={{ marginBottom: 22 }}>
        <div className="card-title">Block these apps</div>
        {topApps.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
            Use your computer for a bit and your recent apps will appear here.
          </p>
        ) : (
          <div className="app-grid">
            {topApps.map(a => {
              const info = resolveApp(a.process_name)
              const blocked = blockedApps.has(a.process_name)
              return (
                <button
                  key={a.process_name}
                  className={`app-block-chip ${blocked ? 'blocked' : ''}`}
                  onClick={() => toggleApp(a.process_name)}
                  title={a.process_name}
                >
                  <span style={{ fontSize: 16 }}>{info.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{info.name}</span>
                  {blocked && <span style={{ fontSize: 10, color: 'var(--red)', marginLeft: 2 }}>✕</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Site blocker */}
      <div style={{ marginBottom: 26 }}>
        <div className="card-title">Block these websites</div>
        {topSites.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
            Browse normally and your visited sites will appear here.
          </p>
        ) : (
          <div className="app-grid">
            {topSites.map(s => {
              const blocked = blockedSites.has(s.domain)
              return (
                <button
                  key={s.domain}
                  className={`app-block-chip ${blocked ? 'blocked' : ''}`}
                  onClick={() => toggleSite(s.domain)}
                  title={s.domain}
                >
                  <span style={{ fontSize: 16 }}>🌐</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{s.domain}</span>
                  {blocked && <span style={{ fontSize: 10, color: 'var(--red)', marginLeft: 2 }}>✕</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button className="btn-primary btn-start-focus" onClick={handleStart}>
        Start Focus Session
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Focus() {
  const [session, setSession] = useState<FocusSessionInfo | null | 'loading'>('loading')
  const [tracked, setTracked] = useState<TrackedToday>({ apps: [], sites: [] })

  async function loadSession() {
    const s = await api.getFocusSession()
    setSession(s)
  }

  async function loadTracked() {
    const t = await api.getTrackedToday()
    setTracked(t)
  }

  useEffect(() => {
    loadSession()
    loadTracked()
    const id = setInterval(loadSession, 3000)
    return () => clearInterval(id)
  }, [])

  async function handleEnd() {
    await api.endFocusSession()
    setSession(null)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Focus</div>
        <div className="page-subtitle">Block distractions and stay on track</div>
      </div>

      {session === 'loading' ? null : session ? (
        <ActiveSession session={session} onEnd={handleEnd} />
      ) : (
        <NewSession trackedToday={tracked} onStart={loadSession} />
      )}
    </>
  )
}
