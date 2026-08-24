export type AdminRole = 'admin' | 'viewer'

export type AdminUser = {
  displayName: string | null
  email: string
  id: string
  role: AdminRole
}

export type AuthSession = {
  csrfToken?: string
  expiresAt: string
  user: AdminUser
}

export type SubmissionStatus = 'part1_only' | 'part2_refused_privacy' | 'full_private_report'
export type PrivacyConsent = 'yes' | 'no' | 'not_applicable'
export type ReportStatus = 'not_started' | 'generating' | 'completed' | 'failed' | 'skipped'

export type ReportSummary = {
  errorMessage: string | null
  jobId: string | null
  label: string
  pdfAvailable: boolean
  pdfDownloadUrl: string | null
  status: ReportStatus
  updatedAt: string | null
}

export type SubmissionListItem = {
  answersCount: number
  email: string
  fullName: string
  id: string
  part1Completed: boolean
  part2Completed: boolean
  position: string
  privacyConsent: PrivacyConsent
  report: ReportSummary
  roundtableRegistered: boolean
  statusNote: string
  submittedAt: string
  submissionStatus: SubmissionStatus
}

export type SubmissionAnswer = {
  answerText: string
  answerValue: unknown
  idx: number
  otherText: string | null
  part: number
  questionText: string
  questionType: string
}

export type SubmissionDetail = SubmissionListItem & {
  answers: SubmissionAnswer[]
  roundtableRegistration: {
    email: string
    fullName: string
    id: string
    position: string | null
    registeredAt: string
  } | null
}

export type CursorPage<T> = {
  hasNextPage: boolean
  items: T[]
  nextCursor: string | null
}

export type SubmissionStats = {
  fullPrivateReport: number
  part1Only: number
  part2RefusedPrivacy: number
  roundtableRegistered: number
  totalSubmissions: number
}

export type SubmissionFilters = {
  before?: string
  beforeId?: string
  cursor?: string
  limit?: number
  roundtable?: 'true' | 'false'
  search?: string
  status?: SubmissionStatus
}

export type RoundtableLinkStatus = 'linked' | 'standalone'

export type RoundtableSubmissionSummary = {
  answersCount: number
  email: string
  fullName: string
  id: string
  position: string
  privacyConsent: PrivacyConsent
  report: ReportSummary
  statusNote: string
  submittedAt: string
  submissionStatus: SubmissionStatus
}

export type RoundtableRegistrationListItem = {
  email: string
  fullName: string
  id: string
  linkedSubmission: RoundtableSubmissionSummary | null
  position: string | null
  registeredAt: string
  source: string
}

export type RoundtableRegistrationDetail = RoundtableRegistrationListItem & {
  clientMeta: Record<string, unknown>
  surveySubmissionIdempotencyKey: string | null
  userAgent: string | null
}

export type RoundtableRegistrationStats = {
  linkedSubmissions: number
  standaloneRegistrations: number
  todayRegistrations: number
  totalRegistrations: number
}

export type RoundtableRegistrationFilters = {
  before?: string
  beforeId?: string
  cursor?: string
  limit?: number
  linkStatus?: RoundtableLinkStatus
  search?: string
}
