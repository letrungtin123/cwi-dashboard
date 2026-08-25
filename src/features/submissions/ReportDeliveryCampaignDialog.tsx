import { CircleAlert, Mail, X } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { ReportDeliveryCampaign } from '@/types'

function statusLabel(status: ReportDeliveryCampaign['status']) {
  if (status === 'draft') return 'Chờ xác nhận'
  if (status === 'queued' || status === 'dispatching') return 'Đang chuẩn bị gửi'
  if (status === 'sending') return 'Đang gửi email'
  if (status === 'completed') return 'Đã gửi xong'
  if (status === 'failed') return 'Hoàn tất có lỗi'
  return 'Đã hết hạn'
}

export function ReportDeliveryCampaignDialog({
  busy,
  campaign,
  error,
  onClose,
  onConfirm,
  open,
}: {
  busy: boolean
  campaign: ReportDeliveryCampaign | null
  error: string
  onClose: () => void
  onConfirm: () => void
  open: boolean
}) {
  if (!open || !campaign) return null
  const canConfirm = campaign.status === 'draft' && campaign.eligibleUsers > 0 && !busy
  const isActive = ['queued', 'dispatching', 'sending'].includes(campaign.status)
  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="report-delivery-dialog-title" aria-modal="true" className="report-modal" role="dialog">
        <div className="report-modal-header">
          <div>
            <p>Gửi báo cáo khảo sát</p>
            <h2 id="report-delivery-dialog-title">{statusLabel(campaign.status)}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="report-modal-body">
          {campaign.status === 'draft' ? (
            <>
              <p className="report-modal-intro">Hệ thống sẽ gửi email kèm file PDF cho những người đã có báo cáo. Mỗi người chỉ nhận đúng file đang được gắn với lượt gửi của mình.</p>
              {campaign.eligibleUsers === 0 ? (
                <div className="report-modal-warning"><CircleAlert aria-hidden="true" size={20} /><p>Hiện không có người nào đủ điều kiện nhận email. Hãy kiểm tra file PDF và trạng thái gửi.</p></div>
              ) : campaign.missingPdfUsers > 0 ? (
                <div className="report-modal-warning">
                  <CircleAlert aria-hidden="true" size={20} />
                  <p>Còn <strong>{formatNumber(campaign.missingPdfUsers)} người</strong> chưa được tải file PDF. Nếu xác nhận, hệ thống chỉ gửi cho {formatNumber(campaign.eligibleUsers)} người đã có file.</p>
                </div>
              ) : (
                <div className="report-modal-ready"><Mail aria-hidden="true" size={20} /><p>Tất cả {formatNumber(campaign.totalUsers)} người trong đợt này đã có file PDF.</p></div>
              )}
            </>
          ) : (
            <div className="report-modal-progress">
              <p>Hệ thống đang xử lý theo hàng đợi, bạn có thể đóng cửa sổ này và quay lại xem trạng thái từng người.</p>
              <div className="report-progress-grid">
                <span><strong>{formatNumber(campaign.sentCount)}</strong>Đã gửi</span>
                <span><strong>{formatNumber(campaign.queuedCount)}</strong>Đang chờ</span>
                <span><strong>{formatNumber(campaign.failedCount)}</strong>Gửi lỗi</span>
                <span><strong>{formatNumber(campaign.unknownCount)}</strong>Cần kiểm tra</span>
              </div>
            </div>
          )}
          {campaign.errorMessage ? <p className="report-delivery-error">{campaign.errorMessage}</p> : null}
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>

        <div className="report-modal-footer">
          {canConfirm ? (
            <>
              <button className="secondary-button" onClick={onClose} type="button">Để sau</button>
              <button className="primary-button" disabled={busy} onClick={onConfirm} type="button">
                <Mail aria-hidden="true" size={16} />
                <span>{busy ? 'Đang xác nhận...' : campaign.eligibleUsers === 0 ? 'Chưa có người đủ điều kiện' : 'Xác nhận gửi email'}</span>
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={onClose} type="button">
              <span>{isActive ? 'Đóng cửa sổ' : 'Hoàn tất'}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
