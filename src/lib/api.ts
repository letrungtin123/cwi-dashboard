import type {
  AuthSession,
  CursorPage,
  RoundtableRegistrationDetail,
  RoundtableRegistrationFilters,
  RoundtableRegistrationListItem,
  RoundtableRegistrationStats,
  SubmissionDetail,
  SubmissionFilters,
  SubmissionListItem,
  SubmissionStats,
  ReportDeliveryCampaign,
  ReportDeliveryStatus,
} from '@/types'
import type { ExportDataset, ExportFilters, ExportJob } from '@/types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '')
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'cwi_admin_csrf'

let csrfTokenMemory = ''

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type ApiEnvelope<T> = {
  data: T
}

function readCookie(name: string) {
  const encodedName = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName))

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : ''
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function setCsrfToken(token: string) {
  csrfTokenMemory = token
}

function getCsrfToken() {
  return csrfTokenMemory || readCookie(CSRF_COOKIE_NAME)
}

async function request<T>(path: string, init: RequestInit = {}, options: { csrf?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const hasBody = init.body !== undefined

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  if (options.csrf) {
    headers.set('x-csrf-token', getCsrfToken())
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | { error?: { code?: string; message?: string } } | null

  if (!response.ok) {
    const error = payload && 'error' in payload ? payload.error : undefined
    throw new ApiError(response.status, error?.code ?? 'request_failed', error?.message ?? 'Yêu cầu không thành công.')
  }

  if (!payload || !('data' in payload)) {
    throw new ApiError(response.status, 'invalid_response', 'Phản hồi từ hệ thống không hợp lệ.')
  }

  return payload.data
}

export async function login(email: string, password: string) {
  const session = await request<AuthSession>('/api/v1/auth/login', {
    body: JSON.stringify({ email, password }),
    method: 'POST',
  })

  if (session.csrfToken) {
    setCsrfToken(session.csrfToken)
  }

  return session
}

export function getCurrentSession() {
  return request<AuthSession>('/api/v1/auth/me')
}

export async function logout() {
  await request<void>('/api/v1/auth/logout', { method: 'POST' }, { csrf: true })
  csrfTokenMemory = ''
}

function buildSubmissionQuery(filters: SubmissionFilters) {
  const params = new URLSearchParams()
  params.set('limit', String(filters.limit ?? 10))

  if (filters.cursor) params.set('cursor', filters.cursor)
  else {
    if (filters.before) params.set('before', filters.before)
    if (filters.beforeId) params.set('beforeId', filters.beforeId)
  }
  if (filters.status) params.set('status', filters.status)
  if (filters.roundtable) params.set('roundtable', filters.roundtable)
  if (filters.search) params.set('search', filters.search)

  return params.toString()
}

function buildRoundtableQuery(filters: RoundtableRegistrationFilters) {
  const params = new URLSearchParams()
  params.set('limit', String(filters.limit ?? 10))

  if (filters.cursor) params.set('cursor', filters.cursor)
  else {
    if (filters.before) params.set('before', filters.before)
    if (filters.beforeId) params.set('beforeId', filters.beforeId)
  }
  if (filters.linkStatus) params.set('linkStatus', filters.linkStatus)
  if (filters.search) params.set('search', filters.search)

  return params.toString()
}

export function listSubmissionsPage(filters: SubmissionFilters = {}) {
  return request<CursorPage<SubmissionListItem>>('/api/v1/admin/survey-submissions/page?' + buildSubmissionQuery(filters))
}

export function listSubmissions(filters: SubmissionFilters = {}) {
  return request<SubmissionListItem[]>(`/api/v1/admin/survey-submissions?${buildSubmissionQuery(filters)}`)
}

export function getSubmissionStats() {
  return request<SubmissionStats>('/api/v1/admin/survey-submissions/stats')
}

export function getSubmissionDetail(id: string) {
  return request<SubmissionDetail>(`/api/v1/admin/survey-submissions/${id}`)
}

export function listRoundtableRegistrationsPage(filters: RoundtableRegistrationFilters = {}) {
  return request<CursorPage<RoundtableRegistrationListItem>>('/api/v1/admin/roundtable-registrations/page?' + buildRoundtableQuery(filters))
}

export function listRoundtableRegistrations(filters: RoundtableRegistrationFilters = {}) {
  return request<RoundtableRegistrationListItem[]>(`/api/v1/admin/roundtable-registrations?${buildRoundtableQuery(filters)}`)
}

export function getRoundtableRegistrationStats() {
  return request<RoundtableRegistrationStats>('/api/v1/admin/roundtable-registrations/stats')
}

export function getRoundtableRegistrationDetail(id: string) {
  return request<RoundtableRegistrationDetail>(`/api/v1/admin/roundtable-registrations/${id}`)
}


export function createExportJob(input: { dataset: ExportDataset; filters: ExportFilters }) {
  return request<ExportJob>('/api/v1/admin/exports', {
    body: JSON.stringify(input),
    method: 'POST',
  }, { csrf: true })
}

export function getExportJob(id: string) {
  return request<ExportJob>('/api/v1/admin/exports/' + encodeURIComponent(id))
}

export function getExportDownloadUrl(id: string) {
  return apiUrl("/api/v1/admin/exports/" + encodeURIComponent(id) + "/download")
}

export async function downloadExportFile(id: string) {
  const response = await fetch(apiUrl('/api/v1/admin/exports/' + encodeURIComponent(id) + '/download'), {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new ApiError(response.status, 'export_download_failed', 'Không tải được file dữ liệu.')
  }
  return response.blob()
}



export function getReportDeliveryStatuses(ids: string[]) {
  const params = new URLSearchParams({ ids: ids.join(',') })
  return request<ReportDeliveryStatus[]>('/api/v1/admin/report-delivery/submissions/status?' + params.toString())
}

export function getReportDeliveryStatus(id: string) {
  return request<ReportDeliveryStatus>(`/api/v1/admin/report-delivery/submissions/${encodeURIComponent(id)}/status`)
}

export function previewReportDeliveryCampaign() {
  return request<ReportDeliveryCampaign>('/api/v1/admin/report-delivery/campaigns/preview', { method: 'POST' }, { csrf: true })
}

export function confirmReportDeliveryCampaign(id: string) {
  return request<ReportDeliveryCampaign>(`/api/v1/admin/report-delivery/campaigns/${encodeURIComponent(id)}/confirm`, { method: 'POST' }, { csrf: true })
}

export function getReportDeliveryCampaign(id: string) {
  return request<ReportDeliveryCampaign>(`/api/v1/admin/report-delivery/campaigns/${encodeURIComponent(id)}`)
}

export async function uploadReportPdf(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const headers = new Headers({ 'x-csrf-token': getCsrfToken() })
  const response = await fetch(apiUrl(`/api/v1/admin/report-delivery/submissions/${encodeURIComponent(id)}/report-pdf`), {
    body: formData,
    credentials: 'include',
    headers,
    method: 'PUT',
  })
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<ReportDeliveryStatus> | { error?: { code?: string; message?: string } } | null
  if (!response.ok) {
    const error = payload && 'error' in payload ? payload.error : undefined
    throw new ApiError(response.status, error?.code ?? 'report_pdf_upload_failed', error?.message ?? 'Không tải được file PDF lên.')
  }
  if (!payload || !('data' in payload)) throw new ApiError(response.status, 'invalid_response', 'Phản hồi từ hệ thống không hợp lệ.')
  return payload.data
}
