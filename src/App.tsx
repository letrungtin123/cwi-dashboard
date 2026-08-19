import { motion } from 'framer-motion'
import { DashboardShell } from './components/DashboardShell'
import { useAuth } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { SubmissionsPage } from './features/submissions/SubmissionsPage'

export default function App() {
  const { logout, status, user } = useAuth()

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

  return (
    <DashboardShell onLogout={logout} user={user}>
      <SubmissionsPage />
    </DashboardShell>
  )
}