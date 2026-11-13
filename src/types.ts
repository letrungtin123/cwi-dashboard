// superadmin: everything an admin can do, plus managing admin accounts.
export type AdminRole = 'superadmin' | 'admin' | 'viewer'

export type AdminPerson = {
  email: string | null
  name: string | null
}

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

// Invitation source whose survey link the respondent used.
export type SubmissionSource = {
  code: string
  id: string
  isActive: boolean
  name: string
}

export type SubmissionListItem = {
  answersCount: number
  companyName: string | null
  // A super admin may delete it: its report is still "Chờ tạo báo cáo" (no PDF).
  deletable: boolean
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
  // Null when the survey was opened without a source link.
  source: SubmissionSource | null
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
  // A source id, or 'none' for submissions without a source link.
  sourceId?: string
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

export type SurveySource = {
  code: string
  createdAt: string
  createdBy: AdminPerson | null
  id: string
  isActive: boolean
  lastSubmittedAt: string | null
  name: string
  note: string | null
  // In the selected survey quarter (every quarter when none is selected).
  submissionCount: number
  // In every quarter; a source can only be deleted while this is 0.
  totalSubmissionCount: number
  updatedAt: string
  updatedBy: AdminPerson | null
}

export type SurveySourceList = {
  items: SurveySource[]
  unattributedSubmissions: number
}

// One change from the admin audit log (newest first).
export type AuditEntry = {
  action: string
  actor: AdminPerson
  createdAt: string
  id: string
  metadata: Record<string, unknown>
}

export type AdminAccount = {
  createdAt: string
  createdBy: AdminPerson | null
  displayName: string | null
  email: string
  id: string
  isActive: boolean
  lastLoginAt: string | null
  role: AdminRole
}

export type SubmissionDeletionItem = {
  companyName: string | null
  deletable: boolean
  email: string
  fullName: string
  id: string
  roundtableRegistrations: number
  sourceName: string | null
  submissionStatus: string
  submittedAt: string
  surveyVersion: string
  webinarRegistrations: number
}

export type AdminAccountWithPassword = {
  account: AdminAccount
  // Shown once; the system does not keep it.
  temporaryPassword: string
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
  emailStatus?: 'failed'
  linkStatus?: 'linked' | 'standalone'
  quarter?: string
  reportStatus?: ReportStatus
  roundtableRegistered?: boolean
  search?: string
  sourceId?: string
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
