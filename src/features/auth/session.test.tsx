import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSubmissionStats, SESSION_EXPIRED_EVENT } from '@/lib/api'
import { mockFetch, sessionFor } from '@/test/fixtures'
import { AuthProvider, useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'

function Status() {
  const { status, user } = useAuth()
  return <p>{status}:{user?.role ?? 'none'}</p>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session expiry', () => {
  it('a 401 from an admin API returns to sign-in', async () => {
    mockFetch({
      'GET /api/v1/auth/me': sessionFor('admin'),
      'GET /api/v1/admin/survey-submissions/stats': { body: { error: { code: 'unauthorized', message: 'Hết phiên' } }, status: 401 },
    })
    render(<AuthProvider><Status /></AuthProvider>)
    await screen.findByText('authenticated:admin')

    await act(async () => {
      await getSubmissionStats(undefined).catch(() => undefined)
    })

    await screen.findByText('guest:none')
  })

  it('a 401 from /auth/me (not signed in yet) does not count as an expired session', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    mockFetch({ 'GET /api/v1/auth/me': { body: { error: { code: 'unauthorized' } }, status: 401 } })
    render(<AuthProvider><Status /></AuthProvider>)
    await screen.findByText('guest:none')
    expect(onExpired).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })

  it('the sign-in screen explains that the session expired', async () => {
    mockFetch({
      'GET /api/v1/auth/me': sessionFor('viewer'),
      'GET /api/v1/admin/survey-submissions/stats': { status: 401 },
    })
    function Screen() {
      const { status } = useAuth()
      return status === 'authenticated' ? <p>dashboard</p> : status === 'guest' ? <LoginPage /> : null
    }
    render(<AuthProvider><Screen /></AuthProvider>)
    await screen.findByText('dashboard')
    await act(async () => {
      await getSubmissionStats(undefined).catch(() => undefined)
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Phiên đăng nhập đã hết hạn'))
  })
})
