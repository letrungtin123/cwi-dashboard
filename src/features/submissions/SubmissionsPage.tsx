import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Eye,
  FileText,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import { ExportDataButton } from '@/components/ExportDataButton'
import { ReportDeliveryCampaignDialog } from './ReportDeliveryCampaignDialog'
import { ReportDeliveryFileStatus, ReportDeliveryTableCell } from './ReportDeliveryControls'
import { ReportGenerationSettings } from './ReportGenerationSettings'
import { CustomSelect, type SelectOption } from '@/components/CustomSelect'
import { TablePagination } from '@/components/TablePagination'
import { EmptyState, privacyConsentLabels, ReportBadge, ReportDownloadLink, SkeletonLine, StatsSkeleton, StatTile, StatusBadge } from '@/components/DataDisplay'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import { confirmReportDeliveryCampaign, getReportDeliveryCampaign, getReportDeliveryStatuses, getSubmissionDetail, getSubmissionStats, listSubmissionsPage, listSurveySources, previewReportDeliveryCampaign } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDateTime, formatNumber, valueToText } from '@/lib/format'
import { canManageContent, isSuperadmin } from '@/lib/roles'
import { SubmissionDeleteDialog } from './SubmissionDeleteDialog'
import type { ExportFilters, ReportDeliveryCampaign, ReportDeliveryStatus, ReportStatus, SubmissionDetail, SubmissionFilters, SubmissionListItem, SubmissionStats, SubmissionStatus, SurveyLanguage, SurveySource } from '@/types'

type StatusOption = 'all' | SubmissionStatus
type ReportStatusOption = 'all' | ReportStatus
type EmailStatusOption = 'all' | 'failed'
type PageCursor = { before: string; beforeId: string } | null

const defaultPageSize = 10
const searchDebounceMs = 350



const statusOptions: Array<SelectOption<StatusOption>> = [
  { description: 'Hiển thị toàn bộ lượt gửi', label: 'Tất cả trạng thái', value: 'all' },
  { description: 'Người gửi chỉ nhận báo cáo Phần 1', label: 'Chỉ Phần 1', value: 'part1_only' },
  { description: 'Đã làm Phần 2 nhưng không đồng ý bảo mật', label: 'Phần 2 không đồng ý', value: 'part2_refused_privacy' },
  { description: 'Đồng ý bảo mật và gửi đủ hai phần', label: 'Gửi đủ hai phần', value: 'full_private_report' },
]

const reportStatusOptions: Array<SelectOption<ReportStatusOption>> = [
  { description: 'Không lọc theo trạng thái tạo báo cáo', label: 'Tất cả', value: 'all' },
  { description: 'Chưa bắt đầu tạo báo cáo', label: 'Chưa tạo', value: 'not_started' },
  { description: 'Báo cáo đang được xử lý', label: 'Đang tạo', value: 'generating' },
  { description: 'Đã tạo xong báo cáo', label: 'Đã tạo', value: 'completed' },
  { description: 'Tạo báo cáo bị lỗi, có thể bấm "Tạo lại"', label: 'Tạo lỗi', value: 'failed' },
  { description: 'Lượt gửi không tạo báo cáo', label: 'Không tạo', value: 'skipped' },
]

const emailStatusOptions: Array<SelectOption<EmailStatusOption>> = [
  { description: 'Hiển thị tất cả trạng thái email', label: 'Tất cả email', value: 'all' },
  { description: 'Chỉ người gửi email bị lỗi', label: 'Gửi email lỗi', value: 'failed' },
]

// Quarters come from the stored submissions, so a new question set appears
// here as soon as its first submission is saved.
function buildSurveyVersionOptions(stats: SubmissionStats | null): Array<SelectOption<string>> {
  return [
    { description: 'Hiển thị lượt gửi của mọi bộ câu hỏi', label: 'Tất cả quý', value: 'all' },
    ...(stats?.surveyVersions ?? []).map((version) => ({
      description: `${formatNumber(version.totalSubmissions)} lượt gửi`,
      label: `Bộ ${version.surveyVersion}`,
      value: version.surveyVersion,
    })),
  ]
}

// 'none' lists submissions that came without a source link.
function buildSourceOptions(sources: SurveySource[]): Array<SelectOption<string>> {
  return [
    { description: 'Không lọc theo nguồn mời', label: 'Tất cả nguồn', value: 'all' },
    { description: 'Nộp qua link chung hoặc vào thẳng website', label: 'Không có nguồn mời', value: 'none' },
    ...sources.map((source) => ({
      description: source.isActive ? `${formatNumber(source.submissionCount)} bài nộp` : `Đã ngưng · ${formatNumber(source.submissionCount)} bài nộp`,
      label: source.name,
      value: source.id,
    })),
  ]
}

