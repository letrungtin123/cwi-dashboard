import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, WifiOff } from 'lucide-react'
import { DashboardShell, type DashboardSection } from './components/DashboardShell'
import { TooltipLayer } from './components/TooltipLayer'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RoundtablePage } from './features/roundtable/RoundtablePage'
import { SubmissionsPage } from './features/submissions/SubmissionsPage'
import { SurveyModuleTabs, type SurveyModuleTab } from './features/surveySources/SurveyModuleTabs'
import { SurveySourcesPage } from './features/surveySources/SurveySourcesPage'
import { WebinarPage } from './features/webinar/WebinarPage'
import { QuarterlyReportDownloadsPage } from './features/quarterlyReports/QuarterlyReportDownloadsPage'
import { QuarterlyReportsPage } from './features/quarterlyReports/QuarterlyReportsPage'
import { canManageContent, isSuperadmin } from './lib/roles'
import { AdminUsersPage } from './features/adminUsers/AdminUsersPage'
import { ChangePasswordDialog } from './features/auth/ChangePasswordDialog'

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
  adminUsers: {
    title: 'Quản lý quản trị viên',
  },
}

export default function App() {
  const { logout, retrySession, status, user } = useAuth()
  const [activeSection, setActiveSection] = useState<DashboardSection>('submissions')
  const [surveyTab, setSurveyTab] = useState<SurveyModuleTab>('submissions')
  // 'all', 'none' or a source id; kept here so "Xem danh sách" on a source opens the filtered list.
  const [submissionSourceFilter, setSubmissionSourceFilter] = useState('all')
  const [changingPassword, setChangingPassword] = useState(false)

  // A different account (or the same one after signing in again) starts from the default screen,
  // so a viewer never lands on a section left open by a super admin.
  const userId = user?.id ?? null
  useEffect(() => {
    setActiveSection('submissions')
    setSurveyTab('submissions')
    setSubmissionSourceFilter('all')
    setChangingPassword(false)
  }, [userId])

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
  const title = activeSection === 'submissions' && surveyTab === 'sources' ? 'Nguồn mời khảo sát' : currentCopy.title
  const surveyTabs = <SurveyModuleTabs active={surveyTab} onChange={setSurveyTab} />
  const surveyPage = surveyTab === 'sources'
    ? <SurveySourcesPage canEdit={canManageContent(user.role)} onShowSubmissions={(sourceFilter) => { setSubmissionSourceFilter(sourceFilter); setSurveyTab('submissions') }} tabs={surveyTabs} />
    : <SubmissionsPage onSourceFilterChange={setSubmissionSourceFilter} sourceFilter={submissionSourceFilter} tabs={surveyTabs} />

  return (
    <>
      <DashboardShell
        activeSection={activeSection}
        onChangePassword={() => setChangingPassword(true)}
        onLogout={logout}
        onSectionChange={setActiveSection}
        title={title}
        user={user}
      >
        {activeSection === 'adminUsers' && isSuperadmin(user.role) ? <AdminUsersPage /> : activeSection === 'roundtable' ? <RoundtablePage /> : activeSection === 'webinar' ? <WebinarPage /> : activeSection === 'quarterlyReports' ? <QuarterlyReportsPage /> : activeSection === 'quarterlyReportDownloads' ? <QuarterlyReportDownloadsPage /> : surveyPage}
      </DashboardShell>
      {changingPassword ? <ChangePasswordDialog onClose={() => setChangingPassword(false)} /> : null}
      <TooltipLayer />
    </>
  )
}
