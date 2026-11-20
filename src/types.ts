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
  // A super admin may delete it: report creation is paused for its quarter and its report was never sent off to be created (no PDF, no email).
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
  // Rows matching the filters across all pages.
  totalCount: number
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

// Read-only: report creation paused for every quarter by the technical team (set on the
// server), with the number of people still waiting for their report.
export type ReportGenerationSettings = {
  globalPaused: boolean
  unfinishedJobs: number
}

export type Bilingual = { en: string; vi: string }

// One survey quarter ("Quý khảo sát"): its card under the survey intro and its own switch
// for creating reports.
export type SurveyQuarterAdmin = {
  deferredResultDays: number
  description: Bilingual
  id: string
  imageUrl: string | null
  isVisible: boolean
  label: Bilingual
  reportGenerationEnabled: boolean
  sortOrder: number
  submissionCount: number
  surveyVersion: string
  title: Bilingual
  updatedAt: string
  updatedByEmail: string | null
  waitingReports: number
}

export type SurveyQuarterPageContent = {
  description: Bilingual
  kicker: Bilingual
  title: Bilingual
  updatedAt: string | null
  updatedByEmail: string | null
}

export type SurveyQuarterAdminList = {
  globalPaused: boolean
  page: SurveyQuarterPageContent
  quarters: SurveyQuarterAdmin[]
}

export type SurveyQuarterUpdate = Pick<SurveyQuarterAdmin, 'deferredResultDays' | 'description' | 'isVisible' | 'reportGenerationEnabled' | 'sortOrder' | 'title'>

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
  // Per survey quarter, e.g. { "2026Q3": 2, "2026Q4": 5 }.
  submissionCountsByVersion: Record<string, number>
  // In every quarter; a source can only be deleted while this is 0.
  totalSubmissionCount: number
  updatedAt: string
  updatedBy: AdminPerson | null
}

export type SurveySourceList = {
  items: SurveySource[]
  unattributedByVersion: Record<string, number>
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

export type ReportLanguage = 'vi' | 'en'

export type QuarterlyReportFileInfo = {
  fileName: string
  fileSize: number
  uploadedAt: string
}

// One quarter of "Báo cáo quý": its card on /bao-cao-quy and its Vietnamese and English PDF.
export type QuarterlyReportAdmin = {
  description: Bilingual
  // People who filled in the download form for this quarter.
  downloadRequests: number
  files: Record<ReportLanguage, QuarterlyReportFileInfo | null>
  id: string
  imageUrl: string | null
  // Shown on /bao-cao-quy: visible and has at least one PDF.
  isListed: boolean
  isVisible: boolean
  label: Bilingual
  periodQuarter: number
  periodYear: number
  slug: string
  sortOrder: number
  title: Bilingual
  updatedAt: string
  updatedByEmail: string | null
}

export type QuarterlyReportAdminList = {
  page: SurveyQuarterPageContent
  reports: QuarterlyReportAdmin[]
}

export type QuarterlyReportUpdate = Pick<QuarterlyReportAdmin, 'description' | 'isVisible' | 'sortOrder' | 'title'>

export type QuarterlyReportDownloadListItem = {
  downloadCount: number
  email: string
  fullName: string
  id: string
  // PDFs this person downloaded.
  languages: ReportLanguage[]
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

// ---- News ("Tin tức") ----------------------------------------------------------------

export type NewsPostStatus = 'draft' | 'published' | 'hidden'
export type NewsStatusFilter = 'all' | NewsPostStatus | 'scheduled'

// A post body as the editor keeps it (TipTap JSON); the server checks and cleans it.
export type NewsDoc = { content?: unknown[]; type: 'doc' }

export type NewsCategory = {
  createdAt: string
  description: Bilingual
  id: string
  isVisible: boolean
  name: Bilingual
  postCount: number
  publicPostCount: number
  slug: string
  sortOrder: number
  updatedAt: string
  updatedByEmail: string | null
}

export type NewsCategoryInput = {
  description: Bilingual
  isVisible: boolean
  name: Bilingual
  slug?: string
  sortOrder: number
}

export type NewsPostListItem = {
  category: { id: string; name: Bilingual }
  coverImageId: string | null
  hasEnglish: boolean
  id: string
  isPinned: boolean
  publishedAt: string | null
  slug: string
  status: NewsPostStatus
  title: Bilingual
  updatedAt: string
  updatedBy: AdminPerson
  viewCount: number
}

export type NewsPostList = { items: NewsPostListItem[]; page: number; pageSize: number; total: number }

export type NewsPostFields = {
  author: Bilingual
  categoryId: string
  content: { en: NewsDoc; vi: NewsDoc }
  coverAlt: Bilingual
  coverImageId: string | null
  excerpt: Bilingual
  isPinned: boolean
  publishedAt: string | null
  seoDescription: Bilingual
  seoTitle: Bilingual
  slug: string
  source: { name: string; url: string }
  status: NewsPostStatus
  tags: { en: string[]; vi: string[] }
  title: Bilingual
}

export type NewsPostInput = NewsPostFields & { version?: number }

export type NewsPostAdmin = Omit<NewsPostFields, 'categoryId'> & {
  category: { id: string; isVisible: boolean; name: Bilingual; slug: string }
  coverUrl: string | null
  createdAt: string
  createdBy: AdminPerson
  id: string
  previousSlugs: string[]
  readingMinutes: { en: number; vi: number }
  updatedAt: string
  updatedBy: AdminPerson
  version: number
  viewCount: number
}
