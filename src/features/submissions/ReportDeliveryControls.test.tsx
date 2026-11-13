import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { deliveryStatus, mockFetch, reportSummary, sessionFor } from '@/test/fixtures'
import type { AdminRole } from '@/types'
import { ReportDeliveryTableCell } from './ReportDeliveryControls'

afterEach(() => {
  vi.unstubAllGlobals()
})

// Renders children only once the session (and so the role) is known.
function WhenSignedIn({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  return status === 'authenticated' ? <div data-testid="cell">{children}</div> : null
}

async function renderCell(role: AdminRole, actionOnly: boolean) {
  mockFetch({ 'GET /api/v1/auth/me': sessionFor(role) })
  const view = render(
    <AuthProvider>
      <WhenSignedIn>
      <ReportDeliveryTableCell actionOnly={actionOnly} onChanged={() => undefined} onReportRetry={async () => undefined} report={reportSummary()} status={deliveryStatus({ emailStatus: 'failed' })} submissionId="s-1" />
      </WhenSignedIn>
    </AuthProvider>,
  )
  await screen.findByTestId('cell')
  return view
}

describe('report delivery cell by role', () => {
  it('admins get upload, resend and download actions', async () => {
    await renderCell('admin', true)
    expect(await screen.findByRole('button', { name: 'Thay file PDF' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gửi lại email' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tải file PDF' })).toBeTruthy()
  })

  it('viewers get no action at all (action column)', async () => {
    const { container } = await renderCell('viewer', true)
    expect(container.querySelectorAll('button, a').length).toBe(0)
  })

  it('viewers see the file name but no buttons or links (mobile card)', async () => {
    const { container } = await renderCell('viewer', false)
    expect(container.textContent).toContain('bao-cao.pdf')
    expect(container.querySelectorAll('button, a').length).toBe(0)
  })
})