function buildFilters(search: string, status: StatusOption, reportStatus: ReportStatusOption, emailStatus: EmailStatusOption, surveyVersion: string, sourceFilter: string, limit: number, cursor: PageCursor): SubmissionFilters {
  return {
    before: cursor?.before,
    beforeId: cursor?.beforeId,
    limit,
    reportStatus: reportStatus === 'all' ? undefined : reportStatus,
    emailStatus: emailStatus === 'all' ? undefined : emailStatus,
    search: search || undefined,
    sourceId: sourceFilter === 'all' ? undefined : sourceFilter,
    status: status === 'all' ? undefined : status,
    surveyVersion: surveyVersion === 'all' ? undefined : surveyVersion,
  }
}

function questionTypeLabel(type: string) {
  if (type === 'likert') return 'Điểm 1-5'
  if (type === 'mcq') return 'Lựa chọn'
  if (type === 'url') return 'Đường dẫn'
  return 'Câu trả lời'
}


function LanguageBadge({ language }: { language: SurveyLanguage }) {
  return (
    <span className={`language-badge is-${language}`} title={language === 'en' ? 'Làm khảo sát bằng tiếng Anh' : 'Làm khảo sát bằng tiếng Việt'}>
      {language === 'en' ? 'EN' : 'VI'}
    </span>
  )
}


function DeliveryStatusBadge({ status }: { status: ReportDeliveryStatus | null }) {
  const emailStatus = status?.emailStatus ?? 'not_ready'
  if (emailStatus === 'sent') return <span className="delivery-badge is-sent">Đã gửi email</span>
  if (emailStatus === 'sending' || emailStatus === 'queued') return <span className="delivery-badge is-pending">Đang xử lý</span>
  if (emailStatus === 'failed') return <span className="delivery-badge is-failed">Gửi lỗi</span>
  if (emailStatus === 'unknown') return <span className="delivery-badge is-unknown">Cần kiểm tra</span>
  if (status?.file.available) return <span className="delivery-badge is-ready">Đã có PDF</span>
  return <span className="delivery-badge is-missing">Thiếu PDF</span>
}





function TableSkeleton() {
  return (
    <div className="table-loading" role="status" aria-label="Đang tải lượt gửi">
      <span className="sr-only">Đang tải lượt gửi</span>
      <div className="table-skeleton desktop-table">
        {Array.from({ length: 9 }, (_, index) => (
          <div className="table-skeleton-row" key={index}>
            <SkeletonLine className="skeleton-person" />
            <SkeletonLine className="skeleton-status" />
            <SkeletonLine className="skeleton-score" />
            <SkeletonLine className="skeleton-report" />
            <SkeletonLine className="skeleton-status" />
            <SkeletonLine className="skeleton-date" />
            <SkeletonLine className="skeleton-action" />
          </div>
        ))}
      </div>
      <div className="mobile-card-list mobile-skeleton">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="submission-card skeleton-card" key={index}>
            <SkeletonLine className="skeleton-person" />
            <SkeletonLine className="skeleton-status" />
            <SkeletonLine className="skeleton-score" />
          </article>
        ))}
      </div>
    </div>
  )
}

function DrawerSkeleton() {
  return (
    <div className="drawer-content drawer-skeleton" role="status" aria-label="Đang tải chi tiết">
      <SkeletonLine className="skeleton-drawer-title" />
      <SkeletonLine className="skeleton-drawer-line" />
      <SkeletonLine className="skeleton-drawer-line short" />
      {Array.from({ length: 6 }, (_, index) => (
        <div className="answer-item skeleton-answer" key={index}>
          <SkeletonLine className="skeleton-answer-index" />
          <div>
            <SkeletonLine className="skeleton-answer-question" />
            <SkeletonLine className="skeleton-answer-value" />
          </div>
        </div>
      ))}
    </div>
  )
}


const NOT_DELETABLE_TOOLTIP = 'Chỉ xóa được lượt gửi đang “Chờ tạo báo cáo” (chưa có PDF báo cáo).'

// Tick box for super admins; only rows whose report is still waiting can be ticked.
function RowSelectBox({ checked, item, onToggle }: { checked: boolean; item: SubmissionListItem; onToggle: (id: string) => void }) {
  const box = (
    <input
      aria-label={item.deletable ? `Chọn lượt gửi của ${item.fullName}` : `Không chọn được lượt gửi của ${item.fullName}`}
      checked={checked}
      className="row-select-box"
      disabled={!item.deletable}
      onChange={() => onToggle(item.id)}
      type="checkbox"
    />
  )
  return item.deletable ? box : <span className="row-select-wrap" data-tooltip={NOT_DELETABLE_TOOLTIP}>{box}</span>
}

