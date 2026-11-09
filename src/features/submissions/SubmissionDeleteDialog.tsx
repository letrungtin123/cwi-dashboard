import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { deleteSubmissions, previewSubmissionDeletion } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { SubmissionDeletionItem } from '@/types'

// Confirms deleting the selected submissions whose report is still waiting. The
// server checks each one again; rows that can no longer be deleted are listed
// and left out.
export function SubmissionDeleteDialog({ ids, onClose, onDeleted }: { ids: string[]; onClose: () => void; onDeleted: (count: number) => void }) {
  const [items, setItems] = useState<SubmissionDeletionItem[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    previewSubmissionDeletion(ids)
      .then((result) => { if (!cancelled) setItems(result.items) })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error && caught.message ? caught.message : 'Không kiểm tra được các lượt gửi đã chọn.') })
    return () => { cancelled = true }
  }, [ids])

  const deletable = items?.filter((item) => item.deletable) ?? []
  const blocked = items?.filter((item) => !item.deletable) ?? []
  const registrations = deletable.reduce((total, item) => total + item.roundtableRegistrations + item.webinarRegistrations, 0)

  async function confirm() {
    if (!deletable.length) return
    setBusy(true)
    setError('')
    try {
      const result = await deleteSubmissions(deletable.map((item) => item.id))
      onDeleted(result.deleted)
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'Không xóa được. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="submission-delete-title" aria-modal="true" className="report-modal submission-delete-dialog" role="alertdialog">
        <div className="report-modal-header">
          <div>
            <p>Lượt gửi khảo sát</p>
            <h2 id="submission-delete-title">{items ? `Xóa ${deletable.length} lượt gửi?` : 'Đang kiểm tra...'}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body">
          {items ? (
            <>
              <p className="submission-delete-warning">
                <AlertTriangle aria-hidden="true" size={18} />
                <span>Xóa vĩnh viễn bài nộp và câu trả lời, không khôi phục được. Báo cáo của các bài này sẽ không bao giờ được tạo. Hệ thống chỉ ghi lại ai đã xóa và thông tin người gửi.</span>
              </p>
              {registrations ? <p className="report-modal-intro">Có {registrations} lượt đăng ký Roundtable/Webinar đi kèm, cũng sẽ bị xóa.</p> : null}
              {deletable.length ? (
                <ul className="submission-delete-list">
                  {deletable.map((item) => (
                    <li key={item.id}>
                      <strong>{item.fullName}</strong>
                      <span>{item.email}{item.companyName ? ` · ${item.companyName}` : ''}</span>
                      <small>Nộp lúc {formatDateTime(item.submittedAt)} · Bộ {item.surveyVersion}{item.roundtableRegistrations + item.webinarRegistrations ? ' · có đăng ký đi kèm' : ''}</small>
                    </li>
                  ))}
                </ul>
              ) : null}
              {blocked.length ? (
                <p className="report-delivery-error">
                  {blocked.length} lượt gửi không xóa được nữa vì đã có báo cáo hoặc báo cáo đang được tạo: {blocked.map((item) => item.fullName).join(', ')}. Các lượt này sẽ được giữ nguyên.
                </p>
              ) : null}
            </>
          ) : null}
          {!items && !error ? <p className="report-modal-intro">Đang kiểm tra các lượt gửi đã chọn...</p> : null}
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className="danger-button" disabled={busy || !deletable.length} onClick={() => void confirm()} type="button">
            <span>{busy ? 'Đang xóa...' : `Xóa vĩnh viễn ${deletable.length} lượt gửi`}</span>
          </button>
        </div>
      </section>
    </div>
  )
}
