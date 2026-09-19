import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import CampaignPage from './pages/CampaignPage'
import InboxPage from './pages/InboxPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import { DashboardIcon, LeadsIcon, CampaignIcon, InboxIcon, SettingsIcon, LogoIcon } from './components/icons'
import { api, ApiError, setUnauthorizedHandler } from './api'
import './index.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/leads', label: 'Leads', icon: LeadsIcon },
  { to: '/campaign', label: 'Campaign', icon: CampaignIcon },
  { to: '/inbox', label: 'Inbox', icon: InboxIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function Sidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <LogoIcon />
        </div>
        <div className="sidebar-logo-label">Outreach</div>
      </div>

      <nav>
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to)
            const Icon = item.icon
            return (
              <li className="nav-item" key={item.to}>
                <Link to={item.to} className={`nav-link ${active ? 'active' : ''}`}>
                  <span className="nav-link-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          Log out
        </button>
        <div>v1.0 · Local</div>
      </div>
    </aside>
  )
}

// Gates the five existing pages behind a valid session (docs/development-
// milestones/08.5-authentication.md section 7), via a dedicated
// GET /api/v1/auth/me probe on first mount; any 401 from any later call is
// caught globally via setUnauthorizedHandler in api.ts, not just this
// initial check.
function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInbox = location.pathname === '/inbox'
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => navigate('/login', { replace: true }))
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  useEffect(() => {
    api.checkSession()
      .then(() => setAuthChecked(true))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true })
        } else {
          // A non-auth error (e.g. a real 500) shouldn't block navigation —
          // let the page itself surface it, same as before this milestone.
          setAuthChecked(true)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await api.logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  if (!authChecked) return null

  return (
    <div className="app-container">
      <Sidebar onLogout={handleLogout} />
      <main className={`main-content ${isInbox ? 'main-content-flush' : ''}`}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
