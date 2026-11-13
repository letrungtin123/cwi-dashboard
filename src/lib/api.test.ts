import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliveryStatus, mockFetch } from '@/test/fixtures'
import { ApiError, MAX_UPLOAD_BYTES, uploadQuarterlyReport, uploadReportPdf } from './api'

function pdf(size: number) {
  const file = new File(['%PDF'], 'bao-cao.pdf', { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const uploadPath = 'PUT /api/v1/admin/report-delivery/submissions/s-1/report-pdf'

describe('file uploads', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('refuses a file over the server limit before sending anything', async () => {
    const { fetchMock } = mockFetch({})
    await expect(uploadReportPdf('s-1', pdf(MAX_UPLOAD_BYTES + 1))).rejects.toMatchObject({ code: 'file_too_large', status: 413 })
    await expect(uploadQuarterlyReport({ activate: false, file: pdf(MAX_UPLOAD_BYTES + 1), periodQuarter: 3, periodYear: 2026, subtitle: '', title: 'Q3' })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('explains a 413 page from the web server in plain words', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body>413 Request Entity Too Large</body></html>', { headers: { 'content-type': 'text/html' }, status: 413 })))
    await expect(uploadReportPdf('s-1', pdf(1024))).rejects.toThrow('File quá lớn. Hệ thống chỉ nhận file tối đa 20 MB.')
  })

  it('sends the file as form data with the CSRF header, not as JSON', async () => {
    const { calls } = mockFetch({ [uploadPath]: { body: { data: deliveryStatus() }, status: 200 } })
    const result = await uploadReportPdf('s-1', pdf(1024))
    expect(result.submissionId).toBe('s-1')
    const headers = new Headers(calls[0]!.init?.headers)
    expect(calls[0]!.init?.body).toBeInstanceOf(FormData)
    expect(headers.has('content-type')).toBe(false)
    expect(headers.has('x-csrf-token')).toBe(true)
  })

  it('keeps the server message when the upload is refused', async () => {
    mockFetch({ [uploadPath]: { body: { error: { code: 'report_pdf_locked', message: 'File PDF đã khóa.' } }, status: 409 } })
    await expect(uploadReportPdf('s-1', pdf(1024))).rejects.toThrow('File PDF đã khóa.')
  })

  it('falls back to the upload message when the server gives none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Bad gateway', { status: 502 })))
    await expect(uploadReportPdf('s-1', pdf(1024))).rejects.toThrow('Không tải được file PDF lên.')
  })
})
