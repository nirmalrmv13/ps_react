import { useEffect, useState } from 'react'
import { apiGet } from './api.js'
import logo from './assets/logo.png'
import { BRAND } from './brand.js'
import { formatINRWhole } from './format.js'
import {
  BoxIcon,
  CalendarIcon,
  HistoryIcon,
  LogoutIcon,
  LotusIcon,
  PackageIcon,
  ReceiptIcon,
  TagIcon,
  UsersIcon,
} from './Icons.jsx'
import './Sidebar.css'

const sections = [
  {
    title: 'Navigation',
    items: [
      { id: 'appointments', label: 'Appointments', Icon: CalendarIcon },
      { id: 'billing', label: 'Billing & POS', Icon: ReceiptIcon },
      { id: 'history', label: 'Billing History', Icon: HistoryIcon },
      { id: 'inventory', label: 'Inventory', Icon: PackageIcon, adminOnly: true },
    ],
  },
  {
    title: 'Masters',
    adminOnly: true,
    items: [
      { id: 'products', label: 'Product Master', Icon: BoxIcon },
      { id: 'services', label: 'Service Master', Icon: LotusIcon },
      { id: 'employees', label: 'Employee Master', Icon: UsersIcon },
      { id: 'coupons', label: 'Coupon Master', Icon: TagIcon },
    ],
  },
]

const roleLabels = { admin: 'Administrator', staff: 'Billing Staff' }

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function Sidebar({ user, activePage, onNavigate, onLogout }) {
  const [config, setConfig] = useState(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    apiGet('/api/config')
      .then(setConfig)
      .catch(() => setOnline(false))
  }, [])

  const displayName = user.name || user.username
  const isAdmin = user.role === 'admin'
  const visibleSections = sections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.adminOnly || isAdmin) }))

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={logo} alt="" />
        <div className="sidebar-brand-text">
          <span className="sidebar-name">{config?.businessName || BRAND.name}</span>
          <span className="sidebar-tagline">{config?.tagline || BRAND.tagline}</span>
        </div>
      </div>

      <div className="sidebar-status">
        <span>
          <span className={`sidebar-status-dot ${online ? '' : 'is-offline'}`} />
          {config?.register || 'POS'} • {online ? 'Active' : 'Offline'}
        </span>
        {config?.cashFloat > 0 && <span className="sidebar-float">{formatINRWhole(config.cashFloat)} Float</span>}
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {visibleSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <p className="sidebar-section-title">{section.title}</p>
            <ul>
              {section.items.map(({ id, label, Icon }) => {
                const active = id === activePage
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`sidebar-link ${active ? 'is-active' : ''}`}
                      onClick={() => onNavigate(id)}
                      aria-current={active ? 'page' : undefined}
                      title={label}
                    >
                      <Icon className="sidebar-icon" />
                      <span className="sidebar-label">{label}</span>
                      {active && <span className="sidebar-active-dot" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <span className="sidebar-avatar" title={displayName} aria-hidden="true">
          {initials(displayName)}
        </span>
        <div className="sidebar-user-text">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-role">{roleLabels[user.role] ?? user.role}</span>
        </div>
        <button type="button" className="sidebar-logout" onClick={onLogout} title="Log out">
          <LogoutIcon />
          <span className="sr-only">Log out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
