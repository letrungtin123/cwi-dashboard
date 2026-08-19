import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Search,
  UsersRound,
  X,
} from 'lucide-react'
import { getSubmissionDetail, getSubmissionStats, listSubmissions } from '@/lib/api'
import { formatDateTime, formatNumber, valueToText } from '@/lib/format'
import type { PrivacyConsent, SubmissionDetail, SubmissionFilters, SubmissionListItem, SubmissionStats, SubmissionStatus } from '@/types'

type StatusOption = 'all' | SubmissionStatus
type RoundtableOption = 'all' | 'true' | 'false'
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

const statusOptions: Array<SelectOption<StatusOption>> = [
  { description: 'Hiển thị toàn bộ lượt gửi', label: 'Tất cả trạng thái', value: 'all' },
  { description: 'Người gửi chỉ nhận báo cáo Phần 1', label: 'Chỉ Phần 1', value: 'part1_only' },
  { description: 'Đã làm Phần 2 nhưng không đồng ý bảo mật', label: 'Phần 2 không đồng ý', value: 'part2_refused_privacy' },
  { description: 'Đồng ý bảo mật và gửi đủ hai phần', label: 'Gửi đủ hai phần', value: 'full_private_report' },
]

const roundtableOptions: Array<SelectOption<RoundtableOption>> = [
  { description: 'Không lọc theo đăng ký Roundtable', label: 'Roundtable: tất cả', value: 'all' },
  { description: 'Chỉ người có đăng ký tham dự', label: 'Có đăng ký', value: 'true' },
  { description: 'Chỉ người không đăng ký', label: 'Không đăng ký', value: 'false' },
]

function buildFilters(search: string, status: StatusOption, roundtable: RoundtableOption, before?: string): SubmissionFilters {
  return {
    before,
    limit: pageSize,
    roundtable: roundtable === 'all' ? undefined : roundtable,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  }
}

function questionTypeLabel(type: string) {
  if (type === 'likert') return 'Điểm 1-5'
  if (type === 'mcq') return 'Lựa chọn'
  if (type === 'url') return 'Đường dẫn'
  return 'Câu trả lời'
}


