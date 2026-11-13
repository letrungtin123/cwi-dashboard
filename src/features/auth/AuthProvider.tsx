import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, getCurrentSession, login as loginRequest, logout as logoutRequest, SESSION_EXPIRED_EVENT } from '@/lib/api'
import type { AdminUser } from '@/types'

type AuthStatus = 'authenticated' | 'checking' | 'guest' | 'unavailable'

type AuthContextValue = {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // The user was sent back to sign-in because the session ended on the server.
  sessionExpired: boolean
  retrySession: () => Promise<void>
  status: AuthStatus
  user: AdminUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const userRef = useRef<AdminUser | null>(null)
  useEffect(() => {
    userRef.current = user
  }, [user])

  const refresh = useCallback(async () => {
    try {
      const session = await getCurrentSession()
      setUser(session.user)
      setStatus('authenticated')
    } catch (error) {
      setUser(null)
      setStatus(error instanceof ApiError && (error.status === 401 || error.status === 403) ? 'guest' : 'unavailable')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleExpired = () => {
      if (userRef.current) setSessionExpired(true)
      setUser(null)
      setStatus('guest')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password)
    setSessionExpired(false)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Signing out locally still works; the server session expires on its own.
    } finally {
      setUser(null)
      setStatus('guest')
    }
  }, [])

  const value = useMemo(
    () => ({
      login,
      logout,
      retrySession: refresh,
      sessionExpired,
      status,
      user,
    }),
    [login, logout, refresh, sessionExpired, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
