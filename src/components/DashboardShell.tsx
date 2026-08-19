import { useState, type ReactNode } from 'react'
import { BarChart3, LogOut, Menu, X } from 'lucide-react'
import logoSrc from '@/assets/cwi-logo.svg'
import type { AdminUser } from '@/types'

type DashboardShellProps = {
  children: ReactNode
  onLogout: () => Promise<void>
  user: AdminUser
}

export function DashboardShell({ children, onLogout, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Người xem'

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
          <button className="nav-item active" type="button">
            <BarChart3 aria-hidden="true" size={18} />
            <span>Tổng quan khảo sát</span>
          </button>
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
              <p>Chỉ số Nguồn lực Doanh nghiệp</p>
              <h1>Lượt gửi khảo sát</h1>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}