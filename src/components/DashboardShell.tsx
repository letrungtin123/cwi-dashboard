import { useState, type ReactNode } from 'react'
import { BarChart3, ChevronsLeft, ChevronsRight, LogOut, Menu, UsersRound, Video, X } from 'lucide-react'
import logoSrc from '@/assets/cwi-logo.svg'
import type { AdminUser } from '@/types'

export type DashboardSection = 'submissions' | 'roundtable' | 'webinar'

type DashboardShellProps = {
  activeSection: DashboardSection
  children: ReactNode
  onLogout: () => Promise<void>
  onSectionChange: (section: DashboardSection) => void
  title: string
  user: AdminUser
}

const navItems: Array<{ icon: ReactNode; label: string; section: DashboardSection }> = [
  { icon: <BarChart3 aria-hidden="true" size={18} />, label: 'Tổng quan khảo sát', section: 'submissions' },
  { icon: <UsersRound aria-hidden="true" size={18} />, label: 'Danh sách Roundtable', section: 'roundtable' },
  { icon: <Video aria-hidden="true" size={18} />, label: 'Danh sách Webinar', section: 'webinar' },
]

export function DashboardShell({ activeSection, children, onLogout, onSectionChange, title, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Người xem'

  const handleSectionChange = (section: DashboardSection) => {
    onSectionChange(section)
    setMobileOpen(false)
  }

  return (
    <div className="dashboard-shell" data-sidebar-collapsed={sidebarCollapsed}>
      <button className="mobile-overlay" data-open={mobileOpen} onClick={() => setMobileOpen(false)} type="button" />

      <aside className="sidebar" data-collapsed={sidebarCollapsed} data-open={mobileOpen}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img src={logoSrc} alt="CWI" />
          </div>
          <button aria-label="Đóng menu" className="icon-button mobile-only" data-tooltip="Đóng menu" onClick={() => setMobileOpen(false)} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="sidebar-section-label">Nội dung</p>
        <nav className="sidebar-nav" aria-label="Điều hướng bảng quản trị">
          {navItems.map((item) => {
            const active = item.section === activeSection
            return (
              <button
                aria-current={active ? 'page' : undefined}
                className={`nav-item${active ? ' active' : ''}`}
                data-tooltip={sidebarCollapsed ? item.label : undefined}
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
          <div className="sidebar-user" data-tooltip={sidebarCollapsed ? `${user.displayName || user.email} · ${roleLabel}` : undefined}>
            <div className="avatar">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.displayName || user.email}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button className="logout-button" data-tooltip={sidebarCollapsed ? 'Đăng xuất' : undefined} onClick={() => void onLogout()} type="button">
            <LogOut aria-hidden="true" size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button aria-label="Mở menu" className="icon-button mobile-only" data-tooltip="Mở menu" onClick={() => setMobileOpen(true)} type="button">
              <Menu aria-hidden="true" size={20} />
            </button>
            <button
              aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
              aria-pressed={sidebarCollapsed}
              className="icon-button desktop-only sidebar-toggle-button"
              data-tooltip={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
              onClick={() => setSidebarCollapsed((current) => !current)}
              type="button"
            >
              {sidebarCollapsed ? <ChevronsRight aria-hidden="true" size={18} /> : <ChevronsLeft aria-hidden="true" size={18} />}
            </button>
            <div>
              <h1>{title}</h1>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
