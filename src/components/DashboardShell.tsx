import { useState, type ReactNode } from 'react'
import { BarChart3, LogOut, Menu, UsersRound, X } from 'lucide-react'
import logoSrc from '@/assets/cwi-logo.svg'
import type { AdminUser } from '@/types'

export type DashboardSection = 'submissions' | 'roundtable'

type DashboardShellProps = {
  activeSection: DashboardSection
  children: ReactNode
  eyebrow: string
  onLogout: () => Promise<void>
  onSectionChange: (section: DashboardSection) => void
  title: string
  user: AdminUser
}

const navItems: Array<{ icon: ReactNode; label: string; section: DashboardSection }> = [
  { icon: <BarChart3 aria-hidden="true" size={18} />, label: 'Tổng quan khảo sát', section: 'submissions' },
  { icon: <UsersRound aria-hidden="true" size={18} />, label: 'Danh sách Roundtable', section: 'roundtable' },
]

export function DashboardShell({ activeSection, children, eyebrow, onLogout, onSectionChange, title, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Người xem'

  const handleSectionChange = (section: DashboardSection) => {
    onSectionChange(section)
    setMobileOpen(false)
  }

  return (
    <div className="dashboard-shell">
      <button className="mobile-overlay" data-open={mobileOpen} onClick={() => setMobileOpen(false)} type="button" />

      <aside className="sidebar" data-open={mobileOpen}>
        <div className="sidebar-brand">
          <img src={logoSrc} alt="CWI" />
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} title="Đóng menu" type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng bảng quản trị">
          {navItems.map((item) => {
            const active = item.section === activeSection
            return (
              <button
                aria-current={active ? 'page' : undefined}
                className={`nav-item${active ? ' active' : ''}`}
                key={item.section}
                onClick={() => handleSectionChange(item.section)}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.displayName || user.email}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button className="logout-button" onClick={() => void onLogout()} type="button">
            <LogOut aria-hidden="true" size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} title="Mở menu" type="button">
              <Menu aria-hidden="true" size={20} />
            </button>
            <div>
              <p>{eyebrow}</p>
              <h1>{title}</h1>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
