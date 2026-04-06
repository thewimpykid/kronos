import { useEffect, useState } from 'react'
import { api, fmtDuration, HourBucket, DayBucket } from '../lib/api'

type View = 'daily' | 'weekly'

export default function Timeline() {
  const [view, setView] = useState<View>('daily')
  const [hourly, setHourly] = useState<HourBucket[]>([])
  const [weekly, setWeekly] = useState<DayBucket[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [today, week] = await Promise.all([
        api.getStatsToday(),
        api.getWeeklyTimeline()
      ])
      if (!cancelled) {
        setHourly(today.hourly)
        setWeekly(week)
      }
    }
    load()
    const id = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // ── Daily view helpers ────────────────────────────────────────────────────

  const buckets: number[] = Array(24).fill(0)
  hourly.forEach((b) => { if (b.hour >= 0 && b.hour < 24) buckets[b.hour] = b.total_ms })
  const dailyMaxMs = Math.max(...buckets, 1)
  const dailyTotalMs = buckets.reduce((a, b) => a + b, 0)
  const peakHour = buckets.indexOf(Math.max(...buckets))

  function hourLabel(h: number, short = false) {
    if (short) {
      if (h === 0) return '12a'
      if (h < 12) return `${h}a`
      if (h === 12) return '12p'
      return `${h - 12}p`
    }
    if (h === 0) return '12:00 AM'
    if (h < 12) return `${h}:00 AM`
    if (h === 12) return '12:00 PM'
    return `${h - 12}:00 PM`
  }

  // ── Weekly view helpers ───────────────────────────────────────────────────

  // Build a full 7-day array (oldest → today)
  const today0 = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const weekDays: { dayStart: number; total_ms: number }[] = Array.from({ length: 7 }, (_, i) => ({
    dayStart: today0 - (6 - i) * 86400000,
    total_ms: 0
  }))
  weekly.forEach((b) => {
    const idx = weekDays.findIndex((d) => d.dayStart === b.dayStart)
    if (idx !== -1) weekDays[idx].total_ms = b.total_ms
  })
  const weeklyMaxMs = Math.max(...weekDays.map((d) => d.total_ms), 1)
  const weeklyTotalMs = weekDays.reduce((a, b) => a + b.total_ms, 0)
  const weeklyAvgMs = Math.round(weeklyTotalMs / 7)

  function dayLabel(ts: number, short = false) {
    const d = new Date(ts)
    if (short) return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isToday = (ts: number) => ts === today0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-header">
        <div className="page-title">Timeline</div>
        <div className="page-subtitle">{view === 'daily' ? 'Hourly activity today' : 'Daily activity this week'}</div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['daily', 'weekly'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '6px 18px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: view === v ? 'var(--cyan)' : 'var(--surface2)',
              color: view === v ? '#000' : 'var(--text)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {v === 'daily' ? 'Daily' : 'Weekly'}
          </button>
        ))}
      </div>

      {/* ── DAILY VIEW ── */}
      {view === 'daily' && (
        <>
          {dailyTotalMs > 0 && (
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div className="stat-chip">
                <div className="stat-value">{fmtDuration(dailyTotalMs)}</div>
                <div className="stat-label">Total today</div>
              </div>
              <div className="stat-chip">
                <div className="stat-value">{hourLabel(peakHour)}</div>
                <div className="stat-label">Peak hour</div>
              </div>
            </div>
          )}

          <div className="card" style={{ overflowX: 'auto', marginBottom: 18 }}>
            <div className="card-title">Hourly breakdown</div>
            <div style={{ minWidth: 560 }}>
              <div className="timeline-wrap">
                {buckets.map((ms, h) => {
                  const heightPct = (ms / dailyMaxMs) * 100
                  const isActive = ms > 0
                  return (
                    <div
                      key={h}
                      className="hour-bar-wrap"
                      title={`${hourLabel(h)}: ${fmtDuration(ms)}`}
                    >
                      <div
                        className={`hour-bar ${isActive ? '' : 'empty'}`}
                        style={{ height: `${Math.max(isActive ? 3 : 2, heightPct)}%` }}
                      />
                      <div className="hour-label">{h % 3 === 0 ? hourLabel(h, true) : ''}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {hourly.length > 0 && (
            <div className="card">
              <div className="card-title">Active hours</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hourly
                  .filter((b) => b.total_ms > 0)
                  .sort((a, b) => b.total_ms - a.total_ms)
                  .map((b) => (
                    <div
                      key={b.hour}
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {hourLabel(b.hour)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                        {fmtDuration(b.total_ms)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {hourly.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="14" width="3" height="7" rx="1" />
                    <rect x="9" y="9" width="3" height="12" rx="1" />
                    <rect x="15" y="5" width="3" height="16" rx="1" />
                  </svg>
                </div>
                <div className="empty-title">No activity yet today</div>
                <div className="empty-body">Use your computer normally and your hourly breakdown will appear here.</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── WEEKLY VIEW ── */}
      {view === 'weekly' && (
        <>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="stat-chip">
              <div className="stat-value">{fmtDuration(weeklyTotalMs)}</div>
              <div className="stat-label">Total this week</div>
            </div>
            <div className="stat-chip">
              <div className="stat-value">{fmtDuration(weeklyAvgMs)}</div>
              <div className="stat-label">Daily average</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">Daily breakdown</div>
            <div className="timeline-wrap" style={{ minHeight: 140 }}>
              {weekDays.map(({ dayStart, total_ms }) => {
                const heightPct = (total_ms / weeklyMaxMs) * 100
                const isActive = total_ms > 0
                const todayFlag = isToday(dayStart)
                return (
                  <div
                    key={dayStart}
                    className="hour-bar-wrap"
                    title={`${dayLabel(dayStart)}: ${fmtDuration(total_ms)}`}
                    style={{ flex: 1 }}
                  >
                    <div
                      className={`hour-bar ${isActive ? '' : 'empty'}`}
                      style={{
                        height: `${Math.max(isActive ? 4 : 2, heightPct)}%`,
                        background: todayFlag ? 'var(--cyan)' : undefined
                      }}
                    />
                    <div
                      className="hour-label"
                      style={{ fontWeight: todayFlag ? 700 : undefined, color: todayFlag ? 'var(--cyan)' : undefined }}
                    >
                      {dayLabel(dayStart, true)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Days this week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...weekDays].sort((a, b) => b.total_ms - a.total_ms).map(({ dayStart, total_ms }) => (
                <div
                  key={dayStart}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--surface2)',
                    border: `1px solid ${isToday(dayStart) ? 'var(--cyan)' : 'var(--border)'}`,
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontSize: 13, color: isToday(dayStart) ? 'var(--cyan)' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                    {dayLabel(dayStart)}{isToday(dayStart) ? ' — today' : ''}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                    {total_ms > 0 ? fmtDuration(total_ms) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