type RowSelection = { onToggle: (id: string) => void; onToggleAll: () => void; selectedIds: string[] } | null

function SubmissionTable({ deliveryStatuses, items, onDeliveryChange, onReportRetry, onSelect, selection }: { deliveryStatuses: Record<string, ReportDeliveryStatus>; items: SubmissionListItem[]; onDeliveryChange: (status: ReportDeliveryStatus) => void; onReportRetry: () => Promise<void>; onSelect: (id: string) => void; selection: RowSelection }) {
  const deletableIds = items.filter((item) => item.deletable).map((item) => item.id)
  const allSelected = Boolean(selection && deletableIds.length && deletableIds.every((id) => selection.selectedIds.includes(id)))
  return (
    <>
      <div className="table-wrap desktop-table">
        <div className="table-scroll">
          <table>
          <thead>
            <tr>
              <th>
                {selection ? (
                  <span className="row-select-head">
                    <span className="row-select-wrap" data-tooltip={deletableIds.length ? 'Chọn tất cả lượt gửi đang chờ tạo báo cáo ở trang này' : 'Trang này không có lượt gửi nào xóa được'}>
                      <input aria-label="Chọn tất cả lượt gửi xóa được ở trang này" checked={allSelected} className="row-select-box" disabled={!deletableIds.length} onChange={selection.onToggleAll} type="checkbox" />
                    </span>
                    Người gửi
                  </span>
                ) : 'Người gửi'}
              </th>
              <th>Trạng thái</th>
              <th>Số câu</th>
              <th>Kết quả</th>
              <th>Email kết quả</th>
              <th>Thời gian</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className={selection?.selectedIds.includes(item.id) ? 'is-selected' : undefined} key={item.id}>
                <td>
                  <div className={selection ? 'person-cell has-select' : 'person-cell'}>
                    {selection ? <RowSelectBox checked={selection.selectedIds.includes(item.id)} item={item} onToggle={selection.onToggle} /> : null}
                    <strong>{item.fullName}</strong>
                    <span className="email-single-line-wrap" data-tooltip={item.email}><span className="email-single-line">{item.email}</span></span>
                    <span>{item.phone ?? 'Chưa cung cấp số điện thoại'}</span>
                    <em>{item.position}</em>
                    {item.source ? <span className="submission-source-line"><QrCode aria-hidden="true" size={12} />{item.source.name}</span> : null}
                  </div>
                </td>
                <td>
                  <div className="stack-cell">
                    <StatusBadge status={item.submissionStatus} />
                    <span>{item.statusNote}</span>
                  </div>
                </td>
                <td>
                  <div className="count-cell">
                    <span className="count-line"><strong>{item.answersCount}</strong><LanguageBadge language={item.language} /></span>
                    <span>câu trả lời</span>
                    <span>Bộ {item.surveyVersion}</span>
                  </div>
                </td>
                <td><ReportDeliveryFileStatus report={item.report} status={deliveryStatuses[item.id] ?? null} /></td>
                <td><DeliveryStatusBadge status={deliveryStatuses[item.id] ?? null} /></td>
                <td>{formatDateTime(item.submittedAt)}</td>
                <td>
                  <div className="table-row-actions">
                    <ReportDeliveryTableCell actionOnly onChanged={onDeliveryChange} onReportRetry={onReportRetry} report={item.report} status={deliveryStatuses[item.id] ?? null} submissionId={item.id} />
                    <button aria-label="Xem chi tiết" className="icon-button" data-tooltip="Xem chi tiết" onClick={() => onSelect(item.id)} type="button">
                      <Eye aria-hidden="true" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-card-list">
        {items.map((item, index) => (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className="submission-card"
            initial={{ opacity: 0, y: 8 }}
            key={item.id}
            transition={{ delay: Math.min(index * 0.02, 0.18), duration: 0.18 }}
          >
            <div className="submission-card-head">
              {selection ? <RowSelectBox checked={selection.selectedIds.includes(item.id)} item={item} onToggle={selection.onToggle} /> : null}
              <div>
                <strong>{item.fullName}</strong>
                <span>{item.position}</span>
              </div>
              <button aria-label="Xem chi tiết" className="icon-button" data-tooltip="Xem chi tiết" onClick={() => onSelect(item.id)} type="button">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="submission-card-statuses">
              <StatusBadge status={item.submissionStatus} />
              <ReportBadge report={item.report} />
              <DeliveryStatusBadge status={deliveryStatuses[item.id] ?? null} />
            </div>
            <p className="email-single-line-wrap" data-tooltip={item.email}><span className="email-single-line">{item.email}</span></p>
            <p>{item.phone ?? 'Chưa cung cấp số điện thoại'}</p>
            {item.source ? <p className="submission-source-line"><QrCode aria-hidden="true" size={12} />{item.source.name}</p> : null}
            <ReportDownloadLink report={item.report} />
            <div className="submission-card-result">
              <span>Kết quả</span>
              <ReportDeliveryTableCell onChanged={onDeliveryChange} onReportRetry={onReportRetry} report={item.report} status={deliveryStatuses[item.id] ?? null} submissionId={item.id} />
            </div>
            <div className="submission-card-meta">
              <span>{item.answersCount} câu trả lời · Bộ {item.surveyVersion}</span>
              <LanguageBadge language={item.language} />
            </div>
            <time>{formatDateTime(item.submittedAt)}</time>
          </motion.article>
        ))}
      </div>
    </>
  )
}

