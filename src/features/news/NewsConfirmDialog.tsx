import { useRef } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'

export function NewsConfirmDialog({ busy, confirmLabel, error, message, onClose, onConfirm, title }: {
  busy: boolean
  confirmLabel: string
  error: string
  message: string
  onClose: () => void
  onConfirm: () => void
  title: string
}) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  return (
    <div className="report-modal-backdrop news-modal-backdrop" role="presentation">
      <section aria-labelledby="news-confirm-title" aria-modal="true" className="report-modal survey-source-dialog" ref={dialogRef} role="alertdialog" tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Xác nhận</p>
            <h2 id="news-confirm-title">{title}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button"><X aria-hidden="true" size={18} /></button>
        </div>
        <div className="report-modal-body">
          <p className="news-confirm-message"><TriangleAlert aria-hidden="true" size={18} /><span>{message}</span></p>
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className="primary-button news-danger-button" disabled={busy} onClick={onConfirm} type="button"><span>{busy ? 'Đang xử lý...' : confirmLabel}</span></button>
        </div>
      </section>
    </div>
  )
}
