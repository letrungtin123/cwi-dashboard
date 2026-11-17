import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, CircleAlert, History, ImagePlus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { apiUrl, deleteSurveyQuarterImage, listSurveyQuarters, SURVEY_QUARTER_IMAGE_TYPES, updateSurveyQuarter, updateSurveyQuarterPage, uploadSurveyQuarterImage } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { Bilingual, SurveyQuarterAdmin, SurveyQuarterAdminList, SurveyQuarterPageContent } from '@/types'
import { SurveyQuarterHistoryDialog } from './SurveyQuarterHistoryDialog'

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}

// The survey waiting page writes the day count with two digits ("07 ngày").
const padDays = (days: number) => String(days).padStart(2, '0')

// Same sentence the survey shows after submitting while report creation is paused, so the
// admin sees exactly what participants read.
const participantMessage = (days: number) => `Báo cáo cá nhân sẽ được gửi đến email Anh/Chị sau ${padDays(days)} ngày tới.`

function BilingualField({ disabled, label, max, multiline = false, onChange, value }: { disabled: boolean; label: string; max: number; multiline?: boolean; onChange: (value: Bilingual) => void; value: Bilingual }) {
  return (
    <div className="quarter-bilingual">
      {(['vi', 'en'] as const).map((lang) => (
        <label className="roundtable-event-field quarter-field" key={lang}>
          <span>{label} <small className="quarter-lang">{lang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}</small></span>
          {multiline ? (
            <textarea disabled={disabled} maxLength={max} onChange={(event) => onChange({ ...value, [lang]: event.currentTarget.value })} rows={3} value={value[lang]} />
          ) : (
            <input disabled={disabled} maxLength={max} onChange={(event) => onChange({ ...value, [lang]: event.currentTarget.value })} value={value[lang]} />
          )}
        </label>
      ))}
    </div>
  )
}

// Head of one collapsible block: the title row opens or closes it; badges and buttons on the
// right do not.
function AccordionHead({ bodyId, children, kicker, onToggle, open, title }: { bodyId: string; children?: ReactNode; kicker: string; onToggle: () => void; open: boolean; title: string }) {
  return (
    <div className="surface-head quarter-accordion-head">
      <h2 className="quarter-accordion-heading">
        <button aria-controls={bodyId} aria-expanded={open} className="quarter-accordion-toggle" onClick={onToggle} type="button">
          <ChevronDown aria-hidden="true" className="quarter-accordion-chevron" size={18} />
          <span className="quarter-accordion-titles">
            <span className="quarter-accordion-kicker">{kicker}</span>
            <span className="quarter-accordion-title">{title}</span>
          </span>
        </button>
      </h2>
      {children ? <div className="quarter-head-badges">{children}</div> : null}
    </div>
  )
}

function sameBilingual(a: Bilingual, b: Bilingual) {
  return a.vi === b.vi && a.en === b.en
}

