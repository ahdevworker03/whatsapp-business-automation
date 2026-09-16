import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import CampaignPage from './pages/CampaignPage'
import InboxPage from './pages/InboxPage'
import SettingsPage from './pages/SettingsPage'
import { DashboardIcon, LeadsIcon, CampaignIcon, InboxIcon, SettingsIcon, LogoIcon } from './components/icons'
import './index.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/leads', label: 'Leads', icon: LeadsIcon },
  { to: '/campaign', label: 'Campaign', icon: CampaignIcon },
  { to: '/inbox', label: 'Inbox', icon: InboxIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function Sidebar() {
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

      <div className="sidebar-footer">v1.0 · Local</div>
    </aside>
  )
}

function AppLayout() {
  const location = useLocation()
  const isInbox = location.pathname === '/inbox'

  return (
    <div className="app-container">
      <Sidebar />
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
      <AppLayout />
    </BrowserRouter>
  )
}
