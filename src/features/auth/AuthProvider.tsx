import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, getCurrentSession, login as loginRequest, logout as logoutRequest } from '@/lib/api'
import type { AdminUser } from '@/types'

type AuthStatus = 'authenticated' | 'checking' | 'guest' | 'unavailable'

type AuthContextValue = {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retrySession: () => Promise<void>
  status: AuthStatus
  user: AdminUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AdminUser | null>(null)

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

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
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
      status,
      user,
    }),
    [login, logout, refresh, status, user],
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
