import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  FileText,
  Link2,
  Mail,
  MessageCircleQuestion,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import {
  apiUrl,
  getRoundtableRegistrationDetail,
  getRoundtableRegistrationStats,
  getWebinarRegistrationDetail,
  getWebinarRegistrationStats,
  listRoundtableRegistrationsPage,
  listWebinarRegistrationsPage,
} from '@/lib/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { pausedReportTooltip } from '@/features/submissions/reportGenerationLabels'
import { ExportDataButton } from '@/components/ExportDataButton'
import { PublicLinkBar } from '@/components/PublicLinkBar'
import { RoundtableEventSettings } from './RoundtableEventSettings'
import { formatDateTime, formatNumber, valueToText } from '@/lib/format'
import { getLandingUrl } from '@/lib/landing'
import { canManageContent } from '@/lib/roles'
import { CustomSelect, type SelectOption } from '@/components/CustomSelect'
import { TablePagination } from '@/components/TablePagination'
import type {
  ExportFilters,
  PrivacyConsent,
  ReportSummary,
  RoundtableLinkStatus,
  RoundtableRegistrationDetail,
  RoundtableRegistrationFilters,
  RoundtableRegistrationListItem,
  RoundtableRegistrationStats,
  SubmissionStatus,
} from '@/types'

type LinkFilter = 'all' | RoundtableLinkStatus
export type EventRegistrationKind = 'roundtable' | 'webinar'

const eventCopy: Record<EventRegistrationKind, { eventName: string; eventTitle: string }> = {
  roundtable: { eventName: 'Roundtable', eventTitle: 'CEO Roundtable' },
  webinar: { eventName: 'Webinar', eventTitle: 'Webinar' },
}

const defaultPageSize = 10
// The API owns the sort key and signs the cursor so new registrations cannot
// make the dashboard drift from the server's newest-first pagination order.
type PageCursor = string | null
const searchDebounceMs = 350

const statusMeta: Record<SubmissionStatus, { className: string; label: string }> = {
  full_private_report: {
    className: 'status-green',
    label: 'Gửi đủ hai phần',
  },
  part1_only: {
    className: 'status-blue',
    label: 'Chỉ Phần 1',
  },
  part2_refused_privacy: {
    className: 'status-amber',
    label: 'Phần 2 không đồng ý',
  },
}

const privacyLabels: Record<PrivacyConsent, string> = {
  no: 'Không đồng ý',
  not_applicable: 'Không áp dụng',
  yes: 'Đồng ý',
}

function getLinkOptions(eventName: string): Array<SelectOption<LinkFilter>> {
  return [
    { description: 'Hiển thị toàn bộ đăng ký', label: 'Tất cả đăng ký', value: 'all' },
    { description: 'Đăng ký đã có lượt gửi khảo sát', label: 'Đã khảo sát', value: 'linked' },
    { description: `Đăng ký ${eventName} độc lập, chưa có lượt gửi khảo sát`, label: 'Đăng ký riêng', value: 'standalone' },
  ]
}

function buildFilters(search: string, linkStatus: LinkFilter, quarter: string, limit: number, cursor: PageCursor): RoundtableRegistrationFilters {
  return {
    cursor: cursor ?? undefined,
    limit,
    linkStatus: linkStatus === 'all' ? undefined : linkStatus,
    quarter: quarter === 'all' ? undefined : quarter,
    search: search || undefined,
  }
}

// Roundtable quarters come from the stored registrations, newest first.
function buildQuarterOptions(stats: RoundtableRegistrationStats | null): Array<SelectOption<string>> {
  return [
    { description: 'Hiển thị đăng ký của mọi quý', label: 'Tất cả quý', value: 'all' },
    ...(stats?.quarters ?? []).map((item) => ({
      description: `${formatNumber(item.totalRegistrations)} lượt đăng ký`,
      label: `Quý ${item.quarter}`,
      value: item.quarter,
    })),
  ]
}

function displayText(value: string | null | undefined, fallback = 'Chưa có dữ liệu') {
  const normalized = value?.trim()
  return normalized || fallback
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = statusMeta[status]
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>
}

function ReportBadge({ report }: { report: ReportSummary }) {
  if (report.generationPaused) return <span className="report-badge report-paused" data-tooltip={pausedReportTooltip} data-tooltip-wide>{report.label}</span>
  return <span className={`report-badge report-${report.status}`}>{report.label}</span>
}

function LinkBadge({ linked }: { linked: boolean }) {
  return (
    <span className={linked ? 'roundtable-link-badge is-linked' : 'roundtable-link-badge is-standalone'}>
      {linked ? 'Đã khảo sát' : 'Đăng ký riêng'}
    </span>
  )
}

