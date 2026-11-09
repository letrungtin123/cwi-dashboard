import { useState } from 'react'
import { Copy, ExternalLink, Link2, QrCode } from 'lucide-react'
import { copyText, downloadQrCode } from '@/lib/shareLink'

type PublicLinkBarProps = {
  copiedMessage: string
  openLabel: string
  qrFileName: string
  title: string
  url: string
}

export function PublicLinkBar({ copiedMessage, openLabel, qrFileName, title, url }: PublicLinkBarProps) {
  const [actionStatus, setActionStatus] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)

  const copyUrl = async () => {
    try {
      await copyText(url)
      setActionStatus(copiedMessage)
    } catch {
      setActionStatus('Không thể sao chép link trên trình duyệt này.')
    }
  }

  const downloadQr = async () => {
    setIsGeneratingQr(true)
    try {
      await downloadQrCode(url, qrFileName)
      setActionStatus('Đã tải mã QR.')
    } catch {
      setActionStatus('Không thể tạo mã QR. Vui lòng thử lại.')
    } finally {
      setIsGeneratingQr(false)
    }
  }

  return (
    <div className="event-registration-link-bar">
      <div className="event-registration-link-copy">
        <span className="event-registration-link-icon"><Link2 aria-hidden="true" size={18} /></span>
        <div>
          <strong>{title}</strong>
          <a className="event-registration-link-url" href={url}>{url}</a>
        </div>
      </div>
      <div className="event-registration-link-actions">
        <a className="secondary-button event-registration-open-link" href={url}>
          <ExternalLink aria-hidden="true" size={16} />
          <span>{openLabel}</span>
        </a>
        <button className="secondary-button event-registration-download-qr" disabled={isGeneratingQr} onClick={() => void downloadQr()} type="button">
          <QrCode aria-hidden="true" size={17} />
          <span>{isGeneratingQr ? 'Đang tạo...' : 'Tải mã QR'}</span>
        </button>
        <button aria-label={`Sao chép ${title.toLowerCase()}`} className="event-registration-copy-link" data-tooltip="Sao chép link" onClick={() => void copyUrl()} type="button">
          <Copy aria-hidden="true" size={17} />
        </button>
      </div>
      {actionStatus ? <p aria-live="polite" className="event-registration-copy-status">{actionStatus}</p> : null}
    </div>
  )
}
