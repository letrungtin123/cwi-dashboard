import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ImagePlus, Save, Trash2 } from 'lucide-react'
import { apiUrl, SURVEY_QUARTER_IMAGE_TYPES } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Bilingual, SurveyQuarterPageContent } from '@/types'

// Pieces shared by the tabs that edit a page of cards: "Quý khảo sát" (/survey) and
// "Báo cáo quý" (/bao-cao-quy).

export function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}

export function sameBilingual(a: Bilingual, b: Bilingual) {
  return a.vi === b.vi && a.en === b.en
}

export function BilingualField({ disabled, label, max, multiline = false, onChange, value }: { disabled: boolean; label: string; max: number; multiline?: boolean; onChange: (value: Bilingual) => void; value: Bilingual }) {
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
export function AccordionHead({ bodyId, children, kicker, onToggle, open, title }: { bodyId: string; children?: ReactNode; kicker: string; onToggle: () => void; open: boolean; title: string }) {
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

type HeadingInput = Pick<SurveyQuarterPageContent, 'description' | 'kicker' | 'title'>

// The heading above the cards (small line, title, description), in Vietnamese and English.
export function CardHeadingEditor({ canEdit, help, kicker, onSave, onSaved, page, savedNotice }: {
  canEdit: boolean
  help: string
  kicker: string
  onSave: (input: HeadingInput) => Promise<SurveyQuarterPageContent>
  onSaved: (page: SurveyQuarterPageContent) => void
  page: SurveyQuarterPageContent
  savedNotice: string
}) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const [kickerText, setKickerText] = useState(page.kicker)
  const [title, setTitle] = useState(page.title)
  const [description, setDescription] = useState(page.description)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const dirty = !sameBilingual(kickerText, page.kicker) || !sameBilingual(title, page.title) || !sameBilingual(description, page.description)

  // Saved here or reloaded with someone else's change: show what is stored now.
  useEffect(() => {
    setKickerText(page.kicker)
    setTitle(page.title)
    setDescription(page.description)
  }, [page])

  async function save() {
    setBusy(true)
    setNotice('')
    setError('')
    try {
      onSaved(await onSave({ description, kicker: kickerText, title }))
      setNotice(savedNotice)
    } catch (caught) {
      setError(errorMessage(caught, 'Không lưu được phần đầu.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`content-surface quarter-editor${open ? ' is-open' : ''}`}>
      <AccordionHead bodyId={bodyId} kicker={kicker} onToggle={() => setOpen((current) => !current)} open={open} title={page.title.vi}>
        {dirty ? <span className="quarter-badge is-dirty">Chưa lưu</span> : null}
      </AccordionHead>
      <div className="quarter-editor-body" hidden={!open} id={bodyId}>
        <p className="quarter-help">{help}</p>
        <BilingualField disabled={!canEdit || busy} label="Dòng nhỏ" max={80} onChange={setKickerText} value={kickerText} />
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

// A card's picture with upload / remove buttons.
export function CardImageEditor({ alt, busy, canEdit, emptyText, imageUrl, onPick, onRemove }: {
  alt: string
  busy: boolean
  canEdit: boolean
  emptyText: string
  imageUrl: string | null
  onPick: (file: File) => Promise<void>
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function pick(file: File | undefined) {
    if (file) await onPick(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="quarter-image">
      {imageUrl ? <img alt={alt} src={apiUrl(imageUrl)} /> : <div className="quarter-image-empty">{emptyText}</div>}
      {canEdit ? (
        <div className="quarter-image-actions">
          <input accept={SURVEY_QUARTER_IMAGE_TYPES.join(',')} hidden onChange={(event) => void pick(event.currentTarget.files?.[0])} ref={fileRef} type="file" />
          <button className="secondary-button" disabled={busy} onClick={() => fileRef.current?.click()} type="button">
            <ImagePlus aria-hidden="true" size={16} />
            <span>{imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}</span>
          </button>
          {imageUrl ? (
            <button className="secondary-button" disabled={busy} onClick={onRemove} type="button">
              <Trash2 aria-hidden="true" size={16} />
              <span>Gỡ ảnh</span>
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="quarter-help">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh luôn hiện trọn trong khung, không bị cắt. Nên dùng ảnh dưới 500 KB (ví dụ rộng khoảng 1200 px) để trang mở nhanh.</p>
    </div>
  )
}