function PageHeadingEditor({ canEdit, onSaved, page }: { canEdit: boolean; onSaved: (page: SurveyQuarterPageContent) => void; page: SurveyQuarterPageContent }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const [kicker, setKicker] = useState(page.kicker)
  const [title, setTitle] = useState(page.title)
  const [description, setDescription] = useState(page.description)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const dirty = !sameBilingual(kicker, page.kicker) || !sameBilingual(title, page.title) || !sameBilingual(description, page.description)

  // Saved here or reloaded with someone else's change: show what is stored now.
  useEffect(() => {
    setKicker(page.kicker)
    setTitle(page.title)
    setDescription(page.description)
  }, [page])

  async function save() {
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const saved = await updateSurveyQuarterPage({ description, kicker, title })
      onSaved(saved)
      setNotice('Đã lưu. Trang khảo sát hiển thị nội dung mới trong vòng 1 phút.')
    } catch (caught) {
      setError(errorMessage(caught, 'Không lưu được phần đầu.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`content-surface quarter-editor${open ? ' is-open' : ''}`}>
      <AccordionHead bodyId={bodyId} kicker="Phần đầu trang chọn quý" onToggle={() => setOpen((current) => !current)} open={open} title={page.title.vi}>
        {dirty ? <span className="quarter-badge is-dirty">Chưa lưu</span> : null}
      </AccordionHead>
      <div className="quarter-editor-body" hidden={!open} id={bodyId}>
        <p className="quarter-help">Hiện ở đầu trang chọn quý (trang đầu tiên khi mở khảo sát), phía trên các thẻ quý.</p>
        <BilingualField disabled={!canEdit || busy} label="Dòng nhỏ" max={80} onChange={setKicker} value={kicker} />
        <BilingualField disabled={!canEdit || busy} label="Tiêu đề" max={120} onChange={setTitle} value={title} />
        <BilingualField disabled={!canEdit || busy} label="Mô tả" max={400} multiline onChange={setDescription} value={description} />
        {canEdit ? (
          <div className="quarter-actions">
            <button className="primary-button" disabled={busy || !dirty} onClick={() => void save()} type="button">
              <Save aria-hidden="true" size={16} />
              <span>{busy ? 'Đang lưu...' : 'Lưu phần đầu'}</span>
            </button>
          </div>
        ) : null}
        {page.updatedAt ? <p className="roundtable-event-meta">Sửa lần cuối lúc {formatDateTime(page.updatedAt)}{page.updatedByEmail ? ` bởi ${page.updatedByEmail}` : ''}</p> : null}
        {notice ? <p aria-live="polite" className="roundtable-event-notice">{notice}</p> : null}
        {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
      </div>
    </section>
  )
}

function QuarterEditor({ canEdit, globalPaused, isCurrent, onHistory, onSaved, quarter }: { canEdit: boolean; globalPaused: boolean; isCurrent: boolean; onHistory: () => void; onSaved: (quarter: SurveyQuarterAdmin) => void; quarter: SurveyQuarterAdmin }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const [title, setTitle] = useState(quarter.title)
  const [description, setDescription] = useState(quarter.description)
  const [isVisible, setIsVisible] = useState(quarter.isVisible)
  const [sortOrder, setSortOrder] = useState(String(quarter.sortOrder))
  const [reportOn, setReportOn] = useState(quarter.reportGenerationEnabled)
  const [daysInput, setDaysInput] = useState(String(quarter.deferredResultDays))
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Saved here or reloaded with someone else's change: show what is stored now.
  useEffect(() => {
    setTitle(quarter.title)
    setDescription(quarter.description)
    setIsVisible(quarter.isVisible)
    setSortOrder(String(quarter.sortOrder))
    setReportOn(quarter.reportGenerationEnabled)
    setDaysInput(String(quarter.deferredResultDays))
  }, [quarter])

  const days = Number(daysInput)
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 60
  const order = Number(sortOrder)
  const orderValid = Number.isInteger(order) && order >= 0 && order <= 999
  const titlesValid = Boolean(title.vi.trim() && title.en.trim())
  const switchChanged = reportOn !== quarter.reportGenerationEnabled
  const dirty = !sameBilingual(title, quarter.title) || !sameBilingual(description, quarter.description) || isVisible !== quarter.isVisible
    || order !== quarter.sortOrder || switchChanged || days !== quarter.deferredResultDays
  const label = quarter.label.vi
  const effectiveOn = reportOn && !globalPaused

  async function save() {
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const saved = await updateSurveyQuarter(quarter.surveyVersion, {
        deferredResultDays: days,
        description,
        isVisible,
        reportGenerationEnabled: reportOn,
        sortOrder: order,
        title,
      })
      setConfirming(false)
      onSaved(saved)
      setNotice(switchChanged
        ? (reportOn ? `Đã bật tạo báo cáo cho ${label}. Những người đang chờ sẽ lần lượt nhận báo cáo qua email.` : `Đã tạm dừng tạo báo cáo cho ${label}. Khảo sát quý này vẫn nhận bài bình thường.`)
        : 'Đã lưu. Trang khảo sát hiển thị nội dung mới trong vòng 1 phút.')
    } catch (caught) {
      setError(errorMessage(caught, 'Không lưu được quý khảo sát.'))
    } finally {
      setBusy(false)
    }
  }

  function requestSave() {
    if (!daysValid || !orderValid || !titlesValid) return
    if (switchChanged) setConfirming(true)
    else void save()
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      onSaved(await uploadSurveyQuarterImage(quarter.surveyVersion, file))
      setNotice('Đã tải ảnh mới lên.')
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được ảnh lên.'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeImage() {
    setBusy(true)
    setNotice('')
    setError('')
    try {
      onSaved(await deleteSurveyQuarterImage(quarter.surveyVersion))
      setNotice('Đã gỡ ảnh. Thẻ quý dùng lại ảnh mặc định của trang khảo sát.')
    } catch (caught) {
      setError(errorMessage(caught, 'Không gỡ được ảnh.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-busy={busy} className={`content-surface quarter-editor${quarter.isVisible ? '' : ' is-hidden'}${open ? ' is-open' : ''}`}>
      <AccordionHead bodyId={bodyId} kicker={`Khảo sát ${label}`} onToggle={() => setOpen((current) => !current)} open={open} title={quarter.title.vi}>
        {dirty ? <span className="quarter-badge is-dirty">Chưa lưu</span> : null}
        {isCurrent ? <span className="quarter-badge is-current">Quý hiện tại</span> : null}
        <span className={`quarter-badge ${quarter.isVisible ? 'is-on' : 'is-off'}`}>{quarter.isVisible ? 'Đang hiện' : 'Đang ẩn'}</span>
        <span className={`quarter-badge ${quarter.reportGenerationEnabled && !globalPaused ? 'is-on' : 'is-paused'}`}>
          {quarter.reportGenerationEnabled && !globalPaused ? 'Đang tạo báo cáo' : 'Tạm dừng tạo báo cáo'}
        </span>
        <button aria-label={`Lịch sử ${label}`} className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={onHistory} type="button">
          <History aria-hidden="true" size={16} />
        </button>
      </AccordionHead>

      <div className="quarter-editor-body" hidden={!open} id={bodyId}>
        <p className="quarter-help">{formatNumber(quarter.submissionCount)} lượt gửi khảo sát của {label}.</p>

        <div className="quarter-card-layout">
          <div className="quarter-image">
            {quarter.imageUrl ? <img alt={`Ảnh thẻ ${label}`} src={apiUrl(quarter.imageUrl)} /> : <div className="quarter-image-empty">Chưa có ảnh riêng: trang khảo sát đang dùng ảnh mặc định.</div>}
            {canEdit ? (
              <div className="quarter-image-actions">
                <input accept={SURVEY_QUARTER_IMAGE_TYPES.join(',')} hidden onChange={(event) => void uploadImage(event.currentTarget.files?.[0])} ref={fileRef} type="file" />
                <button className="secondary-button" disabled={busy} onClick={() => fileRef.current?.click()} type="button">
                  <ImagePlus aria-hidden="true" size={16} />
                  <span>{quarter.imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}</span>
                </button>
                {quarter.imageUrl ? (
                  <button className="secondary-button" disabled={busy} onClick={() => void removeImage()} type="button">
                    <Trash2 aria-hidden="true" size={16} />
                    <span>Gỡ ảnh</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="quarter-help">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh luôn hiện trọn trong khung, không bị cắt. Nên dùng ảnh dưới 500 KB (ví dụ rộng khoảng 1200 px) để trang khảo sát mở nhanh.</p>
          </div>

          <div className="quarter-fields">
            <BilingualField disabled={!canEdit || busy} label="Tiêu đề" max={120} onChange={setTitle} value={title} />
            <BilingualField disabled={!canEdit || busy} label="Mô tả" max={400} multiline onChange={setDescription} value={description} />
            <div className="quarter-inline">
              <label className="quarter-toggle">
                <input checked={isVisible} disabled={!canEdit || busy} onChange={(event) => setIsVisible(event.currentTarget.checked)} role="switch" type="checkbox" />
                <span>Hiện thẻ này trên trang khảo sát</span>
              </label>
              <label className="roundtable-event-field quarter-order">
                <span>Thứ tự</span>
                <input disabled={!canEdit || busy} inputMode="numeric" max={999} min={0} onChange={(event) => setSortOrder(event.currentTarget.value)} type="number" value={sortOrder} />
              </label>
            </div>
            {!isVisible ? <p className="quarter-help">Khi ẩn, người mới không chọn được quý này; người đang làm dở vẫn gửi bài được.</p> : null}
          </div>
        </div>

        <div className="quarter-report">
          <div className="quarter-report-head">
            <strong>Tạo báo cáo cho người làm khảo sát {label}</strong>
            <span className={`report-generation-state ${effectiveOn ? 'is-on' : 'is-off'}`}>{effectiveOn ? 'Đang hoạt động' : 'Đang tạm dừng'}</span>
          </div>
          <p>
            {reportOn
              ? 'Người làm khảo sát xem được báo cáo ngay sau khi nộp bài và nhận báo cáo qua email.'
              : 'Khảo sát vẫn nhận bài bình thường nhưng tạm thời chưa tạo báo cáo. Khi bật lại, những người đang chờ sẽ tự động nhận báo cáo qua email.'}
          </p>
          {globalPaused ? <p className="quarter-help">Bộ phận kỹ thuật đang tạm dừng tạo báo cáo cho mọi quý, nên quý này cũng đang chờ.</p> : null}
          <p className="quarter-help">{quarter.waitingReports > 0 ? `${formatNumber(quarter.waitingReports)} người đang chờ nhận báo cáo.` : 'Không có ai đang chờ nhận báo cáo.'}</p>
          <div className="report-generation-message">
            <div className="report-generation-message-copy">
              <span>Khi tạm dừng, người làm khảo sát sẽ thấy sau khi nộp bài:</span>
              <q>{participantMessage(daysValid ? days : quarter.deferredResultDays)}</q>
            </div>
            <label className="roundtable-event-field quarter-days">
              <span>Số ngày</span>
              <input disabled={!canEdit || busy} inputMode="numeric" max={60} min={1} onChange={(event) => setDaysInput(event.currentTarget.value)} type="number" value={daysInput} />
            </label>
          </div>
          {canEdit ? (
            <label className="quarter-toggle">
              <input checked={reportOn} disabled={busy} onChange={(event) => setReportOn(event.currentTarget.checked)} role="switch" type="checkbox" />
              <span>Tạo báo cáo cho quý này</span>
            </label>
          ) : null}
        </div>

        {daysInput && !daysValid ? <p className="roundtable-event-error">Số ngày phải từ 1 đến 60.</p> : null}
        {!orderValid ? <p className="roundtable-event-error">Thứ tự phải là số từ 0 đến 999.</p> : null}
        {!titlesValid ? <p className="roundtable-event-error">Cần nhập tiêu đề cả tiếng Việt và tiếng Anh.</p> : null}

        {confirming ? (
          <div aria-label="Xác nhận đổi tạo báo cáo" className="report-generation-confirm" role="alertdialog">
            <p>
              {reportOn
                ? `Bật tạo báo cáo cho ${label}?${quarter.waitingReports > 0 ? ` ${formatNumber(quarter.waitingReports)} người đang chờ sẽ lần lượt nhận báo cáo qua email.` : ''}`
                : `Tạm dừng tạo báo cáo cho ${label}? Khảo sát vẫn nhận bài bình thường. Người làm khảo sát quý này sẽ được báo nhận báo cáo qua email sau ${padDays(daysValid ? days : quarter.deferredResultDays)} ngày.`}
            </p>
            <div>
              <button className="primary-button compact" disabled={busy} onClick={() => void save()} type="button">
                <span>{busy ? 'Đang lưu...' : reportOn ? 'Bật và lưu' : 'Tạm dừng và lưu'}</span>
              </button>
              <button className="secondary-button" disabled={busy} onClick={() => setConfirming(false)} type="button"><span>Hủy</span></button>
            </div>
          </div>
        ) : null}

        {canEdit && !confirming ? (
          <div className="quarter-actions">
            <button className="primary-button" disabled={busy || !dirty || !daysValid || !orderValid || !titlesValid} onClick={requestSave} type="button">
              <Save aria-hidden="true" size={16} />
              <span>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        ) : null}

        <p className="roundtable-event-meta">Sửa lần cuối lúc {formatDateTime(quarter.updatedAt)}{quarter.updatedByEmail ? ` bởi ${quarter.updatedByEmail}` : ''}</p>
        {notice ? <p aria-live="polite" className="roundtable-event-notice">{notice}</p> : null}
        {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
      </div>
    </section>
  )
}

// Tab "Quý khảo sát": the cards respondents choose a quarter from, and each quarter's own
// switch for creating reports. Admins and super admins edit; viewers only see.
export function SurveyQuartersPage({ canEdit, tabs }: { canEdit: boolean; tabs: ReactNode }) {
  const [data, setData] = useState<SurveyQuarterAdminList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyQuarter, setHistoryQuarter] = useState<SurveyQuarterAdmin | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await listSurveyQuarters())
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được danh sách quý khảo sát.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const replaceQuarter = (next: SurveyQuarterAdmin) => {
    setData((current) => current ? { ...current, quarters: current.quarters.map((quarter) => (quarter.surveyVersion === next.surveyVersion ? next : quarter)) } : current)
  }

  const shown = data?.quarters.filter((quarter) => quarter.isVisible).map((quarter) => quarter.surveyVersion).sort() ?? []
  const currentVersion = shown.at(-1) ?? null
  const ordered = data ? [...data.quarters].sort((a, b) => a.sortOrder - b.sortOrder || a.surveyVersion.localeCompare(b.surveyVersion)) : []

  return (
    <main className="dashboard-main">
      {tabs}

      <section className="content-surface quarter-intro">
        <div className="surface-head">
          <div>
            <p>Khảo sát</p>
            <h2>Quý khảo sát</h2>
          </div>
          <div className="surface-actions">
            <button className="secondary-button" disabled={isLoading} onClick={() => void load()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>
        <div className="survey-sources-intro">
          <p>Khi mở khảo sát, người làm khảo sát thấy trước tiên trang chọn quý với các thẻ bên dưới; chọn thẻ nào thì vào phần giới thiệu và câu hỏi của quý đó. Thẻ của <strong>quý mới nhất đang hiện</strong> được làm nổi bật. Thẻ nào đứng trước do ô <strong>Thứ tự</strong> quyết định (số nhỏ đứng trước).</p>
          <p>Câu hỏi của từng quý cố định theo bộ câu hỏi của quý đó; ở đây chỉ sửa phần hiển thị trên thẻ và việc tạo báo cáo.</p>
        </div>
        {data?.globalPaused ? (
          <p className="report-generation-notice" role="status">
            <CircleAlert aria-hidden="true" size={18} />
            <span><strong>Đang tạm dừng tạo báo cáo cho mọi quý (bộ phận kỹ thuật đang xử lý).</strong> Khảo sát vẫn nhận bài bình thường.</span>
          </p>
        ) : null}
        {error ? (
          <div className="empty-state">
            <CircleAlert aria-hidden="true" size={30} />
            <h2>Không tải được dữ liệu</h2>
            <p>{error}</p>
            <button className="secondary-button" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}
        {!error && isLoading && !data ? <p className="survey-sources-empty">Đang tải quý khảo sát...</p> : null}
      </section>

      {data ? (
        <>
          <PageHeadingEditor canEdit={canEdit} onSaved={(page) => setData((current) => (current ? { ...current, page } : current))} page={data.page} />
          {ordered.map((quarter) => (
            <QuarterEditor
              canEdit={canEdit}
              globalPaused={data.globalPaused}
              isCurrent={quarter.surveyVersion === currentVersion}
              key={quarter.surveyVersion}
              onHistory={() => setHistoryQuarter(quarter)}
              onSaved={replaceQuarter}
              quarter={quarter}
            />
          ))}
        </>
      ) : null}

      {historyQuarter ? <SurveyQuarterHistoryDialog onClose={() => setHistoryQuarter(null)} quarter={historyQuarter} /> : null}
    </main>
  )
}