function SubmissionDetailDrawer({
  detail,
  error,
  isLoading,
  onClose,
  onRetry,
  open,
}: {
  detail: SubmissionDetail | null
  error: string
  isLoading: boolean
  onClose: () => void
  onRetry: () => void
  open: boolean
}) {
  const title = detail?.fullName || (isLoading ? 'Đang tải' : 'Chi tiết lượt gửi')
  const drawerRef = useRef<HTMLElement>(null)
  useDialogKeyboard(open, drawerRef, { onEscape: onClose })

  return (
    <>
      <button aria-label="Đóng chi tiết lượt gửi" className="drawer-backdrop" data-open={open} inert={!open} onClick={onClose} tabIndex={-1} type="button" />
      <aside aria-label="Chi tiết lượt gửi" aria-modal={open || undefined} className="detail-drawer" data-open={open} inert={!open} ref={drawerRef} role="dialog" tabIndex={-1}>
        <div className="drawer-header">
          <div>
            <p>Chi tiết lượt gửi</p>
            <h2>{title}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" data-tooltip="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {isLoading ? <DrawerSkeleton /> : null}

        {error && !isLoading ? (
          <div className="drawer-content detail-drawer-scroll">
            <section className="drawer-error">
              <CircleAlert aria-hidden="true" size={30} />
              <h3>Không tải được chi tiết</h3>
              <p>{error}</p>
              <button className="secondary-button" onClick={onRetry} type="button">
                <RefreshCw aria-hidden="true" size={16} />
                <span>Tải lại</span>
              </button>
            </section>
          </div>
        ) : null}

        {detail && !isLoading && !error ? (
          <div className="drawer-content detail-drawer-scroll">
            <section className="detail-section detail-section-hero">
              <div className="detail-summary">
                <StatusBadge status={detail.submissionStatus} />
                <ReportBadge report={detail.report} />
                <span className="answer-count-pill"><strong>{detail.answersCount}</strong> câu trả lời</span>
                <span className="answer-count-pill">Bộ câu hỏi <strong>{detail.surveyVersion}</strong></span>
                <LanguageBadge language={detail.language} />
              </div>
              <p>{detail.statusNote}</p>
              <div className="detail-report-actions">
                <ReportDownloadLink report={detail.report} />
                {detail.report.errorMessage ? <span className="report-error-note">{detail.report.errorMessage}</span> : null}
              </div>
            </section>

            <section className="detail-grid">
              <div>
                <Mail aria-hidden="true" size={16} />
                <span className="email-single-line-wrap" data-tooltip={detail.email}><span className="email-single-line">{detail.email}</span></span>
              </div>
              <div>
                <Phone aria-hidden="true" size={16} />
                <span>{detail.phone ?? 'Chưa cung cấp số điện thoại'}</span>
              </div>
              <div>
                <Briefcase aria-hidden="true" size={16} />
                <span>{detail.position}</span>
              </div>
              {detail.companyName ? (
                <div>
                  <Building2 aria-hidden="true" size={16} />
                  <span>{detail.companyName}</span>
                </div>
              ) : null}
              <div>
                <CalendarDays aria-hidden="true" size={16} />
                <span>{formatDateTime(detail.submittedAt)}</span>
              </div>
              <div>
                <CheckCircle2 aria-hidden="true" size={16} />
                <span>{privacyConsentLabels[detail.privacyConsent]}</span>
              </div>
              <div className="detail-source">
                <QrCode aria-hidden="true" size={16} />
                <span>Nguồn mời: <strong>{detail.source ? detail.source.name : 'Không có'}</strong>{detail.source && !detail.source.isActive ? ' (đã ngưng)' : ''}</span>
              </div>
            </section>

            {detail.roundtableRegistration ? (
              <section className="detail-section">
                <h3>Roundtable lãnh đạo</h3>
                <p>
                  {detail.roundtableRegistration.fullName} · <span className="email-single-line-wrap" data-tooltip={detail.roundtableRegistration.email}><span className="email-single-line">{detail.roundtableRegistration.email}</span></span>
                </p>
                <p>{detail.roundtableRegistration.position || 'Chưa nhập chức vụ'} · {formatDateTime(detail.roundtableRegistration.registeredAt)}</p>
              </section>
            ) : null}

            <section className="detail-section">
              <h3>Câu trả lời</h3>
              <div className="answer-list">
                {detail.answers.map((answer) => (
                  <article className="answer-item" key={answer.idx}>
                    <div className="answer-index">{answer.idx}</div>
                    <div>
                      <div className="answer-meta">
                        <span>Phần {answer.part}</span>
                        <span>{questionTypeLabel(answer.questionType)}</span>
                      </div>
                      <h4>{answer.questionText}</h4>
                      <p>{answer.answerText || valueToText(answer.answerValue)}</p>
                      {answer.otherText ? <em>{answer.otherText}</em> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

          </div>
        ) : null}
      </aside>
    </>
  )
}

export function SubmissionsPage({ onSourceFilterChange, sourceFilter, tabs }: { onSourceFilterChange: (value: string) => void; sourceFilter: string; tabs: ReactNode }) {
  const { user } = useAuth()
  const [sources, setSources] = useState<SurveySource[]>([])
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusOption>('all')
  const [reportStatus, setReportStatus] = useState<ReportStatusOption>('all')
  const [emailStatus, setEmailStatus] = useState<EmailStatusOption>('all')
  const [surveyVersion, setSurveyVersion] = useState('all')
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<PageCursor>>([null])
  const [items, setItems] = useState<SubmissionListItem[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, ReportDeliveryStatus>>({})
  const [deliveryStatusError, setDeliveryStatusError] = useState("")
  const [campaign, setCampaign] = useState<ReportDeliveryCampaign | null>(null)
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false)
  const [campaignBusy, setCampaignBusy] = useState(false)
  const [campaignError, setCampaignError] = useState('')
  // Super admins: submissions ticked for deletion (only rows whose report is still waiting).
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([])
  const [deleteDialogIds, setDeleteDialogIds] = useState<string[] | null>(null)
  const [deleteNotice, setDeleteNotice] = useState('')
  const canDelete = isSuperadmin(user?.role)
  const itemsRef = useRef(items)
  const pageRequestRef = useRef(0)
  const [statsError, setStatsError] = useState('')
  const statsRef = useRef(stats)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    statsRef.current = stats
  }, [stats])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(draftSearch.trim())
      setPage(1)
      setPageCursors([null])
    }, searchDebounceMs)
    return () => window.clearTimeout(timeoutId)
  }, [draftSearch])

  const cursor = pageCursors[page - 1] ?? null
  const filters = useMemo(() => buildFilters(search, status, reportStatus, emailStatus, surveyVersion, sourceFilter, pageSize, cursor), [cursor, emailStatus, pageSize, reportStatus, search, sourceFilter, status, surveyVersion])
  const sourceOptions = useMemo(() => buildSourceOptions(sources), [sources])
  const statsSurveyVersion = surveyVersion === 'all' ? undefined : surveyVersion
  const surveyVersionOptions = useMemo(() => buildSurveyVersionOptions(stats), [stats])
  const exportFilters = useMemo<ExportFilters>(() => ({
    emailStatus: emailStatus === 'all' ? undefined : emailStatus,
    reportStatus: reportStatus === 'all' ? undefined : reportStatus,
    search: search || undefined,
    sourceId: sourceFilter === 'all' ? undefined : sourceFilter,
    status: status === 'all' ? undefined : status,
    surveyVersion: statsSurveyVersion,
  }), [emailStatus, reportStatus, search, sourceFilter, status, statsSurveyVersion])

  useEffect(() => {
    listSurveySources().then((result) => setSources(result.items)).catch(() => {
      // Without the list the filter still offers "Tất cả" and "Không có nguồn mời".
    })
  }, [])

  const loadStats = useCallback(async (options: { silent?: boolean } = {}) => {
    try {
      const nextStats = await getSubmissionStats(statsSurveyVersion)
      setStats(nextStats)
      statsRef.current = nextStats
      setStatsError('')
    } catch (caught) {
      if (options.silent) return
      setStatsError(caught instanceof Error ? caught.message : 'Không tải được thống kê.')
    }
  }, [statsSurveyVersion])

  const loadPage = useCallback(async (options: { silent?: boolean } = {}) => {
    // A user-started load supersedes any load still running; a silent background refresh only
    // applies if nothing newer started while it was waiting.
    const requestId = options.silent ? pageRequestRef.current : ++pageRequestRef.current
    const isCurrent = () => requestId === pageRequestRef.current
    if (!options.silent) {
      setIsLoading(true)
      setError("")
      setDeliveryStatusError("")
    }

    try {
      const response = await listSubmissionsPage(filters)
      if (!isCurrent()) return
      let deliveryRows: ReportDeliveryStatus[] | null = null
      let deliveryError = ''
      try {
        deliveryRows = await getReportDeliveryStatuses(response.items.map((item) => item.id))
      } catch (caught) {
        deliveryError = caught instanceof Error ? caught.message : "Không tải được trạng thái file PDF."
      }
      if (!isCurrent()) return
      setItems(response.items)
      setHasNextPage(response.hasNextPage)
      if (deliveryRows) {
        setDeliveryStatuses(Object.fromEntries(deliveryRows.map((row) => [row.submissionId, row])))
      } else if (!options.silent) {
        // New rows without statuses: show the problem. A failed background refresh keeps the
        // statuses already on screen (and their upload/download buttons).
        setDeliveryStatuses({})
        setDeliveryStatusError(deliveryError)
      }

      const lastItem = response.items.at(-1)
      const nextCursor: PageCursor = lastItem
        ? { before: lastItem.submittedAt, beforeId: lastItem.id }
        : null

      setPageCursors((current) => {
        const next = current.slice(0, page + 1)
        next[page] = response.hasNextPage ? nextCursor : null
        return next
      })
    } catch (caught) {
      if (options.silent || !isCurrent()) return
      const message = caught instanceof Error ? caught.message : 'Không tải được dữ liệu.'
      setError(message)
    } finally {
      if (!options.silent && isCurrent()) setIsLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  // Keep only ticks on rows that are still shown and still deletable.
  useEffect(() => {
    setSelectedForDeletion((current) => {
      const next = current.filter((id) => items.some((item) => item.id === id && item.deletable))
      return next.length === current.length ? current : next
    })
  }, [items])

  const selection: RowSelection = canDelete ? {
    onToggle: (id) => setSelectedForDeletion((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]),
    onToggleAll: () => {
      const deletableIds = items.filter((item) => item.deletable).map((item) => item.id)
      setSelectedForDeletion((current) => deletableIds.every((id) => current.includes(id)) ? current.filter((id) => !deletableIds.includes(id)) : [...new Set([...current, ...deletableIds])])
    },
    selectedIds: selectedForDeletion,
  } : null

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    let active = true
    let checking = false

    const refreshInBackground = async () => {
      if (!active || checking || document.visibilityState !== 'visible') return
      checking = true

      try {
        const nextStats = await getSubmissionStats(statsSurveyVersion)
        if (!active) return

        const countChanged = statsRef.current?.totalSubmissions !== nextStats.totalSubmissions
        const reportInProgress = itemsRef.current.some((item) => item.report.status === 'generating' && !item.report.generationPaused)
        setStats(nextStats)
        statsRef.current = nextStats

        if (countChanged || reportInProgress) await loadPage({ silent: true })
      } catch {
        // Background refresh is best effort; keep the last usable dashboard state.
      } finally {
        checking = false
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshInBackground()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const timer = window.setInterval(() => void refreshInBackground(), 10000)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(timer)
    }
  }, [loadPage, statsSurveyVersion])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setDetailError('')
      setDetailLoading(false)
      return
    }

    let active = true
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)

    getSubmissionDetail(selectedId)
      .then((nextDetail) => {
        if (!active) return
        setDetail(nextDetail)
      })
      .catch((caught) => {
        if (!active) return

        const message = caught instanceof Error ? caught.message : 'Không tải được chi tiết lượt gửi.'
        setDetail(null)
        setDetailError(message || 'Không tải được chi tiết lượt gửi.')
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [detailReloadKey, selectedId])

  useEffect(() => {
    if (!campaign || !['queued', 'dispatching', 'sending'].includes(campaign.status)) return
    let active = true
    const timer = window.setInterval(() => {
      void getReportDeliveryCampaign(campaign.id).then((nextCampaign) => {
        if (active) setCampaign(nextCampaign)
        if (active) setCampaignError('')
        if (active && ['completed', 'failed', 'expired'].includes(nextCampaign.status)) void loadPage()
      }).catch((caught) => {
        if (active) setCampaignError(caught instanceof Error ? caught.message : 'Không cập nhật được trạng thái gửi email.')
      })
    }, 2000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [campaign?.id, campaign?.status, loadPage])

  useEffect(() => {
    if (!campaign || !['queued', 'dispatching', 'sending'].includes(campaign.status) || !items.length) return
    let active = true
    const refreshStatuses = async () => {
      try {
        const rows = await getReportDeliveryStatuses(items.map((item) => item.id))
        if (!active) return
        setDeliveryStatuses(Object.fromEntries(rows.map((row) => [row.submissionId, row])))
        setDeliveryStatusError('')
      } catch (caught) {
        if (active) setDeliveryStatusError(caught instanceof Error ? caught.message : 'Không cập nhật được trạng thái file PDF.')
      }
    }
    void refreshStatuses()
    const timer = window.setInterval(() => void refreshStatuses(), 2000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [campaign?.id, campaign?.status, items])

  async function openCampaignDialog() {
    setCampaignBusy(true)
    setCampaignError('')
    try {
      setCampaign(await previewReportDeliveryCampaign())
      setCampaignDialogOpen(true)
    } catch (caught) {
      setCampaignError(caught instanceof Error ? caught.message : 'Không tạo được bản xem trước gửi email.')
    } finally {
      setCampaignBusy(false)
    }
  }

  async function confirmCampaign() {
    if (!campaign) return
    setCampaignBusy(true)
    setCampaignError('')
    try {
      setCampaign(await confirmReportDeliveryCampaign(campaign.id))
    } catch (caught) {
      setCampaignError(caught instanceof Error ? caught.message : 'Không thể xác nhận gửi email.')
    } finally {
      setCampaignBusy(false)
    }
  }

  function handleDeliveryChange(next: ReportDeliveryStatus) {
    setDeliveryStatuses((current) => ({ ...current, [next.submissionId]: next }))
  }

  async function handleReportRetry() {
    await loadPage({ silent: true })
  }
  return (
    <main className="dashboard-main">
      {tabs}
      {isLoading && !stats ? (
        <StatsSkeleton label="Đang tải thống kê" />
      ) : (
        <section className="stats-grid" aria-label="Thống kê khảo sát">
          <StatTile icon={<UsersRound aria-hidden="true" size={20} />} label="Tổng lượt gửi" tooltip="Tổng số lượt khảo sát đã được lưu trong hệ thống, bao gồm mọi trạng thái gửi." value={formatNumber(stats?.totalSubmissions ?? 0)} />
          <StatTile icon={<FileText aria-hidden="true" size={20} />} label="Chỉ Phần 1" tooltip="Người dùng hoàn thành Phần 1 và chọn nhận báo cáo Phần 1, không gửi dữ liệu Phần 2." value={formatNumber(stats?.part1Only ?? 0)} />
          <StatTile icon={<CircleAlert aria-hidden="true" size={20} />} label="Không đồng ý bảo mật" tooltip="Người dùng đã trả lời Phần 2 nhưng không đồng ý điều khoản bảo mật dữ liệu." value={formatNumber(stats?.part2RefusedPrivacy ?? 0)} />
          <StatTile icon={<CheckCircle2 aria-hidden="true" size={20} />} label="Gửi đủ hai phần" tooltip="Người dùng hoàn thành cả hai phần và đồng ý bảo mật dữ liệu để nhận báo cáo đầy đủ." value={formatNumber(stats?.fullPrivateReport ?? 0)} />
        </section>
      )}
      {statsError ? <p className="report-delivery-error" role="status">Không tải được số liệu thống kê: {statsError}</p> : null}

      <ReportGenerationSettings canEdit={canManageContent(user?.role)} />

      <section aria-busy={isLoading} className="content-surface" data-loading={isLoading}>
        <div className="surface-head">
          <div>
            <p>Danh sách</p>
            <h2>Lượt gửi khảo sát</h2>
          </div>
          <div className="surface-actions">
            {canManageContent(user?.role) ? <ExportDataButton dataset="submissions" filters={exportFilters} /> : null}
            {canManageContent(user?.role) ? <button className="primary-button" disabled={campaignBusy} onClick={() => void openCampaignDialog()} type="button"><Mail aria-hidden="true" size={16} /><span>{campaignBusy ? 'Đang chuẩn bị...' : 'Gửi email trả kết quả'}</span></button> : null}
            <button className="secondary-button" onClick={() => { setPage(1); setPageCursors([null]); void loadStats(); if (page === 1) void loadPage() }} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        {campaignError && !campaignDialogOpen ? <p className="report-delivery-error report-delivery-inline-error">{campaignError}</p> : null}
        {deliveryStatusError ? <p className="report-delivery-error report-delivery-inline-error">{deliveryStatusError} Vui lòng bấm Tải lại.</p> : null}

        {/* The general survey link (no invitation source) is no longer offered here:
            links and QR codes are handed out per source in the "Nguồn mời" tab. */}
        <div className="filter-bar submissions-filter-bar">
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Tìm kiếm lượt gửi"
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Tìm tên, thư điện tử, chức vụ"
              type="search"
              value={draftSearch}
            />
          </div>
          <CustomSelect label="Quý khảo sát" onChange={(next) => { setSurveyVersion(next); setPage(1); setPageCursors([null]) }} options={surveyVersionOptions} value={surveyVersion} />
          <CustomSelect label="Trạng thái" onChange={(next) => { setStatus(next); setPage(1); setPageCursors([null]) }} options={statusOptions} value={status} />
          <CustomSelect label="Báo cáo" onChange={(next) => { setReportStatus(next); setPage(1); setPageCursors([null]) }} options={reportStatusOptions} value={reportStatus} />
          <CustomSelect label="Email" onChange={(next) => { setEmailStatus(next); setPage(1); setPageCursors([null]) }} options={emailStatusOptions} value={emailStatus} />
          <CustomSelect label="Nguồn mời" onChange={(next) => { onSourceFilterChange(next); setPage(1); setPageCursors([null]) }} options={sourceOptions} value={sourceFilter} />
        </div>

        {deleteNotice ? (
          <p aria-live="polite" className="survey-sources-notice submissions-delete-notice">
            <span>{deleteNotice}</span>
            <button aria-label="Ẩn thông báo" className="icon-button" onClick={() => setDeleteNotice('')} type="button"><X aria-hidden="true" size={15} /></button>
          </p>
        ) : null}

        {canDelete && selectedForDeletion.length ? (
          <div className="submissions-selection-bar">
            <span>Đã chọn <strong>{selectedForDeletion.length}</strong> lượt gửi đang chờ tạo báo cáo</span>
            <div>
              <button className="secondary-button" onClick={() => setSelectedForDeletion([])} type="button">Bỏ chọn</button>
              <button className="danger-button" onClick={() => setDeleteDialogIds(selectedForDeletion)} type="button">
                <Trash2 aria-hidden="true" size={16} />
                <span>Xóa {selectedForDeletion.length} lượt gửi</span>
              </button>
            </div>
          </div>
        ) : null}

        {isLoading ? <TableSkeleton /> : null}
        {!isLoading && (error || items.length === 0) ? <EmptyState emptyText="Chưa có dữ liệu phù hợp để hiển thị." emptyTitle="Chưa có lượt gửi" error={error} onRetry={() => void loadPage()} /> : null}
        {!isLoading && !error && items.length > 0 ? <SubmissionTable deliveryStatuses={deliveryStatuses} items={items} onDeliveryChange={handleDeliveryChange} onReportRetry={handleReportRetry} onSelect={setSelectedId} selection={selection} /> : null}

        {!isLoading && !error && items.length > 0 ? (
          <TablePagination
            hasNextPage={hasNextPage}
            hasPreviousPage={page > 1}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(1)
              setPageCursors([null])
            }}
            page={page}
            pageSize={pageSize}
            rowCount={items.length}
          />
        ) : null}
      </section>
      {deleteDialogIds ? (
        <SubmissionDeleteDialog
          ids={deleteDialogIds}
          onClose={() => setDeleteDialogIds(null)}
          onDeleted={(count) => {
            setDeleteDialogIds(null)
            setSelectedForDeletion([])
            setDeleteNotice(`Đã xóa vĩnh viễn ${count} lượt gửi.`)
            void loadStats()
            void loadPage()
          }}
        />
      ) : null}
      <ReportDeliveryCampaignDialog busy={campaignBusy} campaign={campaign} error={campaignError} onClose={() => setCampaignDialogOpen(false)} onConfirm={() => void confirmCampaign()} open={campaignDialogOpen} />
      <SubmissionDetailDrawer
        detail={detail}
        error={detailError}
        isLoading={detailLoading}
        onClose={() => setSelectedId('')}
        onRetry={() => setDetailReloadKey((current) => current + 1)}
        open={Boolean(selectedId)}
      />
    </main>
  )
}
