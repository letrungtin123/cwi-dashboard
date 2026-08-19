import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import logoSrc from '@/assets/cwi-logo.svg'
import { ApiError } from '@/lib/api'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : 'Không thể đăng nhập lúc này.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="login-title"
        className="login-panel"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.34, ease: 'easeOut' }}
      >
        <div className="login-brand">
          <img src={logoSrc} alt="CWI" />
          <div>
            <p>CEO Workforce Index</p>
            <h1 id="login-title">Dashboard quản trị</h1>
          </div>
        </div>

        <div className="login-context" aria-label="Dashboard scope">
          <span>Survey submissions</span>
          <span>Admin workspace</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <div className="input-wrap">
            <Mail aria-hidden="true" size={18} />
            <input
              autoComplete="email"
              id="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="superadmin@gmail.com"
              type="email"
              value={email}
            />
          </div>

          <label className="field-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="input-wrap">
            <LockKeyhole aria-hidden="true" size={18} />
            <input
              autoComplete="current-password"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              type="password"
              value={password}
            />
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={isSubmitting || !email.trim() || !password} type="submit">
            <span>{isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập'}</span>
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </form>
      </motion.section>
    </main>
  )
}