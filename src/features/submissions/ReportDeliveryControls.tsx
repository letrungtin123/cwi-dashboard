import { useRef, useState, type ChangeEvent } from 'react'
import { Download, FileText, LockKeyhole, RotateCcw, Upload, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { apiUrl, retryReportEmail, retryReportGeneration, uploadReportPdf } from '@/lib/api'
import { canManageContent } from '@/lib/roles'
import type { ReportDeliveryStatus, ReportSummary } from '@/types'
import { pausedReportTooltip } from './reportGenerationLabels'

export function ReportDeliveryTableCell({
  actionOnly = false,
  onChanged,
  onReportRetry,
  report,
  status,
  submissionId,
}: {
  actionOnly?: boolean
  onChanged: (status: ReportDeliveryStatus) => void
  onReportRetry: () => Promise<void>
  report: ReportSummary
  status: ReportDeliveryStatus | null
  submissionId: string
}) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isRetryingReport, setIsRetryingReport] = useState(false)
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

  async function handleRetry() {
    setError('')
    setIsRetrying(true)
    try {
      onChanged(await retryReportEmail(submissionId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không gửi lại email được.')
    } finally {
      setIsRetrying(false)
    }
  }

  async function handleReportRetry() {
    setError('')
    setIsRetryingReport(true)
    try {
      await retryReportGeneration(submissionId)
      await onReportRetry()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo lại báo cáo được.')
    } finally {
      setIsRetryingReport(false)
    }
  }

  // Viewers: status only, no buttons and no file download.
  if (!canManageContent(user?.role)) {
    if (actionOnly) return !status ? <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span> : null
    return <ReportDeliveryFileStatus report={report} status={status} />
  }

  if (actionOnly) {
    return (
      <div className="report-table-actions">
        {file?.downloadUrl ? (
          <a aria-label="Tải file PDF" className="table-download-button" data-tooltip="Tải file PDF" download href={apiUrl(file.downloadUrl)}>
            <Download aria-hidden="true" size={15} />
            <span className="sr-only">Tải file PDF</span>
          </a>
        ) : null}
        {status ? <>
          <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
          <button
            aria-label={locked ? 'File PDF đã khóa' : file?.available ? 'Thay file PDF' : 'Tải file PDF lên'}
            className="table-upload-button"
            disabled={locked || isUploading}
            onClick={() => inputRef.current?.click()}
            data-tooltip={locked ? 'File PDF đã khóa sau khi gửi email' : file?.available ? 'Thay file PDF' : 'Tải file PDF lên'}
            type="button"
          >
            {locked ? <LockKeyhole aria-hidden="true" size={15} /> : <Upload aria-hidden="true" size={15} />}
            <span>{isUploading ? 'Đang tải...' : locked ? 'Đã khóa' : file?.available ? 'Thay file' : 'Tải lên'}</span>
          </button>
        </> : null}
        {status?.emailStatus === 'failed' ? (
          <button aria-label="Gửi lại email" className="table-retry-button" data-tooltip="Gửi lại email" disabled={isRetrying} onClick={() => void handleRetry()} type="button">
            <RotateCcw aria-hidden="true" size={15} />
            <span>{isRetrying ? 'Đang gửi...' : 'Gửi lại'}</span>
          </button>
        ) : null}
        {report.status === 'failed' ? (
          <button aria-label="Tạo lại báo cáo" className="table-retry-button report-generation-retry-button" data-tooltip={report.errorMessage ?? 'Tạo lại báo cáo và gửi email khi PDF sẵn sàng'} data-tooltip-wide disabled={isRetryingReport} onClick={() => void handleReportRetry()} type="button">
            <RotateCcw aria-hidden="true" size={15} />
            <span>{isRetryingReport ? 'Đang tạo...' : 'Tạo lại'}</span>
          </button>
        ) : null}
        {!status ? <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span> : null}
        {error ? <span className="report-table-error" data-tooltip={error} data-tooltip-wide><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
      </div>
    )
  }

  if (!status) return <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span>

  if (!file?.available) {
    return (
      <div className="report-table-upload">
        <input ref={inputRef} accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleFileChange(event)} type="file" />
        <button
          aria-label="Tải file PDF lên"
          className="table-upload-button"
          disabled={locked || isUploading}
          onClick={() => inputRef.current?.click()}
          data-tooltip="Tải file PDF lên"
          type="button"
        >
          <Upload aria-hidden="true" size={15} />
          <span>{isUploading ? 'Đang tải...' : 'Tải PDF lên'}</span>
        </button>
        {report.status === 'failed' ? (
          <button aria-label="Tạo lại báo cáo" className="table-retry-button report-generation-retry-button" data-tooltip={report.errorMessage ?? 'Tạo lại báo cáo và gửi email khi PDF sẵn sàng'} data-tooltip-wide disabled={isRetryingReport} onClick={() => void handleReportRetry()} type="button">
            <RotateCcw aria-hidden="true" size={15} />
            <span>{isRetryingReport ? 'Đang tạo...' : 'Tạo lại'}</span>
          </button>
        ) : null}
        {error ? <span className="report-table-error" data-tooltip={error} data-tooltip-wide><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
      </div>
    )
  }

  return (
    <div className="report-table-file">
      <div className="report-table-file-copy">
        <span className="report-table-file-name" data-tooltip={file.fileName ?? 'File PDF'}>
          <FileText aria-hidden="true" size={15} />
          <span>{file.fileName ?? 'bao-cao.pdf'}</span>
        </span>
        <span className="report-table-file-meta">{file.lockedAt ? 'Đã khóa thay thế' : 'Sẵn sàng gửi'}</span>
      </div>
      <div className="report-table-file-actions">
        {file.downloadUrl ? (
          <a aria-label="Tải file PDF" className="table-download-button" data-tooltip="Tải file PDF" download href={apiUrl(file.downloadUrl)}>
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
          data-tooltip={locked ? 'File PDF đã khóa sau khi gửi email' : 'Thay file PDF'}
          type="button"
        >
          {locked ? <LockKeyhole aria-hidden="true" size={15} /> : <Upload aria-hidden="true" size={15} />}
          <span>{isUploading ? 'Đang tải...' : locked ? 'Đã khóa' : 'Thay file'}</span>
        </button>
      </div>
      {error ? <span className="report-table-error" data-tooltip={error} data-tooltip-wide><XCircle aria-hidden="true" size={14} /><span>Lỗi tải file</span></span> : null}
    </div>
  )
}

export function ReportDeliveryFileStatus({ report, status }: { report: ReportSummary; status: ReportDeliveryStatus | null }) {
  if (report.status === 'generating' && report.generationPaused) {
    return <span className="report-file-result report-file-result-progress report-paused" data-tooltip={pausedReportTooltip} data-tooltip-wide>Chờ tạo báo cáo</span>
  }
  if (report.status === 'generating') return <span className="report-file-result report-file-result-progress report-generating">Đang tạo báo cáo</span>
  if (report.status === 'failed') return <span className="report-file-result report-file-result-progress report-failed" data-tooltip={report.errorMessage ?? 'Tạo báo cáo lỗi'} data-tooltip-wide>Tạo báo cáo lỗi</span>
  if (!status) return <span className="report-table-state report-table-state-error">Chưa tải được trạng thái PDF</span>
  if (!status.file.available) return <span className="report-file-result is-missing">Chưa có file PDF</span>

  return (
    <span className="report-file-result" data-tooltip={status.file.fileName ?? 'File PDF'}>
      <FileText aria-hidden="true" size={15} />
      <span>{status.file.fileName ?? 'bao-cao.pdf'}</span>
    </span>
  )
}
