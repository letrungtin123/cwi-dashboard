import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, WifiOff } from 'lucide-react'
import { DashboardShell, type DashboardSection } from './components/DashboardShell'
import { TooltipLayer } from './components/TooltipLayer'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RoundtablePage } from './features/roundtable/RoundtablePage'
import { SubmissionsPage } from './features/submissions/SubmissionsPage'
import { WebinarPage } from './features/webinar/WebinarPage'
import { QuarterlyReportDownloadsPage } from './features/quarterlyReports/QuarterlyReportDownloadsPage'
import { QuarterlyReportsPage } from './features/quarterlyReports/QuarterlyReportsPage'

const sectionCopy: Record<DashboardSection, { title: string }> = {
  roundtable: {
    title: 'Danh sách đăng ký Roundtable',
  },
  webinar: {
    title: 'Danh sách đăng ký Webinar',
  },
  quarterlyReports: {
    title: 'Quản lý báo cáo quý',
  },
  quarterlyReportDownloads: {
    title: 'Danh sách tải báo cáo quý',
  },
  submissions: {
    title: 'Lượt gửi khảo sát',
  },
}

export default function App() {
  const { logout, retrySession, status, user } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('submissions')

  if (status === 'checking') {
    return (
      <main className="loading-screen">
        <motion.div
          animate={{ opacity: [0.72, 1, 0.72] }}
          className="app-loading-card"
          transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
        >
          <div className="loading-mark" />
          <div className="app-loading-copy">
            <span />
            <strong />
          </div>
        </motion.div>
      </main>
    )
  }

  if (status === 'unavailable') {
    return (
      <main className="loading-screen">
        <motion.section animate={{ opacity: 1, y: 0 }} className="session-unavailable-card" initial={{ opacity: 0, y: 8 }}>
          <span className="session-unavailable-icon"><WifiOff aria-hidden="true" size={23} /></span>
          <div>
            <h1>Không thể kết nối phiên đăng nhập</h1>
            <p>Hệ thống chưa xác minh được phiên hiện tại. Vui lòng thử lại, không cần đăng nhập lại.</p>
          </div>
          <button className="primary-button" onClick={() => void retrySession()} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            <span>Thử lại</span>
          </button>
        </motion.section>
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <LoginPage />
  }

  const currentCopy = sectionCopy[activeSection]

  return (
    <>
      <DashboardShell
        activeSection={activeSection}
        onLogout={logout}
        onSectionChange={setActiveSection}
        title={currentCopy.title}
        user={user}
      >
        {activeSection === 'roundtable' ? <RoundtablePage /> : activeSection === 'webinar' ? <WebinarPage /> : activeSection === 'quarterlyReports' ? <QuarterlyReportsPage /> : activeSection === 'quarterlyReportDownloads' ? <QuarterlyReportDownloadsPage /> : <SubmissionsPage />}
      </DashboardShell>
      <TooltipLayer />
    </>
  )
}