function ReportDownloadLink({ report }: { report: ReportSummary }) {
  if (!report.pdfDownloadUrl) return null

  return (
    <a className="mini-link-button" data-tooltip="Tải báo cáo PDF" href={apiUrl(report.pdfDownloadUrl)} rel="noreferrer" target="_blank">
      <FileText aria-hidden="true" size={15} />
      <span>Tải PDF</span>
    </a>
  )
}

function StatTile({ icon, label, tooltip, value }: { icon: ReactNode; label: string; tooltip: string; value: string }) {
  return (
    <article aria-label={`${label}: ${value}. ${tooltip}`} className="stat-tile" data-tooltip={tooltip} data-tooltip-wide tabIndex={0}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ['160% 0', '-160% 0'] }}
      aria-hidden="true"
      className={`skeleton-line ${className}`}
      transition={{ duration: 1.25, ease: 'linear', repeat: Infinity }}
    />
  )
}

function StatsSkeleton({ eventName }: { eventName: string }) {
  return (
    <section className="stats-grid" aria-label={`Đang tải thống kê ${eventName}`}>
      {Array.from({ length: 4 }, (_, index) => (
        <article className="stat-tile skeleton-tile" key={index}>
          <SkeletonLine className="skeleton-icon" />
          <div>
            <SkeletonLine className="skeleton-label" />
            <SkeletonLine className="skeleton-value" />
          </div>
        </article>
      ))}
    </section>
  )
}

function TableSkeleton({ eventName }: { eventName: string }) {
  return (
    <div className="table-loading" role="status" aria-label={`Đang tải danh sách ${eventName}`}>
      <span className="sr-only">Đang tải danh sách {eventName}</span>
      <div className="table-skeleton desktop-table">
        {Array.from({ length: 7 }, (_, index) => (
          <div className="table-skeleton-row roundtable-skeleton-row" key={index}>
            <SkeletonLine className="skeleton-person" />
            <SkeletonLine className="skeleton-status" />
            <SkeletonLine className="skeleton-report" />
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
            <SkeletonLine className="skeleton-date" />
          </article>
        ))}
      </div>
    </div>
  )
}

function DrawerSkeleton({ eventName }: { eventName: string }) {
  return (
    <div className="drawer-content drawer-skeleton" role="status" aria-label={`Đang tải chi tiết ${eventName}`}>
      <SkeletonLine className="skeleton-drawer-title" />
      <SkeletonLine className="skeleton-drawer-line" />
      <SkeletonLine className="skeleton-drawer-line short" />
      {Array.from({ length: 4 }, (_, index) => (
        <div className="detail-section" key={index}>
          <SkeletonLine className="skeleton-answer-question" />
          <SkeletonLine className="skeleton-answer-value" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ error, eventName, onRetry }: { error: string; eventName: string; onRetry: () => void }) {
  return (
    <div className="empty-state">
      <CircleAlert aria-hidden="true" size={30} />
      <h2>{error ? 'Không tải được dữ liệu' : `Chưa có đăng ký ${eventName}`}</h2>
      <p>{error || 'Chưa có dữ liệu phù hợp với bộ lọc hiện tại.'}</p>
      {error ? (
        <button className="secondary-button" onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          <span>Tải lại</span>
        </button>
      ) : null}
    </div>
  )
}

function RoundtableTable({ items, onSelect }: { items: RoundtableRegistrationListItem[]; onSelect: (id: string) => void }) {
  return (
    <>
      <div className="table-wrap desktop-table roundtable-table">
        <div className="table-scroll">
          <table>
          <thead>
            <tr>
              <th>Người đăng ký</th>
              <th>Thông tin nhập</th>
              <th>Trạng thái khảo sát</th>
              <th>Thời gian</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="person-cell">
                    <strong>{item.fullName}</strong>
                    <span>{item.email}</span>
                  </div>
                </td>
                <td>
                  <div className="stack-cell">
                    {item.quarter ? <span>Quý: {item.quarter}</span> : null}
                    <span>Chức vụ: {displayText(item.position, 'Chưa nhập')}</span>
                    {item.phone ? <span>SĐT: {item.phone}</span> : null}
                    {item.companyName ? <span>Công ty: {item.companyName}</span> : null}
                    <span>ID: {item.id}</span>
                  </div>
                </td>
                <td>
                  <div className="stack-cell">
                    <LinkBadge linked={Boolean(item.linkedSubmission)} />
                    {item.linkedSubmission ? (
                      <span>{item.linkedSubmission.fullName} · {item.linkedSubmission.answersCount} câu</span>
                    ) : (
                      <span>Chưa có lượt gửi khảo sát liên quan</span>
                    )}
                  </div>
                </td>
                <td>{formatDateTime(item.registeredAt)}</td>
                <td>
                  <button aria-label="Xem chi tiết" className="icon-button" data-tooltip="Xem chi tiết" onClick={() => onSelect(item.id)} type="button">
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
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
            className="submission-card roundtable-card"
            initial={{ opacity: 0, y: 8 }}
            key={item.id}
            transition={{ delay: Math.min(index * 0.02, 0.18), duration: 0.18 }}
          >
            <div className="submission-card-head">
              <div>
                <strong>{item.fullName}</strong>
                <span>{displayText(item.position, 'Chưa nhập chức vụ')}</span>
              </div>
              <button aria-label="Xem chi tiết" className="icon-button" data-tooltip="Xem chi tiết" onClick={() => onSelect(item.id)} type="button">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="submission-card-statuses">
              <LinkBadge linked={Boolean(item.linkedSubmission)} />
            </div>
            <p>{item.email}{item.quarter ? ` · Quý ${item.quarter}` : ''}</p>
            {item.linkedSubmission ? <p>Khảo sát: {item.linkedSubmission.fullName} · {item.linkedSubmission.answersCount} câu</p> : <p>Chưa có lượt gửi khảo sát liên quan</p>}
            <time>{formatDateTime(item.registeredAt)}</time>
          </motion.article>
        ))}
      </div>
    </>
  )
}

