import { useEffect, useState } from 'react'
import { api, fmtDuration, LimitWithUsage, TrackedToday } from '../lib/api'
import { resolveApp } from '../lib/appnames'

function progressColor(used: number, limit: number): string {
  const pct = limit > 0 ? used / limit : 0
  if (pct >= 1)    return 'var(--red)'
  if (pct >= 0.75) return 'var(--yellow)'
  return 'var(--cyan)'
}

// ─── Quick-add chip (from tracked apps) ───────────────────────────────────────
function QuickChip({
  label, emoji, processName, isSet, onSet
}: {
  label: string; emoji: string; processName: string; isSet: boolean; onSet: () => void
}) {
  return (
    <button
      className={`quick-chip ${isSet ? 'set' : ''}`}
      onClick={onSet}
      title={processName}
    >
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      {isSet
        ? <span style={{ fontSize: 10, color: 'var(--green)' }}>✓</span>
        : <span style={{ fontSize: 10, color: 'var(--muted)' }}>+ limit</span>}
    </button>
  )
}

// ─── Limit card ────────────────────────────────────────────────────────────────
function LimitCard({ l, onDelete }: { l: LimitWithUsage; onDelete: () => void }) {
  const pct   = Math.min(100, l.daily_limit_ms > 0 ? (l.used_today_ms / l.daily_limit_ms) * 100 : 0)
  const color = progressColor(l.used_today_ms, l.daily_limit_ms)
  const over  = l.used_today_ms >= l.daily_limit_ms
  const info  = l.target_type === 'app' ? resolveApp(l.target) : null

  return (
    <div className="limit-card">
      <div className="limit-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {info && <span style={{ fontSize: 18 }}>{info.emoji}</span>}
          <div className="limit-name">{info ? info.name : l.target}</div>
        </div>
        {info && info.processName !== info.name && (
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {l.target}
          </div>
        )}
        <div style={{ marginTop: 5 }}>
          <span className={l.target_type === 'app' ? 'badge badge-app' : 'badge badge-site'}>
            {l.target_type === 'app' ? 'App' : 'Website'}
          </span>
        </div>
      </div>

      <div className="limit-progress-wrap">
        <div className="limit-times">
          <span style={{ color: over ? 'var(--red)' : undefined, fontWeight: over ? 700 : 400 }}>
            {over ? '⚠ Over limit · ' : ''}{fmtDuration(l.used_today_ms)} used
          </span>
          <span>{fmtDuration(l.daily_limit_ms)} limit</span>
        </div>
        <div className="limit-progress-bar">
          <div
            className="limit-progress-fill"
            style={{
              width: `${pct}%`,
              background: color,
              boxShadow: over ? `0 0 10px ${color}50` : undefined
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
          {Math.round(pct)}% of daily limit used
        </div>
      </div>

      <button className="btn-delete" onClick={onDelete}>Remove</button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Limits() {
  const [limits, setLimits]       = useState<LimitWithUsage[]>([])
  const [tracked, setTracked]     = useState<TrackedToday>({ apps: [], sites: [] })
  const [target, setTarget]       = useState('')
  const [targetType, setTargetType] = useState<'app' | 'website'>('app')
  const [hours, setHours]         = useState('')
  const [minutes, setMinutes]     = useState('')
  const [showManual, setShowManual] = useState(false)

  async function load() {
    const [l, t] = await Promise.all([api.getLimits(), api.getTrackedToday()])
    setLimits(l)
    setTracked(t)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [])

  async function addLimit(t: string, tt: string, ms: number) {
    if (!t.trim() || ms <= 0) return
    await api.upsertLimit(t.trim(), tt, ms)
    load()
  }

  async function handleManualAdd() {
    const h = parseInt(hours   || '0')
    const m = parseInt(minutes || '0')
    const ms = (h * 60 + m) * 60_000
    await addLimit(target, targetType, ms)
    setTarget(''); setHours(''); setMinutes('')
  }

  function prefillFromApp(processName: string) {
    setTarget(processName)
    setTargetType('app')
    setShowManual(true)
    setHours('2')
    setMinutes('0')
  }

  function prefillFromSite(domain: string) {
    setTarget(domain)
    setTargetType('website')
    setShowManual(true)
    setHours('1')
    setMinutes('0')
  }

  const limitTargets = new Set(limits.map(l => l.target))
  const quickApps = tracked.apps
    .filter(a => !['electron', 'kronos'].includes(a.process_name.toLowerCase().replace(/\.exe$/, '')))
    .slice(0, 10)
  const quickSites = tracked.sites.slice(0, 8)

  return (
    <>
      <div className="page-header">
        <div className="page-title">Limits</div>
        <div className="page-subtitle">Set daily time budgets — you'll get notified when you hit them</div>
      </div>

      {/* Quick-add from today's activity */}
      {(quickApps.length > 0 || quickSites.length > 0) && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">Quick add from today</div>
          {quickApps.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Apps</div>
              <div className="quick-chips" style={{ marginBottom: quickSites.length > 0 ? 16 : 0 }}>
                {quickApps.map(a => {
                  const info = resolveApp(a.process_name)
                  return (
                    <QuickChip
                      key={a.process_name}
                      label={info.name}
                      emoji={info.emoji}
                      processName={a.process_name}
                      isSet={limitTargets.has(a.process_name)}
                      onSet={() => prefillFromApp(a.process_name)}
                    />
                  )
                })}
              </div>
            </>
          )}
          {quickSites.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Websites</div>
              <div className="quick-chips">
                {quickSites.map(s => (
                  <QuickChip
                    key={s.domain}
                    label={s.domain}
                    emoji="🌐"
                    processName={s.domain}
                    isSet={limitTargets.has(s.domain)}
                    onSet={() => prefillFromSite(s.domain)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual add form */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowManual(v => !v)}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>
            {showManual ? '▾' : '▸'}&nbsp; Add manually
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>type exact name</span>
        </div>

        {showManual && (
          <div className="add-limit-form" style={{ marginTop: 16, marginBottom: 0 }}>
            <input
              style={{ flex: 2, minWidth: 180 }}
              placeholder={targetType === 'app' ? 'Process name  (e.g. chrome.exe)' : 'Domain  (e.g. youtube.com)'}
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
            />
            <select value={targetType} onChange={e => setTargetType(e.target.value as 'app' | 'website')}>
              <option value="app">App</option>
              <option value="website">Website</option>
            </select>
            <input
              type="number" placeholder="Hours" value={hours} min={0}
              onChange={e => setHours(e.target.value)}
              style={{ width: 80 }}
            />
            <input
              type="number" placeholder="Min" value={minutes} min={0} max={59}
              onChange={e => setMinutes(e.target.value)}
              style={{ width: 72 }}
            />
            <button className="btn-primary" onClick={handleManualAdd}>Add</button>
          </div>
        )}
      </div>

      {/* Active limits */}
      {limits.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="empty-title">No limits yet</div>
            <div className="empty-body">Click an app or site above to quickly set a daily time limit.</div>
          </div>
        </div>
      ) : (
        <div className="limit-list">
          {limits.map(l => (
            <LimitCard key={l.id} l={l} onDelete={async () => { await api.deleteLimit(l.id); load() }} />
          ))}
        </div>
      )}
    </>
  )
}
