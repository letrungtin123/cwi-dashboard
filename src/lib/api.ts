import type { AuthSession, SubmissionDetail, SubmissionFilters, SubmissionListItem, SubmissionStats } from '@/types'

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    throw new ApiError(response.status, error?.code ?? 'request_failed', error?.message ?? 'Request failed.')
  }

  if (!payload || !('data' in payload)) {
    throw new ApiError(response.status, 'invalid_response', 'API response is invalid.')
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

function buildQuery(filters: SubmissionFilters) {
  const params = new URLSearchParams()
  params.set('limit', String(filters.limit ?? 50))

  if (filters.before) params.set('before', filters.before)
  if (filters.status) params.set('status', filters.status)
  if (filters.roundtable) params.set('roundtable', filters.roundtable)
  if (filters.search) params.set('search', filters.search)

  return params.toString()
}

export function listSubmissions(filters: SubmissionFilters = {}) {
  return request<SubmissionListItem[]>(`/api/v1/admin/survey-submissions?${buildQuery(filters)}`)
}

export function getSubmissionStats() {
  return request<SubmissionStats>('/api/v1/admin/survey-submissions/stats')
}

export function getSubmissionDetail(id: string) {
  return request<SubmissionDetail>(`/api/v1/admin/survey-submissions/${id}`)
}