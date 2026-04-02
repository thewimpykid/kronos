import { useEffect, useState } from 'react'
import { api, fmtDuration, WebStat } from '../lib/api'

const PALETTE = [
  '#00c8e8', '#ff7b39', '#1fd693', '#f5c842',
  '#a78bfa', '#fb7185', '#38bdf8', '#34d399'
]

type Range = 'today' | '7d' | '30d'

export default function Websites() {
  const [sites, setSites] = useState<WebStat[]>([])
  const [range, setRange] = useState<Range>('today')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const days = range === 'today' ? 0 : range === '7d' ? 7 : 30
      let startMs: number
      if (range === 'today') {
        const d = new Date(); d.setHours(0, 0, 0, 0); startMs = d.getTime()
      } else {
        startMs = Date.now() - days * 86400_000
      }
      const r = await api.getStatsRange(startMs, Date.now())
      if (!cancelled) setSites(r.websites)
    }
    load()
    const id = setInterval(load, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [range])

  const total = sites.reduce((a, b) => a + b.total_ms, 0)
  const max   = sites[0]?.total_ms ?? 1

  return (
    <>
      <div className="page-header">
        <div className="page-title">Websites</div>
        <div className="page-subtitle">Time spent per domain</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {(['today', '7d', '30d'] as Range[]).map((r) => (
          <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
            {r === 'today' ? 'Today' : r}
          </button>
        ))}
        {sites.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
            {sites.length} sites · {fmtDuration(total)}
          </span>
        )}
      </div>

      {sites.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
              </svg>
            </div>
            <div className="empty-title">No website data</div>
            <div className="empty-body">
              Open Chrome, Edge, Firefox, or Brave and browse normally — Kronos tracks automatically.
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="bar-list">
            {sites.map((s, i) => {
              const pct = Math.max(2, (s.total_ms / max) * 100)
              const color = PALETTE[i % PALETTE.length]
              return (
                <div key={s.domain} className="bar-row">
                  <div className="bar-row-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div className="bar-rank" style={{ background: color }} />
                      <span className="bar-name" title={s.domain}>{s.domain}</span>
                    </div>
                    <span className="bar-time">{fmtDuration(s.total_ms)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
