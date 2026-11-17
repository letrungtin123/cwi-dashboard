import { useEffect, useRef, useState } from 'react'
import { History, X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { personName } from '@/lib/roles'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { AuditEntry } from '@/types'

export type Change = { from?: unknown; to?: unknown }

export function quoted(value: unknown) {
  return typeof value === 'string' && value ? `“${value}”` : '(trống)'
}

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

// Change history of one card (survey quarter or quarterly report), newest first.
export function CardHistoryDialog({ describe, heading, kicker, load, onClose }: {
  describe: (entry: AuditEntry) => { lines: string[]; title: string }
  heading: string
  kicker: string
  load: () => Promise<{ items: AuditEntry[] }>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [items, setItems] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  // Loaded once when the dialog opens.
  const loadRef = useRef(load)

  useEffect(() => {
    let cancelled = false
    loadRef.current()
      .then((result) => { if (!cancelled) setItems(result.items) })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error && caught.message ? caught.message : 'Không tải được lịch sử.') })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="card-history-title" aria-modal="true" className="report-modal survey-source-dialog survey-source-history" role="dialog" ref={dialogRef} tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>{kicker}</p>
            <h2 id="card-history-title">{heading}</h2>
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
                const { lines, title } = describe(entry)
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
