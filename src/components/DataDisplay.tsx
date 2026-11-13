import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CircleAlert, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { pausedReportTooltip } from '@/features/submissions/reportGenerationLabels'
import { apiUrl } from '@/lib/api'
import { canManageContent } from '@/lib/roles'
import type { PrivacyConsent, ReportSummary, SubmissionStatus } from '@/types'

// Building blocks shared by the survey list and the event registration lists.

const submissionStatusMeta: Record<SubmissionStatus, { className: string; label: string }> = {
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

export const privacyConsentLabels: Record<PrivacyConsent, string> = {
  no: 'Không đồng ý',
  not_applicable: 'Không áp dụng',
  yes: 'Đồng ý',
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = submissionStatusMeta[status]
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>
}

export function ReportBadge({ report }: { report: ReportSummary }) {
  if (report.generationPaused) return <span className="report-badge report-paused" data-tooltip={pausedReportTooltip} data-tooltip-wide>{report.label}</span>
  return <span className={`report-badge report-${report.status}`}>{report.label}</span>
}

// Viewers see report status only, so the link is hidden for them.
export function ReportDownloadLink({ icon, report }: { icon?: ReactNode; report: ReportSummary }) {
  const { user } = useAuth()
  if (!report.pdfDownloadUrl || !canManageContent(user?.role)) return null

  return (
    <a className="mini-link-button" data-tooltip="Tải báo cáo PDF" href={apiUrl(report.pdfDownloadUrl)} rel="noreferrer" target="_blank">
      {icon ?? <Download aria-hidden="true" size={15} />}
      <span>Tải PDF</span>
    </a>
  )
}

export function StatTile({ icon, label, tooltip, value }: { icon: ReactNode; label: string; tooltip: string; value: string }) {
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

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ['160% 0', '-160% 0'] }}
      aria-hidden="true"
      className={`skeleton-line ${className}`}
      transition={{ duration: 1.25, ease: 'linear', repeat: Infinity }}
    />
  )
}

export function StatsSkeleton({ label }: { label: string }) {
  return (
    <section className="stats-grid" aria-label={label}>
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

// Shown when a list failed to load (with a retry button) or has nothing to show.
export function EmptyState({ emptyText, emptyTitle, error, onRetry }: { emptyText: string; emptyTitle: string; error: string; onRetry: () => void }) {
  return (
    <div className="empty-state">
      <CircleAlert aria-hidden="true" size={30} />
      <h2>{error ? 'Không tải được dữ liệu' : emptyTitle}</h2>
      <p>{error || emptyText}</p>
      {error ? (
        <button className="secondary-button" onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          <span>Tải lại</span>
        </button>
      ) : null}
    </div>
  )
}
