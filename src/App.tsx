import { useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardShell, type DashboardSection } from './components/DashboardShell'
import { TooltipLayer } from './components/TooltipLayer'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RoundtablePage } from './features/roundtable/RoundtablePage'
import { SubmissionsPage } from './features/submissions/SubmissionsPage'
import { WebinarPage } from './features/webinar/WebinarPage'

const sectionCopy: Record<DashboardSection, { title: string }> = {
  roundtable: {
    title: 'Danh sách đăng ký Roundtable',
  },
  webinar: {
    title: 'Danh sách đăng ký Webinar',
  },
  submissions: {
    title: 'Lượt gửi khảo sát',
  },
}

export default function App() {
  const { logout, status, user } = useAuth()
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
        {activeSection === 'roundtable' ? <RoundtablePage /> : activeSection === 'webinar' ? <WebinarPage /> : <SubmissionsPage />}
      </DashboardShell>
      <TooltipLayer />
    </>
  )
}
