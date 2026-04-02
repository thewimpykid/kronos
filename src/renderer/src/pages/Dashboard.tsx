import { useEffect, useState } from 'react'
import { api, AppStat, fmtDuration, StatsToday, WebStat } from '../lib/api'
import { resolveApp } from '../lib/appnames'

const PALETTE = [
  '#00c8e8', '#ff7b39', '#1fd693', '#f5c842',
  '#a78bfa', '#fb7185', '#38bdf8', '#34d399'
]

function AppBarRow({ a, maxMs, color }: { a: AppStat; maxMs: number; color: string }) {
  const pct = maxMs > 0 ? Math.max(2, (a.total_ms / maxMs) * 100) : 2
  const info = resolveApp(a.process_name)
  return (
    <div className="bar-row">
      <div className="bar-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div className="bar-rank" style={{ background: color }} />
          <div style={{ minWidth: 0 }}>
            <div className="bar-name" title={a.process_name}>{info.name}</div>
          </div>
        </div>
        <span className="bar-time">{fmtDuration(a.total_ms)}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      </div>
    </div>
  )
}

function SiteBarRow({ w, maxMs, color }: { w: WebStat; maxMs: number; color: string }) {
  const pct = maxMs > 0 ? Math.max(2, (w.total_ms / maxMs) * 100) : 2
  return (
    <div className="bar-row">
      <div className="bar-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div className="bar-rank" style={{ background: color }} />
          <span className="bar-name" title={w.domain}>{w.domain}</span>
        </div>
        <span className="bar-time">{fmtDuration(w.total_ms)}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsToday | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const s = await api.getStatsToday()
      if (!cancelled) setStats(s)
    }
    load()
    const id = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const totalAppMs = stats?.apps.reduce((a, b) => a + b.total_ms, 0) ?? 0
  const topApps: AppStat[]    = stats?.apps.slice(0, 8) ?? []
  const topSites: WebStat[]   = stats?.websites.slice(0, 8) ?? []
  const maxAppMs = topApps[0]?.total_ms ?? 1
  const maxSiteMs = topSites[0]?.total_ms ?? 1

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <div className="page-header">
        <div className="page-title">Today</div>
        <div className="page-subtitle">{dateStr}</div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-chip">
          <div className="stat-value">{fmtDuration(totalAppMs)}</div>
          <div className="stat-label">Screen time</div>
        </div>
        <div className="stat-chip">
          <div className="stat-value">{stats?.apps.length ?? 0}</div>
          <div className="stat-label">Apps used</div>
        </div>
        <div className="stat-chip">
          <div className="stat-value">{stats?.websites.length ?? 0}</div>
          <div className="stat-label">Sites visited</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Top Applications</div>
          {topApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M9 9h6M9 12h4" />
                </svg>
              </div>
              <div className="empty-title">Waiting for data</div>
              <div className="empty-body">Tracking is active. Switch between apps and data will appear here.</div>
            </div>
          ) : (
            <div className="bar-list">
              {topApps.map((a, i) => (
                <AppBarRow key={a.process_name} a={a} maxMs={maxAppMs} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Top Websites</div>
          {topSites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9" />
                </svg>
              </div>
              <div className="empty-title">No browser data yet</div>
              <div className="empty-body">Browse normally in Chrome, Edge, Firefox or Brave and it will appear here.</div>
            </div>
          ) : (
            <div className="bar-list">
              {topSites.map((w, i) => (
                <SiteBarRow key={w.domain} w={w} maxMs={maxSiteMs} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
