import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Websites from './pages/Websites'
import Timeline from './pages/Timeline'
import Limits from './pages/Limits'
import Focus from './pages/Focus'
import Water from './pages/Water'
import { api } from './lib/api'

type Page = 'dashboard' | 'websites' | 'timeline' | 'limits' | 'focus' | 'water'

const NAV: { id: Page; label: string; icon: JSX.Element }[] = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  },
  {
    id: 'websites', label: 'Websites',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" /></svg>
  },
  {
    id: 'timeline', label: 'Timeline',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="14" width="3" height="7" rx="1" /><rect x="9" y="9" width="3" height="12" rx="1" /><rect x="15" y="5" width="3" height="16" rx="1" /><rect x="21" y="11" width="3" height="10" rx="1" /></svg>
  },
  {
    id: 'focus', label: 'Focus',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
  },
  {
    id: 'water', label: 'Hydration',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" /></svg>
  },
  {
    id: 'limits', label: 'Limits',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" /><path d="M18 2v4M22 6h-4" /></svg>
  }
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [focusActive, setFocusActive] = useState(false)

  useEffect(() => {
    async function checkFocus() {
      const s = await api.getFocusSession()
      setFocusActive(!!s)
    }
    checkFocus()
    const id = setInterval(checkFocus, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-logo">Kronos</div>
        <div className="sidebar-nav">
          {NAV.map((n) => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.id === 'focus' && focusActive && (
                <span className="focus-nav-dot" />
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">v1.0.0 · local</div>
      </nav>
      <main className="content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'websites'  && <Websites />}
        {page === 'timeline'  && <Timeline />}
        {page === 'focus'     && <Focus />}
        {page === 'water'     && <Water />}
        {page === 'limits'    && <Limits />}
      </main>
    </div>
  )
}
