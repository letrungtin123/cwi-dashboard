import { useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardShell, type DashboardSection } from './components/DashboardShell'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RoundtablePage } from './features/roundtable/RoundtablePage'
import { SubmissionsPage } from './features/submissions/SubmissionsPage'

const sectionCopy: Record<DashboardSection, { eyebrow: string; title: string }> = {
  roundtable: {
    eyebrow: 'CEO Roundtable',
    title: 'Danh sách đăng ký Roundtable',
  },
  submissions: {
    eyebrow: 'Chỉ số Nguồn lực Doanh nghiệp',
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
    <DashboardShell
      activeSection={activeSection}
      eyebrow={currentCopy.eyebrow}
      onLogout={logout}
      onSectionChange={setActiveSection}
      title={currentCopy.title}
      user={user}
    >
      {activeSection === 'roundtable' ? <RoundtablePage /> : <SubmissionsPage />}
    </DashboardShell>
  )
}
