import { useEffect, useRef, useState } from 'react'
import { History, X } from 'lucide-react'
import { getSurveySourceHistory } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { personName } from '@/lib/roles'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { AuditEntry, SurveySource } from '@/types'

type Change = { from?: unknown; to?: unknown }

function quoted(value: unknown) {
  return typeof value === 'string' && value ? `“${value}”` : '(trống)'
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

// Plain-language title and detail lines for one history entry.
export function describeSurveySourceChange(entry: AuditEntry): { lines: string[]; title: string } {
  const metadata = entry.metadata
  if (entry.action === 'survey_source.create') {
    const after = record(metadata.after)
    const lines = [`Tên ${quoted(after.name)}, mã trong link “${String(after.code ?? '')}”`]
    if (after.note) lines.push(`Ghi chú: ${quoted(after.note)}`)
    return { lines, title: 'Tạo nguồn' }
  }
  if (entry.action === 'survey_source.delete') {
    const before = record(metadata.before)
    return { lines: [`Tên ${quoted(before.name)}, mã “${String(before.code ?? '')}”`], title: 'Xóa nguồn' }
  }
  if (entry.action === 'survey_source.update') {
    const changes = record(metadata.changes) as Record<string, Change>
    const lines: string[] = []
    if (changes.name) lines.push(`Đổi tên ${quoted(changes.name.from)} → ${quoted(changes.name.to)}`)
    if (changes.note) lines.push(`Sửa ghi chú ${quoted(changes.note.from)} → ${quoted(changes.note.to)}`)
    const activeChange = changes.isActive ? (changes.isActive.to ? 'Bật lại nguồn' : 'Ngưng nguồn') : ''
    if (activeChange && lines.length) lines.push(activeChange)
    return { lines, title: activeChange && !lines.length ? activeChange : 'Sửa nguồn' }
  }
  return { lines: [], title: entry.action }
}

export function SurveySourceHistoryDialog({ onClose, source }: { onClose: () => void; source: SurveySource }) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [items, setItems] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getSurveySourceHistory(source.id)
      .then((result) => { if (!cancelled) setItems(result.items) })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error && caught.message ? caught.message : 'Không tải được lịch sử.') })
    return () => { cancelled = true }
  }, [source.id])

  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="survey-source-history-title" aria-modal="true" className="report-modal survey-source-dialog survey-source-history" role="dialog" ref={dialogRef} tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Lịch sử nguồn mời</p>
            <h2 id="survey-source-history-title">{source.name}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body">
          {error ? <p className="report-delivery-error">{error}</p> : null}
          {!error && !items ? <p className="survey-sources-empty">Đang tải lịch sử...</p> : null}
          {items && items.length === 0 ? (
            <p className="survey-sources-empty">Chưa có thay đổi nào được ghi lại.</p>
          ) : null}
          {items && items.length ? (
            <ol className="history-list">
              {items.map((entry) => {
                const { lines, title } = describeSurveySourceChange(entry)
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
