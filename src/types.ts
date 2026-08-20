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
  overallScore: number
  part1Completed: boolean
  part2Completed: boolean
  position: string
  privacyConsent: PrivacyConsent
  report: ReportSummary
  roundtableRegistered: boolean
  scaleScore: number
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
  clientMeta: Record<string, unknown>
  domainScores: unknown
  roundtableRegistration: {
    email: string
    fullName: string
    registeredAt: string
  } | null
  source: string
}

export type SubmissionStats = {
  averageOverallScore: number
  averageScaleScore: number
  fullPrivateReport: number
  part1Only: number
  part2RefusedPrivacy: number
  roundtableRegistered: number
  totalSubmissions: number
}

export type SubmissionFilters = {
  before?: string
  limit?: number
  roundtable?: 'true' | 'false'
  search?: string
  status?: SubmissionStatus
}