function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = statusMeta[status]
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>
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
    <section className="stats-grid" aria-label="Đang tải thống kê">
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
    <div className="table-loading" role="status" aria-label="Đang tải lượt gửi">
      <span className="sr-only">Đang tải lượt gửi</span>
      <div className="table-skeleton desktop-table">
        {Array.from({ length: 7 }, (_, index) => (
          <div className="table-skeleton-row" key={index}>
            <SkeletonLine className="skeleton-person" />
            <SkeletonLine className="skeleton-status" />
            <SkeletonLine className="skeleton-score" />
            <SkeletonLine className="skeleton-chip" />
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

function EmptyState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="empty-state">
      <CircleAlert aria-hidden="true" size={30} />
      <h2>{error ? 'Không tải được dữ liệu' : 'Chưa có lượt gửi'}</h2>
      <p>{error || 'Chưa có dữ liệu phù hợp để hiển thị.'}</p>
      {error ? (
        <button className="secondary-button" onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          <span>Tải lại</span>
        </button>
      ) : null}
    </div>
  )
}

function SubmissionTable({ items, onSelect }: { items: SubmissionListItem[]; onSelect: (id: string) => void }) {
  return (
    <>
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Người gửi</th>
              <th>Trạng thái</th>
              <th>Số câu</th>
              <th>Roundtable</th>
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
                    <em>{item.position}</em>
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
                    <strong>{item.answersCount}</strong>
                    <span>câu trả lời</span>
                  </div>
                </td>
                <td>
                  <span className={item.roundtableRegistered ? 'roundtable-yes' : 'roundtable-no'}>
                    {item.roundtableRegistered ? 'Có đăng ký' : 'Không'}
                  </span>
                </td>
                <td>{formatDateTime(item.submittedAt)}</td>
                <td>
                  <button className="icon-button" onClick={() => onSelect(item.id)} title="Xem chi tiết" type="button">
                    <Eye aria-hidden="true" size={18} />
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
            className="submission-card"
            initial={{ opacity: 0, y: 8 }}
            key={item.id}
            transition={{ delay: Math.min(index * 0.02, 0.18), duration: 0.18 }}
          >
            <div className="submission-card-head">
              <div>
                <strong>{item.fullName}</strong>
                <span>{item.position}</span>
              </div>
              <button className="icon-button" onClick={() => onSelect(item.id)} title="Xem chi tiết" type="button">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <StatusBadge status={item.submissionStatus} />
            <p>{item.email}</p>
            <div className="submission-card-meta">
              <span>{item.answersCount} câu trả lời</span>
              <span>{item.roundtableRegistered ? 'Có đăng ký Roundtable' : 'Không đăng ký Roundtable'}</span>
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

  return (
    <>
      <button aria-label="Đóng chi tiết lượt gửi" className="drawer-backdrop" data-open={open} onClick={onClose} type="button" />
      <aside className="detail-drawer" data-open={open} aria-label="Chi tiết lượt gửi">
        <div className="drawer-header">
          <div>
            <p>Chi tiết lượt gửi</p>
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
                <StatusBadge status={detail.submissionStatus} />
                <span className="answer-count-pill"><strong>{detail.answersCount}</strong> câu trả lời</span>
              </div>
              <p>{detail.statusNote}</p>
            </section>

            <section className="detail-grid">
              <div>
                <Mail aria-hidden="true" size={16} />
                <span>{detail.email}</span>
              </div>
              <div>
                <Briefcase aria-hidden="true" size={16} />
                <span>{detail.position}</span>
              </div>
              <div>
                <CalendarDays aria-hidden="true" size={16} />
                <span>{formatDateTime(detail.submittedAt)}</span>
              </div>
              <div>
                <CheckCircle2 aria-hidden="true" size={16} />
                <span>{privacyLabels[detail.privacyConsent]}</span>
              </div>
            </section>

            {detail.roundtableRegistration ? (
              <section className="detail-section">
                <h3>Roundtable lãnh đạo</h3>
                <p>{detail.roundtableRegistration.fullName} · {detail.roundtableRegistration.email}</p>
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

export function SubmissionsPage() {
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusOption>('all')
  const [roundtable, setRoundtable] = useState<RoundtableOption>('all')
  const [items, setItems] = useState<SubmissionListItem[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(draftSearch.trim()), searchDebounceMs)
    return () => window.clearTimeout(timeoutId)
  }, [draftSearch])

  const filters = useMemo(() => buildFilters(search, status, roundtable), [roundtable, search, status])

  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [nextItems, nextStats] = await Promise.all([listSubmissions(filters), getSubmissionStats()])
      setItems(nextItems)
      setStats(nextStats)
      setHasMore(nextItems.length === pageSize)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không tải được dữ liệu.'
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

    getSubmissionDetail(selectedId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail)
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

  async function loadMore() {
    const before = items.at(-1)?.submittedAt
    if (!before) return

    setIsLoadingMore(true)
    try {
      const nextItems = await listSubmissions({ ...filters, before })
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
        <section className="stats-grid" aria-label="Thống kê khảo sát">
          <StatTile icon={<UsersRound aria-hidden="true" size={20} />} label="Tổng lượt gửi" tooltip="Tổng số lượt khảo sát đã được lưu trong hệ thống, bao gồm mọi trạng thái gửi." value={formatNumber(stats?.totalSubmissions ?? 0)} />
          <StatTile icon={<FileText aria-hidden="true" size={20} />} label="Chỉ Phần 1" tooltip="Người dùng hoàn thành Phần 1 và chọn nhận báo cáo Phần 1, không gửi dữ liệu Phần 2." value={formatNumber(stats?.part1Only ?? 0)} />
          <StatTile icon={<CircleAlert aria-hidden="true" size={20} />} label="Không đồng ý bảo mật" tooltip="Người dùng đã trả lời Phần 2 nhưng không đồng ý điều khoản bảo mật dữ liệu." value={formatNumber(stats?.part2RefusedPrivacy ?? 0)} />
          <StatTile icon={<CheckCircle2 aria-hidden="true" size={20} />} label="Gửi đủ hai phần" tooltip="Người dùng hoàn thành cả hai phần và đồng ý bảo mật dữ liệu để nhận báo cáo đầy đủ." value={formatNumber(stats?.fullPrivateReport ?? 0)} />
        </section>
      )}

      <section className="content-surface">
        <div className="surface-head">
          <div>
            <p>Danh sách</p>
            <h2>Lượt gửi khảo sát</h2>
          </div>
          <button className="secondary-button" onClick={() => void loadInitial()} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            <span>Tải lại</span>
          </button>
        </div>

        <div className="filter-bar">
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
          <CustomSelect label="Trạng thái" onChange={setStatus} options={statusOptions} value={status} />
          <CustomSelect label="Roundtable" onChange={setRoundtable} options={roundtableOptions} value={roundtable} />
        </div>

        {isLoading ? <TableSkeleton /> : null}
        {!isLoading && (error || items.length === 0) ? <EmptyState error={error} onRetry={() => void loadInitial()} /> : null}
        {!isLoading && !error && items.length > 0 ? <SubmissionTable items={items} onSelect={setSelectedId} /> : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="table-footer">
            <span>{formatNumber(items.length)} dòng đang hiển thị</span>
            <button className="secondary-button" disabled={!hasMore || isLoadingMore} onClick={() => void loadMore()} type="button">
              <span>{isLoadingMore ? 'Đang tải' : hasMore ? 'Tải thêm' : 'Hết dữ liệu'}</span>
            </button>
          </div>
        ) : null}
      </section>
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
