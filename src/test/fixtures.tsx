import { vi } from 'vitest'
import type { AdminRole, ReportDeliveryStatus, ReportSummary } from '@/types'

type Route = { status: number; body?: unknown }

// Replaces window.fetch with a router keyed by "METHOD /path" (query string ignored).
// Unknown requests answer 404 so a test fails loudly instead of hanging.
export function mockFetch(routes: Record<string, Route | ((init?: RequestInit) => Route)>) {
  const calls: { method: string; path: string; init?: RequestInit }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ init, method, path: url.pathname })
    const entry = routes[`${method} ${url.pathname}`]
    const route = typeof entry === 'function' ? entry(init) : entry ?? { body: { error: { code: 'not_found', message: 'Not found' } }, status: 404 }
    return new Response(route.status === 204 ? null : JSON.stringify(route.body ?? {}), {
      headers: { 'content-type': 'application/json' },
      status: route.status,
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

export function sessionFor(role: AdminRole) {
  return {
    body: { data: { csrfToken: 'csrf-test', expiresAt: '2099-01-01T00:00:00.000Z', user: { displayName: 'Người thử', email: 'test@example.com', id: 'u-1', role } } },
    status: 200,
  }
}

export function reportSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return { errorMessage: null, jobId: 'job-1', label: 'Đã tạo báo cáo', pdfAvailable: true, pdfDownloadUrl: '/api/v1/admin/report-jobs/job-1/pdf', status: 'completed', updatedAt: null, ...overrides }
}

export function deliveryStatus(overrides: Partial<ReportDeliveryStatus> = {}): ReportDeliveryStatus {
  return {
    emailLastError: null,
    emailSentAt: null,
    emailStatus: 'not_sent',
    file: { available: true, downloadUrl: '/api/v1/admin/report-delivery/submissions/s-1/report-pdf', fileName: 'bao-cao.pdf', fileSize: 1024, lockedAt: null, uploadedAt: null },
    submissionId: 's-1',
    ...overrides,
  }
}
