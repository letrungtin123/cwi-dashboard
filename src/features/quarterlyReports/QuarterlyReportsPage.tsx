import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Copy, ExternalLink, FileText, FileUp, History, LoaderCircle, Plus, QrCode, RefreshCw, Save, Trash2, UploadCloud } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  createQuarterlyReport,
  deleteQuarterlyReportFile,
  deleteQuarterlyReportImage,
  listQuarterlyReports,
  quarterlyReportFileUrl,
  updateQuarterlyReport,
  updateQuarterlyReportPage,
  uploadQuarterlyReportFile,
  uploadQuarterlyReportImage,
} from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { getLandingUrl } from '@/lib/landing'
import { canManageContent } from '@/lib/roles'
import { copyText, downloadQrCode } from '@/lib/shareLink'
import type { QuarterlyReportAdmin, QuarterlyReportAdminList, ReportLanguage } from '@/types'
import { AccordionHead, BilingualField, CardHeadingEditor, CardImageEditor, errorMessage, sameBilingual } from '@/features/surveyQuarters/cardEditorParts'
import { QuarterlyReportHistoryDialog } from './QuarterlyReportHistoryDialog'

const languageLabel: Record<ReportLanguage, string> = { en: 'tiếng Anh', vi: 'tiếng Việt' }

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Link of one quarter's report for ads and QR codes. The English one opens the page in English.
export function quarterlyReportPublicUrl(slug: string, language: ReportLanguage) {
  return getLandingUrl(`/bao-cao-quy/${encodeURIComponent(slug)}${language === 'en' ? '?lang=en' : ''}`)
}

export function quarterlyReportQrFileName(slug: string, language: ReportLanguage) {
  return `ma-qr-bao-cao-${slug}${language === 'en' ? '-en' : ''}.png`
}

function filesSummary(report: QuarterlyReportAdmin) {
  if (report.files.vi && report.files.en) return 'Có bản VI + EN'
  if (report.files.vi) return 'Chỉ có bản VI'
  if (report.files.en) return 'Chỉ có bản EN'
  return 'Chưa có PDF'
}

