import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileText,
  Link2,
  Mail,
  RefreshCw,
  Search,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { apiUrl, getRoundtableRegistrationDetail, getRoundtableRegistrationStats, listRoundtableRegistrations } from '@/lib/api'
import { formatDateTime, formatNumber, valueToText } from '@/lib/format'
import type {
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
type SelectOption<T extends string> = { description?: string; label: string; value: T }

const pageSize = 50
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

const linkOptions: Array<SelectOption<LinkFilter>> = [
  { description: 'Hiển thị toàn bộ đăng ký', label: 'Tất cả đăng ký', value: 'all' },
  { description: 'Đăng ký đã có lượt gửi khảo sát', label: 'Đã khảo sát', value: 'linked' },
  { description: 'Đăng ký Roundtable độc lập, chưa có lượt gửi khảo sát', label: 'Đăng ký riêng', value: 'standalone' },
]

function buildFilters(search: string, linkStatus: LinkFilter, before?: string): RoundtableRegistrationFilters {
  return {
    before,
    limit: pageSize,
    linkStatus: linkStatus === 'all' ? undefined : linkStatus,
    search: search || undefined,
  }
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
    <a className="mini-link-button" href={apiUrl(report.pdfDownloadUrl)} rel="noreferrer" target="_blank" title="Tải báo cáo PDF">
      <FileText aria-hidden="true" size={15} />
      <span>Tải PDF</span>
    </a>
  )
}

function StatTile({ icon, label, tooltip, value }: { icon: ReactNode; label: string; tooltip: string; value: string }) {
  return (
    <article aria-label={`${label}: ${value}. ${tooltip}`} className="stat-tile" tabIndex={0}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span className="stat-tooltip" role="tooltip">{tooltip}</span>
    </article>
  )
}