function ClientMetaList({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value)
  if (!entries.length) return <p>Không có metadata phía client.</p>

  return (
    <dl className="meta-list">
      {entries.map(([key, entryValue]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{valueToText(entryValue)}</dd>
        </div>
      ))}
    </dl>
  )
}

function RoundtableDetailDrawer({
  detail,
  eventName,
  error,
  isLoading,
  onClose,
  onRetry,
  open,
}: {
  detail: RoundtableRegistrationDetail | null
  eventName: string
  error: string
  isLoading: boolean
  onClose: () => void
  onRetry: () => void
  open: boolean
}) {
  const title = detail?.fullName || (isLoading ? 'Đang tải' : `Chi tiết ${eventName}`)
  const linkedSubmission = detail?.linkedSubmission ?? null

  return (
    <>
      <button aria-label={`Đóng chi tiết ${eventName}`} className="drawer-backdrop" data-open={open} onClick={onClose} type="button" />
      <aside className="detail-drawer" data-open={open} aria-label={`Chi tiết đăng ký ${eventName}`}>
        <div className="drawer-header">
          <div>
            <p>Chi tiết {eventName}</p>
            <h2>{title}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" data-tooltip="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {isLoading ? <DrawerSkeleton eventName={eventName} /> : null}

        {error && !isLoading ? (
          <div className="drawer-content">
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
          <div className="drawer-content">
            <section className="detail-section detail-section-hero">
              <div className="detail-summary">
                <LinkBadge linked={Boolean(linkedSubmission)} />
              </div>
              <p>Đăng ký lúc {formatDateTime(detail.registeredAt)}</p>
            </section>

            <section className="detail-grid">
              <div>
                <Mail aria-hidden="true" size={16} />
                <span>{detail.email}</span>
              </div>
              <div>
                <Briefcase aria-hidden="true" size={16} />
                <span>{displayText(detail.position, 'Chưa nhập chức vụ')}</span>
              </div>
              {detail.companyName ? <div>
                <Building2 aria-hidden="true" size={16} />
                <span>{detail.companyName}</span>
              </div> : null}
              {detail.phone ? <div>
                <Phone aria-hidden="true" size={16} />
                <span>{detail.phone}</span>
              </div> : null}
              <div>
                <CalendarDays aria-hidden="true" size={16} />
                <span>{formatDateTime(detail.registeredAt)}</span>
              </div>
              <div>
                <Link2 aria-hidden="true" size={16} />
                <span>{linkedSubmission ? 'Đã khảo sát' : 'Đăng ký độc lập'}</span>
              </div>
            </section>

            {detail.speakerQuestion ? (
              <section className="detail-section">
                <div className="detail-section-heading">
                  <MessageCircleQuestion aria-hidden="true" size={17} />
                  <h3>Câu hỏi dành cho diễn giả</h3>
                </div>
                <p>{detail.speakerQuestion}</p>
              </section>
            ) : null}

            {linkedSubmission ? (
              <section className="detail-section">
                <h3>Lượt gửi khảo sát liên quan</h3>
                <div className="roundtable-linked-summary">
                  <div className="person-cell">
                    <strong>{linkedSubmission.fullName}</strong>
                    <span>{linkedSubmission.email}</span>
                    <em>{linkedSubmission.position}</em>
                  </div>
                  <div className="detail-summary">
                    <StatusBadge status={linkedSubmission.submissionStatus} />
                    <ReportBadge report={linkedSubmission.report} />
                    <span className="answer-count-pill"><strong>{linkedSubmission.answersCount}</strong> câu trả lời</span>
                  </div>
                  <p>{linkedSubmission.statusNote}</p>
                  <div className="detail-report-actions">
                    <ReportDownloadLink report={linkedSubmission.report} />
                    {linkedSubmission.report.errorMessage ? <span className="report-error-note">{linkedSubmission.report.errorMessage}</span> : null}
                  </div>
                  <dl className="meta-list compact">
                    <div>
                      <dt>Thời gian gửi</dt>
                      <dd>{formatDateTime(linkedSubmission.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt>Đồng ý bảo mật</dt>
                      <dd>{privacyLabels[linkedSubmission.privacyConsent]}</dd>
                    </div>
                    <div>
                      <dt>ID khảo sát</dt>
                      <dd>{linkedSubmission.id}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            ) : (
              <section className="detail-section">
                <h3>Trạng thái survey</h3>
                <p>Người này mới đăng ký {eventName}, chưa có lượt gửi khảo sát được liên kết.</p>
              </section>
            )}

            <section className="detail-section">
              <h3>Thông tin kỹ thuật</h3>
              <dl className="meta-list">
                <div>
                  <dt>{eventName} ID</dt>
                  <dd>{detail.id}</dd>
                </div>
                <div>
                  <dt>Survey idempotency key</dt>
                  <dd>{displayText(detail.surveySubmissionIdempotencyKey, 'Không có')}</dd>
                </div>
                <div>
                  <dt>User agent</dt>
                  <dd>{displayText(detail.userAgent, 'Không có')}</dd>
                </div>
              </dl>
            </section>

            <section className="detail-section">
              <h3>Client metadata</h3>
              <ClientMetaList value={detail.clientMeta} />
            </section>
          </div>
        ) : null}
      </aside>
    </>
  )
}

export function EventRegistrationPage({ kind }: { kind: EventRegistrationKind }) {
  const { user } = useAuth()
  const { eventName, eventTitle } = eventCopy[kind]
  const isRoundtable = kind === 'roundtable'
  const registrationApi = useMemo(
    () => kind === 'roundtable'
      ? {
          getDetail: getRoundtableRegistrationDetail,
          getStats: (quarter?: string) => getRoundtableRegistrationStats(quarter),
          listPage: listRoundtableRegistrationsPage,
        }
      : {
          getDetail: getWebinarRegistrationDetail,
          getStats: () => getWebinarRegistrationStats(),
          listPage: listWebinarRegistrationsPage,
        },
    [kind],
  )
  const linkOptions = useMemo(() => getLinkOptions(eventName), [eventName])
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [linkStatus, setLinkStatus] = useState<LinkFilter>('all')
  const [quarter, setQuarter] = useState('all')
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<PageCursor>>([null])
  const [items, setItems] = useState<RoundtableRegistrationListItem[]>([])
  const [stats, setStats] = useState<RoundtableRegistrationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<RoundtableRegistrationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(draftSearch.trim())
      setPage(1)
      setPageCursors([null])
    }, searchDebounceMs)
    return () => window.clearTimeout(timeoutId)
  }, [draftSearch])

  const cursor = pageCursors[page - 1] ?? null
  // The quarter filter exists for Roundtable only; Webinar registrations have no quarter.
  const selectedQuarter = isRoundtable && quarter !== 'all' ? quarter : undefined
  const filters = useMemo(() => buildFilters(search, linkStatus, selectedQuarter ?? 'all', pageSize, cursor), [cursor, linkStatus, pageSize, search, selectedQuarter])
  const quarterOptions = useMemo(() => buildQuarterOptions(stats), [stats])
  const exportFilters = useMemo<ExportFilters>(() => ({
    linkStatus: linkStatus === 'all' ? undefined : linkStatus,
    quarter: selectedQuarter,
    search: search || undefined,
  }), [linkStatus, search, selectedQuarter])

  const loadStats = useCallback(async () => {
    try {
      setStats(await registrationApi.getStats(selectedQuarter))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : `Không tải được thống kê ${eventName}.`
      setError(message)
    }
  }, [eventName, registrationApi, selectedQuarter])

  const loadPage = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await registrationApi.listPage(filters)
      setItems(response.items)
      setHasNextPage(response.hasNextPage)

      const nextCursor: PageCursor = response.nextCursor

      setPageCursors((current) => {
        const next = current.slice(0, page + 1)
        next[page] = response.hasNextPage ? nextCursor : null
        return next
      })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : `Không tải được dữ liệu ${eventName}.`
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [eventName, filters, page, registrationApi])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void loadPage()
  }, [loadPage])


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

    registrationApi.getDetail(selectedId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail)
      })
      .catch((caught) => {
        if (!active) return

        const message = caught instanceof Error ? caught.message : `Không tải được chi tiết ${eventName}.`
        setDetail(null)
        setDetailError(message || `Không tải được chi tiết ${eventName}.`)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [detailReloadKey, eventName, registrationApi, selectedId])

  return (
    <main className="dashboard-main">
      {isLoading && !stats ? (
        <StatsSkeleton eventName={eventName} />
      ) : (
        <section className="stats-grid" aria-label={`Thống kê ${eventName}`}>
          <StatTile icon={<UsersRound aria-hidden="true" size={20} />} label="Tổng đăng ký" tooltip={`Tổng số lượt đăng ký ${eventTitle} đã được ghi nhận, gồm cả đăng ký riêng và đăng ký đã khảo sát.`} value={formatNumber(stats?.totalRegistrations ?? 0)} />
          <StatTile icon={<Link2 aria-hidden="true" size={20} />} label="Đã khảo sát" tooltip={`Đăng ký ${eventName} đã có lượt gửi khảo sát trong hệ thống.`} value={formatNumber(stats?.linkedSubmissions ?? 0)} />
          <StatTile icon={<UserCheck aria-hidden="true" size={20} />} label="Đăng ký riêng" tooltip={`Người dùng đã đăng ký ${eventName} nhưng chưa gửi khảo sát.`} value={formatNumber(stats?.standaloneRegistrations ?? 0)} />
          <StatTile icon={<CalendarDays aria-hidden="true" size={20} />} label="Hôm nay" tooltip={`Số đăng ký ${eventName} được tạo từ đầu ngày hiện tại theo thời gian database.`} value={formatNumber(stats?.todayRegistrations ?? 0)} />
        </section>
      )}

      {isRoundtable ? <RoundtableEventSettings canEdit={canManageContent(user?.role)} /> : null}

      <section aria-busy={isLoading} className="content-surface" data-loading={isLoading}>
        <div className="surface-head">
          <div>
            <p>Danh sách</p>
            <h2>Đăng ký {eventTitle}</h2>
          </div>
          <div className="surface-actions">
            {canManageContent(user?.role) ? <ExportDataButton dataset={kind} filters={exportFilters} /> : null}
            <button className="secondary-button" onClick={() => { setPage(1); setPageCursors([null]); void loadStats(); if (page === 1) void loadPage() }} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        <PublicLinkBar
          copiedMessage="Đã sao chép link đăng ký."
          openLabel="Mở form"
          qrFileName={`ma-qr-dang-ky-${kind}.png`}
          title={`Link đăng ký ${eventName}`}
          url={getLandingUrl(`/?register=${kind}`)}
        />

        <div className={isRoundtable ? 'filter-bar roundtable-filter-bar has-quarter-filter' : 'filter-bar roundtable-filter-bar'}>
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label={`Tìm kiếm đăng ký ${eventName}`}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder={isRoundtable ? 'Tìm tên, email, SĐT, công ty, chức vụ' : 'Tìm tên, email, chức vụ'}
              type="search"
              value={draftSearch}
            />
          </div>
          {isRoundtable ? <CustomSelect label="Quý" onChange={(next) => { setQuarter(next); setPage(1); setPageCursors([null]) }} options={quarterOptions} value={quarter} /> : null}
          <CustomSelect label="Liên kết" onChange={(next) => { setLinkStatus(next); setPage(1); setPageCursors([null]) }} options={linkOptions} value={linkStatus} />
        </div>

        {isLoading ? <TableSkeleton eventName={eventName} /> : null}
        {!isLoading && (error || items.length === 0) ? <EmptyState error={error} eventName={eventName} onRetry={() => void loadPage()} /> : null}
        {!isLoading && !error && items.length > 0 ? <RoundtableTable items={items} onSelect={setSelectedId} /> : null}

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

      <RoundtableDetailDrawer
        detail={detail}
        error={detailError}
        eventName={eventName}
        isLoading={detailLoading}
        onClose={() => setSelectedId('')}
        onRetry={() => setDetailReloadKey((current) => current + 1)}
        open={Boolean(selectedId)}
      />
    </main>
  )
}

export function RoundtablePage() {
  return <EventRegistrationPage kind="roundtable" />
}
