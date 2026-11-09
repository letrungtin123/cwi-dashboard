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
export type SurveyLanguage = 'vi' | 'en'

export type ReportSummary = {
  errorMessage: string | null
  /** True while report creation is paused and this report is still waiting. */
  generationPaused?: boolean
  jobId: string | null
  label: string
  pdfAvailable: boolean
  pdfDownloadUrl: string | null
  status: ReportStatus
  updatedAt: string | null
}

export type SubmissionListItem = {
  answersCount: number
  companyName: string | null
  email: string
  fullName: string
  id: string
  // Language the survey was taken in; answers are stored in Vietnamese either way.
  language: SurveyLanguage
  part1Completed: boolean
  part2Completed: boolean
  position: string
  privacyConsent: PrivacyConsent
  report: ReportSummary
  roundtableRegistered: boolean
  phone: string | null
  statusNote: string
  submittedAt: string
  submissionStatus: SubmissionStatus
  surveyVersion: string
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
  surveyVersions: Array<{ surveyVersion: string; totalSubmissions: number }>
  totalSubmissions: number
}

export type SubmissionFilters = {
  before?: string
  beforeId?: string
  cursor?: string
  limit?: number
  reportStatus?: ReportStatus
  reportPdfUploaded?: boolean
  emailStatus?: 'failed'
  roundtable?: 'true' | 'false'
  search?: string
  status?: SubmissionStatus
  surveyVersion?: string
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
  companyName: string | null
  email: string
  fullName: string
  id: string
  linkedSubmission: RoundtableSubmissionSummary | null
  phone: string | null
  position: string | null
  // Roundtable quarter; null for Webinar registrations.
  quarter: string | null
  registeredAt: string
  source: string
  speakerQuestion: string | null
}

export type RoundtableRegistrationDetail = RoundtableRegistrationListItem & {
  clientMeta: Record<string, unknown>
  surveySubmissionIdempotencyKey: string | null
  userAgent: string | null
}

export type RoundtableRegistrationStats = {
  linkedSubmissions: number
  // Roundtable only: every quarter with registrations, newest first.
  quarters?: Array<{ quarter: string; totalRegistrations: number }>
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
  quarter?: string
  search?: string
}

export type RoundtableEvent = {
  eventLocation: string | null
  eventTime: string | null
  quarter: string
  updatedAt: string | null
  updatedByEmail: string | null
}

// Dashboard switch for calling cwi-ai. While off, new submissions are stored and the
// survey says the report arrives by email within deferredResultDays.
export type ReportGenerationSettings = {
  aiCallsEnabled: boolean
  deferredResultDays: number
  unfinishedJobs: number
  updatedAt: string | null
  updatedByEmail: string | null
}

export type WebinarLinkStatus = RoundtableLinkStatus
export type WebinarSubmissionSummary = RoundtableSubmissionSummary
export type WebinarRegistrationListItem = RoundtableRegistrationListItem
export type WebinarRegistrationDetail = RoundtableRegistrationDetail
export type WebinarRegistrationStats = RoundtableRegistrationStats
export type WebinarRegistrationFilters = RoundtableRegistrationFilters

export type QuarterlyReportAdmin = {
  fileName: string
  fileSize: number
  id: string
  isActive: boolean
  periodQuarter: number
  periodYear: number
  slug: string
  subtitle: string
  title: string
  uploadedAt: string
  uploadedBy: string
}

export type QuarterlyReportDownloadListItem = {
  downloadCount: number
  email: string
  fullName: string
  id: string
  lastDownloadedAt: string | null
  phone: string
  position: string
  reportPeriod: string
  reportSlug: string
  requestedAt: string
}

export type QuarterlyReportDownloadStats = {
  downloadedCount: number
  todayRequests: number
  totalRequests: number
}

export type QuarterlyReportDownloadFilters = {
  cursor?: string
  limit?: number
  search?: string
}

export type ExportDataset = 'submissions' | 'roundtable' | 'webinar'

export type ExportFilters = {
  linkStatus?: 'linked' | 'standalone'
  quarter?: string
  roundtableRegistered?: boolean
  search?: string
  status?: SubmissionStatus
  surveyVersion?: string
}

export type ExportJob = {
  createdAt: string
  dataset: ExportDataset
  errorMessage: string | null
  expiresAt: string
  fileName: string | null
  fileSize: number | null
  id: string
  rowCount: number | null
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'expired'
}



export type ReportDeliveryFile = {
  available: boolean
  fileName: string | null
  fileSize: number | null
  uploadedAt: string | null
  lockedAt: string | null
  downloadUrl: string | null
}

export type ReportDeliveryStatus = {
  emailStatus: 'not_sent' | 'queued' | 'sending' | 'sent' | 'failed' | 'unknown' | 'not_ready'
  emailSentAt: string | null
  emailLastError: string | null
  file: ReportDeliveryFile
  submissionId: string
}

export type ReportDeliveryCampaign = {
  completedAt: string | null
  createdAt: string
  eligibleUsers: number
  errorCode: string | null
  errorMessage: string | null
  failedCount: number
  id: string
  missingPdfUsers: number
  unknownCount: number
  queuedCount: number
  sentCount: number
  snapshotAt: string
  startedAt: string | null
  status: 'draft' | 'queued' | 'dispatching' | 'sending' | 'completed' | 'failed' | 'expired'
  totalUsers: number
  expiresAt: string
}