function CustomSelect<T extends string>({ label, onChange, options, value }: { label: string; onChange: (value: T) => void; options: Array<SelectOption<T>>; value: T }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`custom-select-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="custom-select-label">{label}</span>
        <span className="custom-select-value">{selected.label}</span>
        <ChevronDown aria-hidden="true" className="custom-select-chevron" size={17} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="custom-select-menu"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: -6 }}
            role="listbox"
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  aria-selected={isSelected}
                  className={`custom-select-option${isSelected ? ' is-selected' : ''}`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  role="option"
                  type="button"
                >
                  <span className="custom-select-option-text">
                    <strong>{option.label}</strong>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <Check aria-hidden="true" size={16} /> : null}
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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

function StatsSkeleton() {
  return (
    <section className="stats-grid" aria-label="Đang tải thống kê Roundtable">
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

function TableSkeleton() {
  return (
    <div className="table-loading" role="status" aria-label="Đang tải danh sách Roundtable">
      <span className="sr-only">Đang tải danh sách Roundtable</span>
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

function DrawerSkeleton() {
  return (
    <div className="drawer-content drawer-skeleton" role="status" aria-label="Đang tải chi tiết Roundtable">
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

function EmptyState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="empty-state">
      <CircleAlert aria-hidden="true" size={30} />
      <h2>{error ? 'Không tải được dữ liệu' : 'Chưa có đăng ký Roundtable'}</h2>
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
                    <span>Chức vụ: {displayText(item.position, 'Chưa nhập')}</span>
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
                  <button className="icon-button" onClick={() => onSelect(item.id)} title="Xem chi tiết" type="button">
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <button className="icon-button" onClick={() => onSelect(item.id)} title="Xem chi tiết" type="button">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="submission-card-statuses">
              <LinkBadge linked={Boolean(item.linkedSubmission)} />
            </div>
            <p>{item.email}</p>
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
  error,
  isLoading,
  onClose,
  onRetry,
  open,
}: {
  detail: RoundtableRegistrationDetail | null
  error: string
  isLoading: boolean
  onClose: () => void
  onRetry: () => void
  open: boolean
}) {
  const title = detail?.fullName || (isLoading ? 'Đang tải' : 'Chi tiết Roundtable')
  const linkedSubmission = detail?.linkedSubmission ?? null

  return (
    <>
      <button aria-label="Đóng chi tiết Roundtable" className="drawer-backdrop" data-open={open} onClick={onClose} type="button" />
      <aside className="detail-drawer" data-open={open} aria-label="Chi tiết đăng ký Roundtable">
        <div className="drawer-header">
          <div>
            <p>Chi tiết Roundtable</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {isLoading ? <DrawerSkeleton /> : null}

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
              <div>
                <CalendarDays aria-hidden="true" size={16} />
                <span>{formatDateTime(detail.registeredAt)}</span>
              </div>
              <div>
                <Link2 aria-hidden="true" size={16} />
                <span>{linkedSubmission ? 'Đã khảo sát' : 'Đăng ký độc lập'}</span>
              </div>
            </section>

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
                <p>Người này mới đăng ký CEO Roundtable, chưa có lượt gửi khảo sát được liên kết.</p>
              </section>
            )}

            <section className="detail-section">
              <h3>Thông tin kỹ thuật</h3>
              <dl className="meta-list">
                <div>
                  <dt>Roundtable ID</dt>
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

export function RoundtablePage() {
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [linkStatus, setLinkStatus] = useState<LinkFilter>('all')
  const [items, setItems] = useState<RoundtableRegistrationListItem[]>([])
  const [stats, setStats] = useState<RoundtableRegistrationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<RoundtableRegistrationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(draftSearch.trim()), searchDebounceMs)
    return () => window.clearTimeout(timeoutId)
  }, [draftSearch])

  const filters = useMemo(() => buildFilters(search, linkStatus), [linkStatus, search])

  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [nextItems, nextStats] = await Promise.all([listRoundtableRegistrations(filters), getRoundtableRegistrationStats()])
      setItems(nextItems)
      setStats(nextStats)
      setHasMore(nextItems.length === pageSize)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không tải được dữ liệu Roundtable.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

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

    getRoundtableRegistrationDetail(selectedId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail)
      })
      .catch((caught) => {
        if (!active) return

        const message = caught instanceof Error ? caught.message : 'Không tải được chi tiết Roundtable.'
        setDetail(null)
        setDetailError(message || 'Không tải được chi tiết Roundtable.')
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => {
      active = false
    }
  }, [detailReloadKey, selectedId])

  async function loadMore() {
    const before = items.at(-1)?.registeredAt
    if (!before) return

    setIsLoadingMore(true)
    try {
      const nextItems = await listRoundtableRegistrations({ ...filters, before })
      setItems((current) => [...current, ...nextItems])
      setHasMore(nextItems.length === pageSize)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <main className="dashboard-main">
      {isLoading && !stats ? (
        <StatsSkeleton />
      ) : (
        <section className="stats-grid" aria-label="Thống kê Roundtable">
          <StatTile icon={<UsersRound aria-hidden="true" size={20} />} label="Tổng đăng ký" tooltip="Tổng số lượt đăng ký CEO Roundtable đã được ghi nhận, gồm cả đăng ký riêng và đăng ký đã khảo sát." value={formatNumber(stats?.totalRegistrations ?? 0)} />
          <StatTile icon={<Link2 aria-hidden="true" size={20} />} label="Đã khảo sát" tooltip="Đăng ký Roundtable đã có lượt gửi khảo sát trong hệ thống." value={formatNumber(stats?.linkedSubmissions ?? 0)} />
          <StatTile icon={<UserCheck aria-hidden="true" size={20} />} label="Đăng ký riêng" tooltip="Người dùng đã đăng ký Roundtable nhưng chưa gửi khảo sát." value={formatNumber(stats?.standaloneRegistrations ?? 0)} />
          <StatTile icon={<CalendarDays aria-hidden="true" size={20} />} label="Hôm nay" tooltip="Số đăng ký Roundtable được tạo từ đầu ngày hiện tại theo thời gian database." value={formatNumber(stats?.todayRegistrations ?? 0)} />
        </section>
      )}

      <section className="content-surface">
        <div className="surface-head">
          <div>
            <p>Danh sách</p>
            <h2>Đăng ký CEO Roundtable</h2>
          </div>
          <button className="secondary-button" onClick={() => void loadInitial()} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            <span>Tải lại</span>
          </button>
        </div>

        <div className="filter-bar roundtable-filter-bar">
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Tìm kiếm đăng ký Roundtable"
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Tìm tên, email, chức vụ"
              type="search"
              value={draftSearch}
            />
          </div>
          <CustomSelect label="Liên kết" onChange={setLinkStatus} options={linkOptions} value={linkStatus} />
        </div>

        {isLoading ? <TableSkeleton /> : null}
        {!isLoading && (error || items.length === 0) ? <EmptyState error={error} onRetry={() => void loadInitial()} /> : null}
        {!isLoading && !error && items.length > 0 ? <RoundtableTable items={items} onSelect={setSelectedId} /> : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="table-footer">
            <span>{formatNumber(items.length)} dòng đang hiển thị</span>
            <button className="secondary-button" disabled={!hasMore || isLoadingMore} onClick={() => void loadMore()} type="button">
              <span>{isLoadingMore ? 'Đang tải' : hasMore ? 'Tải thêm' : 'Hết dữ liệu'}</span>
            </button>
          </div>
        ) : null}
      </section>

      <RoundtableDetailDrawer
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
