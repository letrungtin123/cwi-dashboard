import { useRef, useState, type ChangeEvent } from 'react'
import { CheckCircle2, Download, FileText, LockKeyhole, Upload, XCircle } from 'lucide-react'
import { apiUrl, uploadReportPdf } from '@/lib/api'
import type { ReportDeliveryStatus } from '@/types'

function formatBytes(value: number | null) {
  if (!value) return ''
  if (value < 1024 * 1024) return Math.ceil(value / 1024) + ' KB'
  return (value / (1024 * 1024)).toFixed(1) + ' MB'
}

function emailStatusLabel(status: ReportDeliveryStatus['emailStatus']) {
  if (status === 'sent') return 'Đã gửi email'
  if (status === 'sending') return 'Đang gửi email'
  if (status === 'queued') return 'Đang chờ gửi'
  if (status === 'failed') return 'Gửi lỗi, sẽ thử lại'
  if (status === 'unknown') return 'Cần kiểm tra trước khi gửi lại'
  return 'Chưa gửi email'
}


export function ReportDeliveryTableCell({
  actionOnly = false,
  onChanged,
  status,
  submissionId,
}: {
  actionOnly?: boolean
  onChanged: (status: ReportDeliveryStatus) => void
  status: ReportDeliveryStatus | null
  submissionId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const file = status?.file
  const locked = Boolean(file?.lockedAt) || status?.emailStatus === 'sent' || status?.emailStatus === 'sending'

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Chỉ chấp nhận file PDF.')
      return
    }
    setError('')
    setIsUploading(true)
    try {
      onChanged(await uploadReportPdf(submissionId, selected))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được file PDF lên.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!status) return <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span>

  if (actionOnly) {
    return (
      <div className="report-table-actions">
        {file?.downloadUrl ? (
          <a className="table-download-button" download href={apiUrl(file.downloadUrl)} title="Tải file PDF">
            <Download aria-hidden="true" size={15} />
            <span className="sr-only">Tải file PDF</span>
          </a>
        ) : null}
        <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
        <button
          aria-label={locked ? 'File PDF đã khóa' : file?.available ? 'Thay file PDF' : 'Tải file PDF lên'}
          className="table-upload-button"
          disabled={locked || isUploading}
          onClick={() => inputRef.current?.click()}
          title={locked ? 'File PDF đã khóa sau khi gửi email' : file?.available ? 'Thay file PDF' : 'Tải file PDF lên'}
          type="button"
        >
          {locked ? <LockKeyhole aria-hidden="true" size={15} /> : <Upload aria-hidden="true" size={15} />}
          <span>{isUploading ? 'Đang tải...' : locked ? 'Đã khóa' : file?.available ? 'Thay file' : 'Tải lên'}</span>
        </button>
        {error ? <span className="report-table-error" title={error}><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
      </div>
    )
  }

  if (!file?.available) {
    return (
      <div className="report-table-upload">
        <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
        <button
          aria-label="Tải file PDF lên"
          className="table-upload-button"
          disabled={locked || isUploading}
          onClick={() => inputRef.current?.click()}
          title="Tải file PDF lên"
          type="button"
        >
          <Upload aria-hidden="true" size={15} />
          <span>{isUploading ? 'Đang tải...' : 'Tải PDF lên'}</span>
        </button>
        {error ? <span className="report-table-error" title={error}><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
      </div>
    )
  }

  return (
    <div className="report-table-file">
      <div className="report-table-file-copy">
        <span className="report-table-file-name" title={file.fileName ?? 'File PDF'}>
          <FileText aria-hidden="true" size={15} />
          <span>{file.fileName ?? 'bao-cao.pdf'}</span>
        </span>
        <span className="report-table-file-meta">{file.lockedAt ? 'Đã khóa thay thế' : 'Sẵn sàng gửi'}</span>
      </div>
      <div className="report-table-file-actions">
        {file.downloadUrl ? (
          <a className="table-download-button" download href={apiUrl(file.downloadUrl)} title="Tải file PDF">
            <Download aria-hidden="true" size={15} />
            <span className="sr-only">Tải file PDF</span>
          </a>
        ) : null}
        <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
        <button
          aria-label={locked ? 'File PDF đã khóa' : 'Thay file PDF'}
          className="table-upload-button"
          disabled={locked || isUploading}
          onClick={() => inputRef.current?.click()}
          title={locked ? 'File PDF đã khóa sau khi gửi email' : 'Thay file PDF'}
          type="button"
        >
          {locked ? <LockKeyhole aria-hidden="true" size={15} /> : <Upload aria-hidden="true" size={15} />}
          <span>{isUploading ? 'Đang tải...' : locked ? 'Đã khóa' : 'Thay file'}</span>
        </button>
      </div>
      {error ? <span className="report-table-error" title={error}><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
    </div>
  )
}

export function ReportDeliveryFileStatus({ status }: { status: ReportDeliveryStatus | null }) {
  if (!status) return <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span>
  if (!status.file.available) return <span className="report-file-result is-missing">Chưa có file PDF</span>

  return (
    <span className="report-file-result" title={status.file.fileName ?? 'File PDF'}>
      <FileText aria-hidden="true" size={15} />
      <span>{status.file.fileName ?? 'bao-cao.pdf'}</span>
    </span>
  )
}

export function ReportDeliveryControls({
  onChanged,
  status,
  submissionId,
}: {
  onChanged: (status: ReportDeliveryStatus) => void
  status: ReportDeliveryStatus | null
  submissionId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const file = status?.file
  const locked = Boolean(file?.lockedAt) || status?.emailStatus === 'sent' || status?.emailStatus === 'sending'
  const emailLabel = emailStatusLabel(status?.emailStatus ?? 'not_ready')

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Chỉ chấp nhận file PDF.')
      return
    }
    setError('')
    setIsUploading(true)
    try {
      onChanged(await uploadReportPdf(submissionId, selected))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được file PDF lên.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="report-delivery-panel">
      <div className="report-delivery-heading">
        <div>
          <h3>File báo cáo gửi cho người tham gia</h3>
          <p>Mỗi lượt gửi chỉ dùng một file PDF. Sau khi gửi email, file sẽ được khóa.</p>
        </div>
        <span className={status?.emailStatus === 'sent' ? 'delivery-state is-sent' : 'delivery-state'}>
          {status?.emailStatus === 'sent' ? <CheckCircle2 aria-hidden="true" size={15} /> : <XCircle aria-hidden="true" size={15} />}
          {emailLabel}
        </span>
      </div>

      {file?.available ? (
        <div className="report-file-row">
          <div className="report-file-copy">
            <strong>{file.fileName}</strong>
            <span>{formatBytes(file.fileSize)}{file.lockedAt ? ' · Đã khóa thay thế' : ''}</span>
          </div>
          {file.downloadUrl ? (
            <a className="mini-link-button" href={apiUrl(file.downloadUrl)} rel="noreferrer" target="_blank">
              <Download aria-hidden="true" size={15} />
              <span>Xem file</span>
            </a>
          ) : null}
        </div>
      ) : (
        <p className="report-file-empty">Chưa có file PDF cho lượt gửi này.</p>
      )}

      <div className="report-delivery-actions">
        <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
        <button className="secondary-button" disabled={locked || isUploading} onClick={() => inputRef.current?.click()} type="button">
          {locked ? <LockKeyhole aria-hidden="true" size={16} /> : <Upload aria-hidden="true" size={16} />}
          <span>{locked ? 'Đã khóa file' : file?.available ? 'Thay file PDF' : 'Tải file PDF lên'}</span>
        </button>
        {isUploading ? <span className="report-uploading">Đang tải lên...</span> : null}
      </div>
      {error ? <p className="report-delivery-error">{error}</p> : null}
    </section>
  )
}
