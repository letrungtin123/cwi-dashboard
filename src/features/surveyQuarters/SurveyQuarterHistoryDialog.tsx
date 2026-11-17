import { useEffect, useRef, useState } from 'react'
import { History, X } from 'lucide-react'
import { getSurveyQuarterHistory } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { personName } from '@/lib/roles'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { AuditEntry, SurveyQuarterAdmin } from '@/types'

type Change = { from?: unknown; to?: unknown }

function quoted(value: unknown) {
  return typeof value === 'string' && value ? `“${value}”` : '(trống)'
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

const textFields: Record<string, string> = {
  descriptionEn: 'mô tả (tiếng Anh)',
  descriptionVi: 'mô tả (tiếng Việt)',
  titleEn: 'tiêu đề (tiếng Anh)',
  titleVi: 'tiêu đề (tiếng Việt)',
}

// Plain-language title and detail lines for one history entry.
export function describeSurveyQuarterChange(entry: AuditEntry): { lines: string[]; title: string } {
  if (entry.action === 'survey_quarter.image_upload') return { lines: [], title: 'Tải ảnh mới cho thẻ' }
  if (entry.action === 'survey_quarter.image_remove') return { lines: ['Thẻ dùng lại ảnh mặc định của trang khảo sát'], title: 'Gỡ ảnh của thẻ' }
  if (entry.action !== 'survey_quarter.update') return { lines: [], title: entry.action }

  const changes = record(entry.metadata.changes) as Record<string, Change>
  const lines: string[] = []
  if (changes.isVisible) lines.push(changes.isVisible.to ? 'Hiện thẻ trên trang khảo sát' : 'Ẩn thẻ khỏi trang khảo sát')
  if (changes.sortOrder) lines.push(`Đổi thứ tự ${String(changes.sortOrder.from)} → ${String(changes.sortOrder.to)}`)
  for (const [key, name] of Object.entries(textFields)) {
    const change = changes[key]
    if (change) lines.push(`Sửa ${name} ${quoted(change.from)} → ${quoted(change.to)}`)
  }
  if (changes.reportGenerationEnabled) lines.push(changes.reportGenerationEnabled.to ? 'Bật tạo báo cáo' : 'Tạm dừng tạo báo cáo')
  if (changes.deferredResultDays) lines.push(`Đổi số ngày báo nhận báo cáo ${String(changes.deferredResultDays.from)} → ${String(changes.deferredResultDays.to)}`)
  return { lines, title: 'Sửa quý khảo sát' }
}

export function SurveyQuarterHistoryDialog({ onClose, quarter }: { onClose: () => void; quarter: SurveyQuarterAdmin }) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [items, setItems] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getSurveyQuarterHistory(quarter.surveyVersion)
      .then((result) => { if (!cancelled) setItems(result.items) })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error && caught.message ? caught.message : 'Không tải được lịch sử.') })
    return () => { cancelled = true }
  }, [quarter.surveyVersion])

  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="survey-quarter-history-title" aria-modal="true" className="report-modal survey-source-dialog survey-source-history" role="dialog" ref={dialogRef} tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Lịch sử quý khảo sát</p>
            <h2 id="survey-quarter-history-title">Khảo sát {quarter.label.vi}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body">
          {error ? <p className="report-delivery-error">{error}</p> : null}
          {!error && !items ? <p className="survey-sources-empty">Đang tải lịch sử...</p> : null}
          {items && items.length === 0 ? <p className="survey-sources-empty">Chưa có thay đổi nào được ghi lại.</p> : null}
          {items && items.length ? (
            <ol className="history-list">
              {items.map((entry) => {
                const { lines, title } = describeSurveyQuarterChange(entry)
                return (
                  <li key={entry.id}>
                    <span aria-hidden="true" className="history-dot"><History size={13} /></span>
                    <div>
                      <strong>{title}</strong>
                      <p className="history-meta">{personName(entry.actor)} · {formatDateTime(entry.createdAt)}</p>
                      {lines.map((line) => <p className="history-line" key={line}>{line}</p>)}
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </div>
        <div className="report-modal-footer">
          <button className="primary-button" onClick={onClose} type="button"><span>Đóng</span></button>
        </div>
      </section>
    </div>
  )
}
