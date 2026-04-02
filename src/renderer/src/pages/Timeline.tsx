import { useEffect, useState } from 'react'
import { api, fmtDuration, HourBucket } from '../lib/api'

export default function Timeline() {
  const [hourly, setHourly] = useState<HourBucket[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const s = await api.getStatsToday()
      if (!cancelled) setHourly(s.hourly)
    }
    load()
    const id = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const buckets: number[] = Array(24).fill(0)
  hourly.forEach((b) => { if (b.hour >= 0 && b.hour < 24) buckets[b.hour] = b.total_ms })
  const maxMs = Math.max(...buckets, 1)
  const totalMs = buckets.reduce((a, b) => a + b, 0)
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

  return (
    <>
      <div className="page-header">
        <div className="page-title">Timeline</div>
        <div className="page-subtitle">Hourly activity today</div>
      </div>

      {totalMs > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="stat-chip">
            <div className="stat-value">{fmtDuration(totalMs)}</div>
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
              const heightPct = (ms / maxMs) * 100
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
  )
}
