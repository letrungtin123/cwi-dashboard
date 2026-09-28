import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileText, FileUp, LoaderCircle, QrCode, RefreshCw, UploadCloud, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ApiError, listQuarterlyReports, uploadQuarterlyReport } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { QuarterlyReportAdmin } from '@/types'

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function publicCampaignUrl(slug: string) {
  const landingOrigin = import.meta.env.DEV ? 'http://127.0.0.1:5670' : window.location.origin
  return `${landingOrigin}/bao-cao-quy/${encodeURIComponent(slug)}`
}

export function QuarterlyReportsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reports, setReports] = useState<QuarterlyReportAdmin[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodQuarter, setPeriodQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('Năng lực lãnh đạo cho tăng trưởng')
  const [activate, setActivate] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [qrGeneratingSlug, setQrGeneratingSlug] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setIsLoading(true)
    try {
      setReports(await listQuarterlyReports())
      setError('')
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Không thể tải danh sách báo cáo quý.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const selectFile = (nextFile: File | null) => {
    setNotice('')
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!nextFile.name.toLowerCase().endsWith('.pdf') || (nextFile.type && nextFile.type !== 'application/pdf')) {
      setFile(null)
      setError('Chỉ được chọn file PDF.')
      return
    }
    setError('')
    setFile(nextFile)
  }

  const clearFile = () => {
    setFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openFilePicker = () => {
    if (!isSubmitting) fileInputRef.current?.click()
  }

  const submit = async () => {
    if (!file || isSubmitting) {
      setError('Vui lòng chọn file PDF để tải lên.')
      return
    }
    setIsSubmitting(true)
    setError('')
    setNotice('')
    try {
      const report = await uploadQuarterlyReport({ activate, file, periodQuarter, periodYear, subtitle, title })
      setReports((current) => [report, ...current.filter((item) => item.id !== report.id)].sort((a, b) => b.periodYear - a.periodYear || b.periodQuarter - a.periodQuarter))
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setNotice(`Đã lưu Báo cáo Quý ${report.periodQuarter}/${report.periodYear}${report.isActive ? ' và đặt làm báo cáo đang hiển thị.' : '.'}`)
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : 'Không thể tải báo cáo quý lên.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyPublicUrl = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicCampaignUrl(slug))
      setNotice('Đã sao chép URL báo cáo để dùng cho quảng cáo.')
    } catch {
      setError('Không thể sao chép URL trên trình duyệt này.')
    }
  }

  const downloadPublicUrlQr = async (slug: string) => {
    if (qrGeneratingSlug) return

    setQrGeneratingSlug(slug)
    setError('')
    try {
      const dataUrl = await QRCode.toDataURL(publicCampaignUrl(slug), {
        color: { dark: '#003d7c', light: '#ffffffff' },
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1024,
      })
      const anchor = document.createElement('a')
      anchor.download = `ma-qr-bao-cao-${slug}.png`
      anchor.href = dataUrl
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setNotice('Đã tạo mã QR cho URL báo cáo.')
    } catch {
      setError('Không thể tạo mã QR cho URL báo cáo.')
    } finally {
      setQrGeneratingSlug(null)
    }
  }

  return (
    <main className="dashboard-main quarterly-report-manager">
      <section className="content-surface quarterly-report-upload" data-loading={isSubmitting}>
        <div className="surface-head"><div><p className="surface-kicker">BÁO CÁO QUÝ</p><h2>Đăng tải báo cáo mới</h2><p>Chọn file PDF và bật hiển thị để báo cáo xuất hiện trong phần Báo cáo trên landing page.</p></div></div>
        <div className="quarterly-report-upload-form">
          <div aria-labelledby="quarterly-report-year-label" className="quarterly-report-period-field">
            <span id="quarterly-report-year-label">Năm <b>*</b></span>
            <div className="quarterly-report-year-control">
              <CalendarDays aria-hidden="true" size={18} />
              <button aria-label="Giảm năm báo cáo" data-tooltip="Giảm năm" disabled={isSubmitting || periodYear <= 2020} onClick={() => setPeriodYear((current) => Math.max(2020, current - 1))} type="button"><ChevronLeft aria-hidden="true" size={17} /></button>
              <input aria-labelledby="quarterly-report-year-label" max="2100" min="2020" onChange={(event) => setPeriodYear(Math.min(2100, Math.max(2020, Number(event.currentTarget.value) || 2020)))} type="number" value={periodYear} />
              <button aria-label="Tăng năm báo cáo" data-tooltip="Tăng năm" disabled={isSubmitting || periodYear >= 2100} onClick={() => setPeriodYear((current) => Math.min(2100, current + 1))} type="button"><ChevronRight aria-hidden="true" size={17} /></button>
            </div>
          </div>
          <div aria-labelledby="quarterly-report-quarter-label" className="quarterly-report-period-field">
            <span id="quarterly-report-quarter-label">Quý <b>*</b></span>
            <div aria-label="Chọn quý báo cáo" className="quarterly-report-quarter-picker" role="radiogroup">
              {[1, 2, 3, 4].map((quarter) => <button aria-checked={periodQuarter === quarter} className={periodQuarter === quarter ? 'is-selected' : ''} disabled={isSubmitting} key={quarter} onClick={() => setPeriodQuarter(quarter)} role="radio" type="button"><span>Q{quarter}</span><small>Quý {quarter}</small></button>)}
            </div>
          </div>
          <label className="quarterly-report-copy-field quarterly-report-wide"><span>Tiêu đề hiển thị</span><input onChange={(event) => setTitle(event.currentTarget.value)} placeholder={`Báo cáo CEO Workforce Index Quý ${periodQuarter}/${periodYear}`} value={title} /></label>
          <label className="quarterly-report-copy-field quarterly-report-wide"><span>Phụ đề</span><input onChange={(event) => setSubtitle(event.currentTarget.value)} value={subtitle} /></label>
          <div className="quarterly-report-file-field">
            <span>File PDF <b>*</b></span>
            <input accept="application/pdf,.pdf" className="sr-only" id="quarterly-report-file" onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)} ref={fileInputRef} type="file" />
            <div
              aria-describedby={file ? undefined : 'quarterly-report-file-help'}
              className={`quarterly-report-file-dropzone${file ? ' has-file' : ''}${isDraggingFile ? ' is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); if (!isSubmitting) setIsDraggingFile(true) }}
              onDragLeave={(event) => { event.preventDefault(); setIsDraggingFile(false) }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); if (!isSubmitting) selectFile(event.dataTransfer.files?.[0] ?? null) }}
            >
              {file ? <><div className="quarterly-report-file-summary"><span className="quarterly-report-file-icon"><FileText aria-hidden="true" size={22} /></span><span><strong>{file.name}</strong><small>{formatFileSize(file.size)} · Sẵn sàng tải lên</small></span></div><div className="quarterly-report-file-actions"><button data-tooltip="Chọn PDF khác" disabled={isSubmitting} onClick={(event) => { event.stopPropagation(); openFilePicker() }} type="button"><FileUp aria-hidden="true" size={17} /><span>Đổi file</span></button><button aria-label="Bỏ file đã chọn" className="quarterly-report-file-remove" data-tooltip="Bỏ file" disabled={isSubmitting} onClick={(event) => { event.stopPropagation(); clearFile() }} type="button"><X aria-hidden="true" size={17} /></button></div></> : <><span className="quarterly-report-file-icon"><UploadCloud aria-hidden="true" size={23} /></span><span className="quarterly-report-file-empty"><strong>Kéo PDF vào đây hoặc chọn từ thiết bị</strong><small id="quarterly-report-file-help">Chỉ chấp nhận PDF, tối đa theo giới hạn cấu hình backend.</small></span><button disabled={isSubmitting} onClick={(event) => { event.stopPropagation(); openFilePicker() }} type="button"><FileUp aria-hidden="true" size={17} /><span>Chọn file PDF</span></button></>}
            </div>
          </div>
          <button aria-checked={activate} className="quarterly-report-toggle" disabled={isSubmitting} onClick={() => setActivate((current) => !current)} role="switch" type="button"><span aria-hidden="true" className="quarterly-report-switch"><span><Check size={13} strokeWidth={3} /></span></span><span><strong>{activate ? 'Hiển thị ngay trên landing page' : 'Lưu báo cáo vào lịch sử'}</strong><small>{activate ? 'Báo cáo đang hiển thị sẽ được chuyển vào lịch sử.' : 'Báo cáo này chưa xuất hiện trên landing page.'}</small></span></button>
          {error ? <p className="quarterly-report-message is-error" role="alert">{error}</p> : null}
          {notice ? <p className="quarterly-report-message is-success" role="status"><CheckCircle2 aria-hidden="true" size={16} /> {notice}</p> : null}
          <div className="quarterly-report-upload-actions"><button className="secondary-button" disabled={isSubmitting} onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /> Làm mới</button><button className="primary-button" disabled={isSubmitting || !file} onClick={() => void submit()} type="button">{isSubmitting ? <LoaderCircle aria-hidden="true" className="spinning-icon" size={17} /> : <FileUp aria-hidden="true" size={17} />}{isSubmitting ? 'Đang tải PDF' : 'Tải báo cáo lên'}</button></div>
        </div>
      </section>

      <section className="content-surface">
        <div className="surface-head"><div><p className="surface-kicker">LỊCH SỬ</p><h2>Báo cáo đã tải lên</h2><p>{isLoading ? 'Đang tải danh sách...' : `${reports.length} báo cáo được lưu riêng tư.`}</p></div></div>
        <div className="table-scroll"><table className="quarterly-report-table"><thead><tr><th>Kỳ báo cáo</th><th>Trạng thái</th><th>File</th><th>Tải lên</th><th>URL quảng cáo</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>Quý {report.periodQuarter}/{report.periodYear}</strong><span>{report.title}</span></td><td><span className={report.isActive ? 'quarterly-report-status is-active' : 'quarterly-report-status'}>{report.isActive ? 'Đang hiển thị' : 'Lịch sử'}</span></td><td className="quarterly-report-file-cell"><div className="quarterly-report-file-entry"><span aria-hidden="true" className="quarterly-report-file-entry-icon"><FileText size={18} /></span><div><strong aria-label={`Tên file: ${report.fileName}`}>{report.fileName}</strong><small>PDF · {formatFileSize(report.fileSize)}</small></div></div></td><td>{formatDateTime(report.uploadedAt)}</td><td><div className="quarterly-report-url-actions"><button aria-label={`Sao chép URL ${report.slug}`} className="mini-link-button" data-tooltip="Sao chép URL quảng cáo" onClick={() => void copyPublicUrl(report.slug)} type="button"><Copy aria-hidden="true" size={15} /><span>Sao chép URL</span></button><button aria-label={`Tải mã QR cho ${report.slug}`} className="mini-link-button quarterly-report-download-qr" data-tooltip="Tải mã QR" disabled={qrGeneratingSlug === report.slug} onClick={() => void downloadPublicUrlQr(report.slug)} type="button">{qrGeneratingSlug === report.slug ? <LoaderCircle aria-hidden="true" className="spinning-icon" size={15} /> : <QrCode aria-hidden="true" size={15} />}<span>{qrGeneratingSlug === report.slug ? 'Đang tạo...' : 'Tải mã QR'}</span></button></div></td></tr>)}{!isLoading && !reports.length ? <tr><td className="quarterly-report-empty" colSpan={5}>Chưa có báo cáo quý nào.</td></tr> : null}</tbody></table></div>
      </section>
    </main>
  )
}