// Year + quarter picker that adds a quarter (hidden, without files) to the list.
function AddQuarterPanel({ existing, onCreated }: { existing: Set<string>; onCreated: (report: QuarterlyReportAdmin) => void }) {
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodQuarter, setPeriodQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const exists = existing.has(`q${periodQuarter}-${periodYear}`)

  async function add() {
    setBusy(true)
    setError('')
    try {
      onCreated(await createQuarterlyReport({ periodQuarter, periodYear }))
    } catch (caught) {
      setError(errorMessage(caught, 'Không thêm được quý.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-surface quarterly-report-add">
      <div className="surface-head"><div><p>Thêm quý</p><h2>Thêm báo cáo của một quý mới</h2></div></div>
      <div className="quarterly-report-add-form">
        <div aria-labelledby="quarterly-report-year-label" className="quarterly-report-period-field">
          <span id="quarterly-report-year-label">Năm</span>
          <div className="quarterly-report-year-control">
            <CalendarDays aria-hidden="true" size={18} />
            <button aria-label="Giảm năm" disabled={busy || periodYear <= 2020} onClick={() => setPeriodYear((current) => Math.max(2020, current - 1))} type="button"><ChevronLeft aria-hidden="true" size={17} /></button>
            <input aria-labelledby="quarterly-report-year-label" max="2100" min="2020" onChange={(event) => setPeriodYear(Math.min(2100, Math.max(2020, Number(event.currentTarget.value) || 2020)))} type="number" value={periodYear} />
            <button aria-label="Tăng năm" disabled={busy || periodYear >= 2100} onClick={() => setPeriodYear((current) => Math.min(2100, current + 1))} type="button"><ChevronRight aria-hidden="true" size={17} /></button>
          </div>
        </div>
        <div aria-labelledby="quarterly-report-quarter-label" className="quarterly-report-period-field">
          <span id="quarterly-report-quarter-label">Quý</span>
          <div aria-label="Chọn quý" className="quarterly-report-quarter-picker" role="radiogroup">
            {[1, 2, 3, 4].map((quarter) => <button aria-checked={periodQuarter === quarter} className={periodQuarter === quarter ? 'is-selected' : ''} disabled={busy} key={quarter} onClick={() => setPeriodQuarter(quarter)} role="radio" type="button"><span>Q{quarter}</span><small>Quý {quarter}</small></button>)}
          </div>
        </div>
        <button className="primary-button quarterly-report-add-button" disabled={busy || exists} onClick={() => void add()} type="button">
          {busy ? <LoaderCircle aria-hidden="true" className="spinning-icon" size={16} /> : <Plus aria-hidden="true" size={16} />}
          <span>{exists ? 'Quý này đã có' : 'Thêm quý'}</span>
        </button>
      </div>
      <p className="quarter-help">Quý mới bắt đầu ở trạng thái ẩn. Tải PDF, sửa thẻ rồi bật “Hiện” để đưa lên trang Báo cáo quý.</p>
      {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
    </section>
  )
}

// One PDF of a quarter (Vietnamese or English): what is uploaded, and upload / replace / remove.
function ReportFileSlot({ busy, canEdit, language, onRemove, onUpload, report }: {
  busy: boolean
  canEdit: boolean
  language: ReportLanguage
  onRemove: () => void
  onUpload: (file: File) => void
  report: QuarterlyReportAdmin
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const file = report.files[language]
  const pick = () => { if (!busy) inputRef.current?.click() }
  const take = (next: File | null | undefined) => {
    if (next) onUpload(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="quarterly-report-file-field quarterly-report-slot">
      <span>PDF {languageLabel[language]}</span>
      {canEdit ? <input accept="application/pdf,.pdf" className="sr-only" onChange={(event) => take(event.currentTarget.files?.[0])} ref={inputRef} tabIndex={-1} type="file" /> : null}
      {file ? (
        <div className="quarterly-report-file-dropzone has-file">
          <div className="quarterly-report-file-summary">
            <span className="quarterly-report-file-icon"><FileText aria-hidden="true" size={22} /></span>
            <span><strong>{file.fileName}</strong><small>{formatFileSize(file.fileSize)} · Tải lên {formatDateTime(file.uploadedAt)}</small></span>
          </div>
          {/* Viewers see the file name only, as for every report PDF in the dashboard. */}
          {canEdit ? (
            <div className="quarterly-report-file-actions">
              <a className="mini-link-button" href={quarterlyReportFileUrl(report.slug, language)} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size={15} /><span>Xem</span></a>
              <button disabled={busy} onClick={pick} type="button"><FileUp aria-hidden="true" size={17} /><span>Đổi file</span></button>
              <button aria-label={`Gỡ PDF ${languageLabel[language]}`} className="quarterly-report-file-remove" data-tooltip="Gỡ file" disabled={busy} onClick={onRemove} type="button"><Trash2 aria-hidden="true" size={16} /></button>
            </div>
          ) : null}
        </div>
      ) : canEdit ? (
        <div
          className={`quarterly-report-file-dropzone${dragging ? ' is-dragging' : ''}`}
          onClick={pick}
          onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true) }}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) take(event.dataTransfer.files?.[0]) }}
        >
          <span className="quarterly-report-file-icon"><UploadCloud aria-hidden="true" size={23} /></span>
          <span className="quarterly-report-file-empty"><strong>Kéo PDF {languageLabel[language]} vào đây</strong><small>Hoặc chọn từ thiết bị. Tối đa 20 MB.</small></span>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); pick() }} type="button"><FileUp aria-hidden="true" size={17} /><span>Chọn file PDF</span></button>
        </div>
      ) : (
        <p className="quarter-help">Chưa có file.</p>
      )}
    </div>
  )
}

// Ads link + QR code of one language.
function ReportLink({ language, onNotice, slug }: { language: ReportLanguage; onNotice: (message: string) => void; slug: string }) {
  const url = quarterlyReportPublicUrl(slug, language)
  return (
    <div className="survey-source-link quarterly-report-link">
      <span className="quarterly-report-link-label">Bản {languageLabel[language]}</span>
      <a href={url} rel="noreferrer" target="_blank">{url}</a>
      <div className="survey-source-link-actions">
        <button className="mini-link-button" onClick={() => { copyText(url).then(() => onNotice('Đã sao chép link báo cáo.'), () => onNotice('Không thể sao chép link trên trình duyệt này.')) }} type="button">
          <Copy aria-hidden="true" size={14} /><span>Sao chép link</span>
        </button>
        <button className="mini-link-button" onClick={() => { downloadQrCode(url, quarterlyReportQrFileName(slug, language)).then(() => onNotice('Đã tải mã QR.'), () => onNotice('Không thể tạo mã QR. Vui lòng thử lại.')) }} type="button">
          <QrCode aria-hidden="true" size={14} /><span>Tải mã QR</span>
        </button>
      </div>
    </div>
  )
}

function ReportEditor({ canEdit, isCurrent, onHistory, onSaved, report }: { canEdit: boolean; isCurrent: boolean; onHistory: () => void; onSaved: (report: QuarterlyReportAdmin) => void; report: QuarterlyReportAdmin }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const [title, setTitle] = useState(report.title)
  const [description, setDescription] = useState(report.description)
  const [isVisible, setIsVisible] = useState(report.isVisible)
  const [sortOrder, setSortOrder] = useState(String(report.sortOrder))
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<ReportLanguage | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Saved here or reloaded with someone else's change: show what is stored now.
  useEffect(() => {
    setTitle(report.title)
    setDescription(report.description)
    setIsVisible(report.isVisible)
    setSortOrder(String(report.sortOrder))
  }, [report])

  const order = Number(sortOrder)
  const orderValid = Number.isInteger(order) && order >= 0 && order <= 999
  const titlesValid = Boolean(title.vi.trim() && title.en.trim())
  const dirty = !sameBilingual(title, report.title) || !sameBilingual(description, report.description) || isVisible !== report.isVisible || order !== report.sortOrder
  const label = report.label.vi
  const hasFile = Boolean(report.files.vi || report.files.en)

  // Runs one change; the saved quarter replaces the one on screen.
  async function run(action: () => Promise<QuarterlyReportAdmin>, done: string, failed: string) {
    setBusy(true)
    setNotice('')
    setError('')
    try {
      onSaved(await action())
      setNotice(done)
    } catch (caught) {
      setError(errorMessage(caught, failed))
    } finally {
      setBusy(false)
    }
  }

  const save = () => run(
    () => updateQuarterlyReport(report.slug, { description, isVisible, sortOrder: order, title }),
    'Đã lưu. Trang Báo cáo quý hiển thị nội dung mới trong vòng 1 phút.',
    'Không lưu được thẻ báo cáo.',
  )

  return (
    <section aria-busy={busy} className={`content-surface quarter-editor${report.isListed ? '' : ' is-hidden'}${open ? ' is-open' : ''}`}>
      <AccordionHead bodyId={bodyId} kicker={`Báo cáo ${label}`} onToggle={() => setOpen((current) => !current)} open={open} title={report.title.vi}>
        {dirty ? <span className="quarter-badge is-dirty">Chưa lưu</span> : null}
        {isCurrent ? <span className="quarter-badge is-current">Quý mới nhất</span> : null}
        <span className={`quarter-badge ${report.isListed ? 'is-on' : report.isVisible ? 'is-paused' : 'is-off'}`}>
          {report.isListed ? 'Đang hiện' : report.isVisible ? 'Chưa hiện: thiếu PDF' : 'Đang ẩn'}
        </span>
        <span className={`quarter-badge ${report.files.vi && report.files.en ? 'is-on' : 'is-paused'}`}>{filesSummary(report)}</span>
        <button aria-label={`Lịch sử ${label}`} className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={onHistory} type="button">
          <History aria-hidden="true" size={16} />
        </button>
      </AccordionHead>

      <div className="quarter-editor-body" hidden={!open} id={bodyId}>
        <p className="quarter-help">{formatNumber(report.downloadRequests)} người đã điền form tải báo cáo {label}.</p>

        <div className="quarterly-report-slots">
          {(['vi', 'en'] as const).map((language) => (
            <ReportFileSlot
              busy={busy}
              canEdit={canEdit}
              key={language}
              language={language}
              onRemove={() => setRemoving(language)}
              onUpload={(file) => void run(() => uploadQuarterlyReportFile(report.slug, language, file), `Đã tải PDF ${languageLabel[language]} lên.`, 'Không tải được file PDF lên.')}
              report={report}
            />
          ))}
        </div>
        <p className="quarter-help">Khách xem trang bằng tiếng nào thì mở bản tiếng đó, và có nút chuyển VI/EN khi quý có đủ 2 bản. Quý chỉ có một bản thì mở bản đang có, kèm dòng báo bản kia sắp có.</p>

        {removing ? (
          <div aria-label="Xác nhận gỡ file" className="report-generation-confirm" role="alertdialog">
            <p>
              Gỡ PDF {languageLabel[removing]} của {label}?{' '}
              {report.files[removing === 'vi' ? 'en' : 'vi'] ? `Khách sẽ mở bản ${languageLabel[removing === 'vi' ? 'en' : 'vi']}.` : 'Quý này sẽ không còn file nào nên thẻ sẽ không hiện trên trang.'}
            </p>
            <div>
              <button className="danger-button" disabled={busy} onClick={() => { const language = removing; setRemoving(null); void run(() => deleteQuarterlyReportFile(report.slug, language), `Đã gỡ PDF ${languageLabel[language]}.`, 'Không gỡ được file.') }} type="button">
                <span>Gỡ file</span>
              </button>
              <button className="secondary-button" disabled={busy} onClick={() => setRemoving(null)} type="button"><span>Hủy</span></button>
            </div>
          </div>
        ) : null}

        <div className="quarter-card-layout">
          <CardImageEditor
            alt={`Ảnh thẻ báo cáo ${label}`}
            busy={busy}
            canEdit={canEdit}
            emptyText="Chưa có ảnh riêng: trang Báo cáo quý đang dùng ảnh mặc định."
            imageUrl={report.imageUrl}
            onPick={(file) => run(() => uploadQuarterlyReportImage(report.slug, file), 'Đã tải ảnh mới lên.', 'Không tải được ảnh lên.')}
            onRemove={() => void run(() => deleteQuarterlyReportImage(report.slug), 'Đã gỡ ảnh. Thẻ dùng lại ảnh mặc định.', 'Không gỡ được ảnh.')}
          />

          <div className="quarter-fields">
            <BilingualField disabled={!canEdit || busy} label="Tiêu đề" max={180} onChange={setTitle} value={title} />
            <BilingualField disabled={!canEdit || busy} label="Mô tả" max={400} multiline onChange={setDescription} value={description} />
            <div className="quarter-inline">
              <label className="quarter-toggle">
                <input checked={isVisible} disabled={!canEdit || busy} onChange={(event) => setIsVisible(event.currentTarget.checked)} role="switch" type="checkbox" />
                <span>Hiện thẻ này trên trang Báo cáo quý</span>
              </label>
              <label className="roundtable-event-field quarter-order">
                <span>Thứ tự</span>
                <input disabled={!canEdit || busy} inputMode="numeric" max={999} min={0} onChange={(event) => setSortOrder(event.currentTarget.value)} type="number" value={sortOrder} />
              </label>
            </div>
            {isVisible && !hasFile ? <p className="quarter-help">Thẻ chỉ hiện khi quý đã có ít nhất một file PDF.</p> : null}
            {!isVisible ? <p className="quarter-help">Khi ẩn, thẻ không còn trên trang và link quảng cáo của quý này cũng không mở được.</p> : null}
          </div>
        </div>

        <div className="quarterly-report-links">
          <strong>Link quảng cáo và mã QR</strong>
          <ReportLink language="vi" onNotice={setNotice} slug={report.slug} />
          <ReportLink language="en" onNotice={setNotice} slug={report.slug} />
        </div>

        {!orderValid ? <p className="roundtable-event-error">Thứ tự phải là số từ 0 đến 999.</p> : null}
        {!titlesValid ? <p className="roundtable-event-error">Cần nhập tiêu đề cả tiếng Việt và tiếng Anh.</p> : null}

        {canEdit ? (
          <div className="quarter-actions">
            <button className="primary-button" disabled={busy || !dirty || !orderValid || !titlesValid} onClick={() => void save()} type="button">
              <Save aria-hidden="true" size={16} />
              <span>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        ) : null}

        <p className="roundtable-event-meta">Sửa lần cuối lúc {formatDateTime(report.updatedAt)}{report.updatedByEmail ? ` bởi ${report.updatedByEmail}` : ''}</p>
        {notice ? <p aria-live="polite" className="roundtable-event-notice">{notice}</p> : null}
        {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
      </div>
    </section>
  )
}

// "Quản lý báo cáo quý": the cards of /bao-cao-quy, each quarter with a Vietnamese and an
// English PDF. Admins and super admins edit; viewers only see.
export function QuarterlyReportsPage() {
  const { user } = useAuth()
  const canEdit = canManageContent(user?.role)
  const [data, setData] = useState<QuarterlyReportAdminList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyReport, setHistoryReport] = useState<QuarterlyReportAdmin | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await listQuarterlyReports())
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được danh sách báo cáo quý.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const replaceReport = (next: QuarterlyReportAdmin) => {
    setData((current) => {
      if (!current) return current
      const known = current.reports.some((report) => report.slug === next.slug)
      return { ...current, reports: known ? current.reports.map((report) => (report.slug === next.slug ? next : report)) : [...current.reports, next] }
    })
  }

  const listed = data?.reports.filter((report) => report.isListed) ?? []
  const newest = [...listed].sort((a, b) => b.periodYear - a.periodYear || b.periodQuarter - a.periodQuarter)[0]
  const ordered = data ? [...data.reports].sort((a, b) => a.sortOrder - b.sortOrder || a.periodYear - b.periodYear || a.periodQuarter - b.periodQuarter) : []

  return (
    <main className="dashboard-main quarterly-report-manager">
      <section className="content-surface quarter-intro">
        <div className="surface-head">
          <div>
            <p className="surface-kicker">BÁO CÁO QUÝ</p>
            <h2>Quản lý báo cáo quý</h2>
          </div>
          <div className="surface-actions">
            <button className="secondary-button" disabled={isLoading} onClick={() => void load()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>
        <div className="survey-sources-intro">
          <p>Trang Báo cáo quý trên landing page hiện các thẻ bên dưới; bấm thẻ nào thì mở báo cáo của quý đó. Thẻ của <strong>quý mới nhất đang hiện</strong> được làm nổi bật, thẻ nào đứng trước do ô <strong>Thứ tự</strong> quyết định (số nhỏ đứng trước).</p>
          <p>Mỗi quý có 2 file PDF: <strong>tiếng Việt</strong> và <strong>tiếng Anh</strong>. Thẻ chỉ hiện khi bật “Hiện” và đã có ít nhất một file.</p>
        </div>
        {error ? (
          <div className="empty-state">
            <CircleAlert aria-hidden="true" size={30} />
            <h2>Không tải được dữ liệu</h2>
            <p>{error}</p>
            <button className="secondary-button" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}
        {!error && isLoading && !data ? <p className="survey-sources-empty">Đang tải báo cáo quý...</p> : null}
      </section>

      {data ? (
        <>
          {canEdit ? <AddQuarterPanel existing={new Set(data.reports.map((report) => report.slug))} onCreated={replaceReport} /> : null}
          <CardHeadingEditor
            canEdit={canEdit}
            help="Hiện ở đầu trang Báo cáo quý (/bao-cao-quy), phía trên các thẻ."
            kicker="Phần đầu trang Báo cáo quý"
            onSave={updateQuarterlyReportPage}
            onSaved={(page) => setData((current) => (current ? { ...current, page } : current))}
            page={data.page}
            savedNotice="Đã lưu. Trang Báo cáo quý hiển thị nội dung mới trong vòng 1 phút."
          />
          {ordered.map((report) => (
            <ReportEditor
              canEdit={canEdit}
              isCurrent={report.slug === newest?.slug}
              key={report.slug}
              onHistory={() => setHistoryReport(report)}
              onSaved={replaceReport}
              report={report}
            />
          ))}
          {!ordered.length ? <section className="content-surface"><p className="survey-sources-empty">Chưa có báo cáo quý nào.{canEdit ? ' Thêm quý ở trên để bắt đầu.' : ''}</p></section> : null}
        </>
      ) : null}

      {historyReport ? <QuarterlyReportHistoryDialog onClose={() => setHistoryReport(null)} report={historyReport} /> : null}
    </main>
  )
}
