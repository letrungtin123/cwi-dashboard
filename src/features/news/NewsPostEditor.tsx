import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowLeft, CalendarClock, Check, CircleAlert, Copy, ExternalLink, Eye, EyeOff, FileText, History, ImagePlus, Link2,
  LoaderCircle, Pin, QrCode, RefreshCw, Save, Send, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { ApiError, apiUrl, createNewsPost, getNewsPost, updateNewsPost } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { personName } from '@/lib/roles'
import { copyText, downloadQrCode } from '@/lib/shareLink'
import type { NewsCategory, NewsPostAdmin, NewsPostFields, NewsPostStatus } from '@/types'
import { CustomSelect } from '@/components/CustomSelect'
import { DateTimePicker } from '@/components/DateTimePicker'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { NewsConfirmDialog } from './NewsConfirmDialog'
import { NewsPostHistoryDialog } from './NewsHistoryDialogs'
import { NewsPreviewDialog } from './NewsPreviewDialog'
import { cleanNewsDoc, docHasContent, EMPTY_DOC } from './newsEditorSetup'
import { uploadPreparedNewsImage } from './newsImage'
import { NEWS_STATE_HELP, NEWS_STATE_LABELS, newsPostState, newsPostUrl, RESERVED_SLUGS, SLUG_PATTERN, slugify } from './newsLabels'
import { RichTextEditor } from './RichTextEditor'

type Language = 'vi' | 'en'
const LANGUAGES: Array<{ label: string; short: string; value: Language }> = [
  { label: 'Tiếng Việt', short: 'VI', value: 'vi' },
  { label: 'English', short: 'EN', value: 'en' },
]

function emptyFields(categoryId: string): NewsPostFields {
  return {
    author: { en: '', vi: '' },
    categoryId,
    content: { en: EMPTY_DOC, vi: EMPTY_DOC },
    coverAlt: { en: '', vi: '' },
    coverImageId: null,
    excerpt: { en: '', vi: '' },
    isPinned: false,
    publishedAt: null,
    seoDescription: { en: '', vi: '' },
    seoTitle: { en: '', vi: '' },
    slug: '',
    source: { name: '', url: '' },
    status: 'draft',
    tags: { en: [], vi: [] },
    title: { en: '', vi: '' },
  }
}

function toFields(post: NewsPostAdmin): NewsPostFields {
  return {
    author: post.author,
    categoryId: post.category.id,
    content: post.content,
    coverAlt: post.coverAlt,
    coverImageId: post.coverImageId,
    excerpt: post.excerpt,
    isPinned: post.isPinned,
    publishedAt: post.publishedAt,
    seoDescription: post.seoDescription,
    seoTitle: post.seoTitle,
    slug: post.slug,
    source: post.source,
    status: post.status,
    tags: post.tags,
    title: post.title,
  }
}

// What "Đăng" needs, by language (the same rule as the server).
function missingByLanguage(fields: NewsPostFields) {
  const missing: Record<Language, string[]> = { en: [], vi: [] }
  for (const language of ['vi', 'en'] as const) {
    if (!fields.title[language].trim()) missing[language].push('tiêu đề')
    if (!fields.excerpt[language].trim()) missing[language].push('sapo')
    if (!docHasContent(fields.content[language])) missing[language].push('nội dung')
  }
  return missing
}

function Counter({ max, value, warnAt }: { max: number; value: string; warnAt?: number }) {
  const over = warnAt !== undefined && value.length > warnAt
  return <small className={`news-counter${over ? ' is-warn' : ''}`}>{value.length}/{warnAt ?? max}</small>
}

function TagInput({ disabled, onChange, tags }: { disabled: boolean; onChange: (tags: string[]) => void; tags: string[] }) {
  const [draft, setDraft] = useState('')
  function add(raw: string) {
    const tag = raw.replace(/[,#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (!tag || tags.length >= 10 || tags.some((existing) => existing.toLocaleLowerCase('vi') === tag.toLocaleLowerCase('vi'))) return
    onChange([...tags, tag])
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
      setDraft('')
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }
  return (
    <div className={`news-tag-input${disabled ? ' is-disabled' : ''}`}>
      {tags.map((tag) => (
        <span className="news-tag-chip" key={tag}>
          #{tag}
          {disabled ? null : <button aria-label={`Bỏ thẻ ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))} type="button"><X aria-hidden="true" size={12} /></button>}
        </span>
      ))}
      {disabled || tags.length >= 10 ? null : (
        <input
          onBlur={() => { add(draft); setDraft('') }}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={keyDown}
          placeholder={tags.length ? '' : 'Gõ thẻ rồi nhấn Enter, ví dụ: Lãnh đạo'}
          value={draft}
        />
      )}
    </div>
  )
}

function SearchPreview({ description, slug, title }: { description: string; slug: string; title: string }) {
  return (
    <div className="news-search-preview" aria-label="Hiển thị trên Google (ước lượng)">
      <span>ceo-workforce-index.com › tin-tuc › {slug || '...'}</span>
      <strong>{title || 'Tiêu đề bài viết'} | CEO Workforce Index</strong>
      <p>{description || 'Sapo của bài sẽ hiện ở đây.'}</p>
    </div>
  )
}

// Write or edit one post. The page keeps both languages side by side in tabs; "Đăng" needs
// both. Saving from an older copy (someone else saved meanwhile) is refused by the server.
export function NewsPostEditor({ categories, onBack, onDeleted, onRequestDelete, postId: initialPostId }: {
  categories: NewsCategory[]
  onBack: () => void
  onDeleted: () => void
  onRequestDelete: (post: { id: string; title: string }, done: () => void) => void
  postId: string | null
}) {
  const [postId, setPostId] = useState(initialPostId)
  const [post, setPost] = useState<NewsPostAdmin | null>(null)
  const [fields, setFields] = useState<NewsPostFields>(() => emptyFields(categories.find((category) => category.isVisible)?.id ?? categories[0]?.id ?? ''))
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(Boolean(initialPostId))
  const [language, setLanguage] = useState<Language>('vi')
  const [dirty, setDirty] = useState(false)
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPostId))
  const [busy, setBusy] = useState<'save' | 'cover' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const coverRef = useRef<HTMLInputElement>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const applyPost = useCallback((loaded: NewsPostAdmin) => {
    setPost(loaded)
    setFields(toFields(loaded))
    setCoverUrl(loaded.coverUrl)
    setDirty(false)
    setSlugTouched(true)
    setConflict(false)
    setEditorKey((value) => value + 1)
  }, [])

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setLoadError('')
    try {
      applyPost(await getNewsPost(id))
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Không tải được bài viết.'))
    } finally {
      setLoading(false)
    }
  }, [applyPost])

  useEffect(() => {
    if (initialPostId) void load(initialPostId)
  }, [initialPostId, load])

  // Closing the tab with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update<K extends keyof NewsPostFields>(key: K, value: NewsPostFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setMissing([])
  }

  function updateLanguage<K extends 'title' | 'excerpt' | 'coverAlt' | 'author' | 'seoTitle' | 'seoDescription'>(key: K, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: { ...current[key], [language]: value } }
      // A new post's link follows its Vietnamese title until the link is edited by hand.
      if (key === 'title' && language === 'vi' && !slugTouched) next.slug = slugify(value)
      return next
    })
    setDirty(true)
    setMissing([])
  }

  function back() {
    if (dirty) {
      setConfirmLeave(true)
      return
    }
    onBack()
  }

  async function pickCover(file: File | undefined) {
    if (coverRef.current) coverRef.current.value = ''
    if (!file) return
    setBusy('cover')
    setError('')
    try {
      const image = await uploadPreparedNewsImage(file)
      setCoverUrl(image.url)
      update('coverImageId', image.id)
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được ảnh lên.'))
    } finally {
      setBusy(null)
    }
  }

  const state = newsPostState(fields.status, fields.publishedAt)
  const savedState = post ? newsPostState(post.status, post.publishedAt) : null
  const missingNow = missingByLanguage(fields)
  const slugValid = SLUG_PATTERN.test(fields.slug) && !RESERVED_SLUGS.has(fields.slug)
  const slugChangedAfterPublish = Boolean(post && post.status !== 'draft' && post.slug !== fields.slug)
  const futureDate = Boolean(fields.publishedAt && new Date(fields.publishedAt).getTime() > Date.now())

  async function save(status: NewsPostStatus) {
    setNotice('')
    setError('')
    setMissing([])
    if (!fields.title.vi.trim()) {
      setLanguage('vi')
      setError('Vui lòng nhập tiêu đề tiếng Việt trước khi lưu.')
      return
    }
    if (!fields.categoryId) {
      setError('Vui lòng chọn chuyên mục.')
      return
    }
    if (!slugValid) {
      setError('Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang (không dùng “chuyen-muc” hay “the”).')
      return
    }
    if (status === 'published') {
      const list = [
        ...missingNow.vi.map((item) => `${item} (tiếng Việt)`),
        ...missingNow.en.map((item) => `${item} (tiếng Anh)`),
        ...(fields.coverImageId ? [] : ['ảnh đại diện']),
      ]
      if (list.length) {
        setMissing(list)
        if (missingNow.vi.length) setLanguage('vi')
        else if (missingNow.en.length) setLanguage('en')
        return
      }
    }
    const vi = cleanNewsDoc(fields.content.vi)
    const en = cleanNewsDoc(fields.content.en)
    const input = {
      ...fields,
      content: { en: en.doc, vi: vi.doc },
      status,
      ...(post ? { version: post.version } : {}),
    }
    const wasPublic = savedState === 'published'
    setBusy('save')
    try {
      const saved = postId ? await updateNewsPost(postId, input) : await createNewsPost(input)
      applyPost(saved)
      setPostId(saved.id)
      const savedAs = newsPostState(saved.status, saved.publishedAt)
      const dropped = vi.droppedImages + en.droppedImages
      setNotice(
        (savedAs === 'published' ? (wasPublic ? 'Đã lưu thay đổi. Trang Tin tức hiện bản mới trong vòng 1 phút.' : 'Đã đăng bài. Bài đang hiện trên trang Tin tức.')
          : savedAs === 'scheduled' ? `Đã hẹn giờ: bài tự hiện lúc ${formatDateTime(saved.publishedAt!)}.`
          : savedAs === 'hidden' ? 'Đã lưu. Bài đang ẩn khỏi trang web.'
          : 'Đã lưu nháp.')
        + (dropped ? ` Đã bỏ ${dropped} ảnh dán từ trang khác.` : ''),
      )
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'news_post_conflict') setConflict(true)
      setError(errorMessage(caught, 'Không lưu được bài viết.'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <main className="dashboard-main"><p className="survey-sources-empty">Đang tải bài viết...</p></main>
  }
  if (loadError) {
    return (
      <main className="dashboard-main">
        <div className="empty-state">
          <CircleAlert aria-hidden="true" size={30} />
          <h2>Không tải được bài viết</h2>
          <p>{loadError}</p>
          <div className="news-inline-actions">
            <button className="secondary-button" onClick={onBack} type="button"><ArrowLeft aria-hidden="true" size={16} /><span>Về danh sách</span></button>
            {initialPostId ? <button className="primary-button" onClick={() => void load(initialPostId)} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button> : null}
          </div>
        </div>
      </main>
    )
  }

  const saving = busy === 'save'
  const primary = (() => {
    if (!post || post.status === 'draft') return { icon: futureDate ? <CalendarClock aria-hidden="true" size={16} /> : <Send aria-hidden="true" size={16} />, label: futureDate ? 'Hẹn giờ đăng' : 'Đăng bài', status: 'published' as const }
    if (post.status === 'hidden') return { icon: <Eye aria-hidden="true" size={16} />, label: 'Đăng lại', status: 'published' as const }
    // A live post given a later time leaves the website until then.
    if (futureDate) return { icon: <CalendarClock aria-hidden="true" size={16} />, label: 'Lưu và hẹn giờ', status: 'published' as const }
    return { icon: <Save aria-hidden="true" size={16} />, label: 'Lưu thay đổi', status: 'published' as const }
  })()
  const visibleCategories = categories.filter((category) => category.isVisible || category.id === fields.categoryId)

  return (
    <main className="dashboard-main news-editor-page">
      <div className="news-editor-topbar">
        <button className="secondary-button" onClick={back} type="button">
          <ArrowLeft aria-hidden="true" size={16} />
          <span>Danh sách bài viết</span>
        </button>
        <div className="news-editor-heading">
          <h2>{post ? 'Sửa bài viết' : 'Viết bài mới'}</h2>
          <span className={`news-status is-${savedState ?? 'draft'}`}>{savedState ? NEWS_STATE_LABELS[savedState] : 'Chưa lưu'}</span>
          {dirty ? <span className="quarter-badge is-dirty">Có thay đổi chưa lưu</span> : null}
        </div>
        <div className="news-editor-actions">
          {post ? (
            <button aria-label="Lịch sử thay đổi" className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={() => setHistoryOpen(true)} type="button"><History aria-hidden="true" size={17} /></button>
          ) : null}
          <button className="secondary-button" onClick={() => setPreviewing(true)} type="button"><Eye aria-hidden="true" size={16} /><span>Xem trước</span></button>
          {!post || post.status === 'draft' ? (
            <button className="secondary-button" disabled={saving} onClick={() => void save('draft')} type="button"><FileText aria-hidden="true" size={16} /><span>Lưu nháp</span></button>
          ) : null}
          {post && post.status === 'published' ? (
            <button className="secondary-button" disabled={saving} onClick={() => void save('hidden')} type="button"><EyeOff aria-hidden="true" size={16} /><span>Ẩn bài</span></button>
          ) : null}
          {post && post.status === 'hidden' ? (
            <button className="secondary-button" disabled={saving} onClick={() => void save('hidden')} type="button"><Save aria-hidden="true" size={16} /><span>Lưu (vẫn ẩn)</span></button>
          ) : null}
          <button className="primary-button" disabled={saving} onClick={() => void save(primary.status)} type="button">
            {saving ? <LoaderCircle aria-hidden="true" className="spinning-icon" size={16} /> : primary.icon}
            <span>{saving ? 'Đang lưu...' : primary.label}</span>
          </button>
        </div>
      </div>

      {notice ? (
        <p aria-live="polite" className="news-callout is-success">
          <Check aria-hidden="true" size={16} /><span>{notice}</span>
          <button aria-label="Ẩn thông báo" className="icon-button" onClick={() => setNotice('')} type="button"><X aria-hidden="true" size={15} /></button>
        </p>
      ) : null}
      {missing.length ? (
        <div className="news-callout is-warning" role="alert">
          <TriangleAlert aria-hidden="true" size={16} />
          <span><strong>Chưa đăng được.</strong> Còn thiếu: {missing.join(', ')}. Bài cần đủ hai bản tiếng Việt và tiếng Anh, và có ảnh đại diện.</span>
        </div>
      ) : null}
      {error ? (
        <div className="news-callout is-error" role="alert">
          <CircleAlert aria-hidden="true" size={16} />
          <span>{error}</span>
          {conflict && postId ? <button className="secondary-button" onClick={() => void load(postId)} type="button"><RefreshCw aria-hidden="true" size={15} /><span>Tải lại bài</span></button> : null}
        </div>
      ) : null}

      <div className="news-editor-grid">
        <section className="content-surface news-editor-main">
          <div aria-label="Ngôn ngữ" className="news-lang-tabs" role="tablist">
            {LANGUAGES.map((item) => {
              const gaps = missingNow[item.value]
              return (
                <button aria-selected={language === item.value} className={`news-lang-tab${language === item.value ? ' is-active' : ''}`} key={item.value} onClick={() => setLanguage(item.value)} role="tab" type="button">
                  <span className="news-lang-code">{item.short}</span>
                  <span>{item.label}</span>
                  {gaps.length ? <span className="news-lang-state is-missing" data-tooltip={`Còn thiếu: ${gaps.join(', ')}`}>Thiếu {gaps.length}</span> : <span className="news-lang-state is-done"><Check aria-hidden="true" size={12} />Đủ</span>}
                </button>
              )
            })}
          </div>

          <label className="news-field news-title-field">
            <span>Tiêu đề {language === 'vi' ? <b>*</b> : null}<Counter max={200} value={fields.title[language]} /></span>
            <textarea maxLength={200} onChange={(event) => updateLanguage('title', event.currentTarget.value.replace(/\n/g, ' '))} placeholder={language === 'vi' ? 'Tiêu đề bài viết' : 'Article title in English'} rows={2} value={fields.title[language]} />
          </label>

          <label className="news-field">
            <span>Sapo (mô tả ngắn) <Counter max={300} value={fields.excerpt[language]} /></span>
            <textarea maxLength={300} onChange={(event) => updateLanguage('excerpt', event.currentTarget.value)} placeholder={language === 'vi' ? '1–2 câu tóm tắt. Hiện trên thẻ bài, ở đầu bài và khi chia sẻ lên Facebook, Zalo.' : 'One or two sentences. Shown on cards, at the top of the article and in link previews.'} rows={3} value={fields.excerpt[language]} />
          </label>

          <div className="news-field">
            <span>Nội dung</span>
            {LANGUAGES.map((item) => (
              <div hidden={item.value !== language} key={`${item.value}-${editorKey}`}>
                <RichTextEditor
                  disabled={saving}
                  label={`Nội dung ${item.label}`}
                  onChange={(doc) => { setFields((current) => ({ ...current, content: { ...current.content, [item.value]: doc } })); setDirty(true); setMissing([]) }}
                  placeholder={item.value === 'vi' ? 'Bắt đầu viết, hoặc dán nội dung từ Word / Google Docs...' : 'Start writing the English version, or paste it from Word / Google Docs...'}
                  value={fields.content[item.value]}
                />
              </div>
            ))}
          </div>

          <details className="news-more-fields" open={Boolean(fields.tags[language].length || fields.author[language] || fields.seoTitle[language] || fields.seoDescription[language])}>
            <summary>Tác giả, thẻ và SEO <small>({language === 'vi' ? 'tiếng Việt' : 'tiếng Anh'})</small></summary>
            <div className="news-more-grid">
              <label className="news-field">
                <span>Tác giả hiển thị</span>
                <input maxLength={80} onChange={(event) => updateLanguage('author', event.currentTarget.value)} placeholder={language === 'vi' ? 'Để trống: “Ban biên tập CWI”' : 'Empty: “CWI Editorial Team”'} value={fields.author[language]} />
              </label>
              <label className="news-field">
                <span>Mô tả ảnh đại diện</span>
                <input maxLength={200} onChange={(event) => updateLanguage('coverAlt', event.currentTarget.value)} placeholder={language === 'vi' ? 'Ví dụ: Toàn cảnh Bàn tròn CEO Quý 3/2026' : 'E.g. CEO Roundtable Q3/2026'} value={fields.coverAlt[language]} />
              </label>
              <div className="news-field news-field-wide">
                <span>Thẻ (tối đa 10)</span>
                <TagInput disabled={saving} onChange={(tags) => update('tags', { ...fields.tags, [language]: tags })} tags={fields.tags[language]} />
              </div>
              <label className="news-field news-field-wide">
                <span>Tiêu đề SEO <Counter max={120} value={fields.seoTitle[language]} warnAt={60} /></span>
                <input maxLength={120} onChange={(event) => updateLanguage('seoTitle', event.currentTarget.value)} placeholder="Để trống: dùng tiêu đề bài. Nên dưới 60 ký tự." value={fields.seoTitle[language]} />
              </label>
              <label className="news-field news-field-wide">
                <span>Mô tả SEO <Counter max={200} value={fields.seoDescription[language]} warnAt={160} /></span>
                <textarea maxLength={200} onChange={(event) => updateLanguage('seoDescription', event.currentTarget.value)} placeholder="Để trống: dùng sapo. Nên dưới 160 ký tự." rows={2} value={fields.seoDescription[language]} />
              </label>
              <div className="news-field news-field-wide">
                <span>Hiển thị trên Google (ước lượng)</span>
                <SearchPreview description={fields.seoDescription[language] || fields.excerpt[language]} slug={fields.slug} title={fields.seoTitle[language] || fields.title[language]} />
              </div>
            </div>
          </details>
        </section>

        <aside className="news-editor-side">
          <section className="content-surface news-side-card">
            <h3><CalendarClock aria-hidden="true" size={16} />Đăng bài</h3>
            <p className={`news-state-line is-${state}`}><span className={`news-status is-${state}`}>{NEWS_STATE_LABELS[state]}</span>{NEWS_STATE_HELP[state]}</p>
            <div className="news-field">
              <DateTimePicker emptyText="Lấy lúc bấm “Đăng”" label="Ngày giờ đăng" onChange={(next) => update('publishedAt', next)} value={fields.publishedAt} />
              <small>{futureDate && fields.publishedAt ? `Bài sẽ tự hiện lúc ${formatDateTime(fields.publishedAt)}.` : 'Để trống: lấy lúc bấm “Đăng”. Chọn thời điểm trong tương lai để hẹn giờ.'}</small>
            </div>
            <label className="news-switch">
              <input checked={fields.isPinned} onChange={(event) => update('isPinned', event.currentTarget.checked)} type="checkbox" />
              <span className="news-switch-track" aria-hidden="true" />
              <span><Pin aria-hidden="true" size={14} />Ghim nổi bật <small>Hiện ở ô lớn đầu trang Tin tức (tối đa 3 bài ghim mới nhất)</small></span>
            </label>
          </section>

          <section className="content-surface news-side-card">
            <h3>Chuyên mục <b>*</b></h3>
            {visibleCategories.length ? (
              <CustomSelect
                label="Bài thuộc chuyên mục"
                onChange={(next) => update('categoryId', next)}
                options={[
                  ...(fields.categoryId ? [] : [{ label: 'Chọn chuyên mục', value: '' }]),
                  ...visibleCategories.map((category) => ({
                    description: category.isVisible ? `${formatNumber(category.publicPostCount)} bài đang hiện` : 'Đang ẩn: bài trong chuyên mục này không hiện trên web',
                    label: category.name.vi,
                    value: category.id,
                  })),
                ]}
                value={fields.categoryId}
              />
            ) : null}
            {categories.length === 0 ? <small className="news-hint is-error">Chưa có chuyên mục. Hãy tạo ở tab “Chuyên mục” trước.</small> : null}
          </section>

          <section className="content-surface news-side-card">
            <h3><ImagePlus aria-hidden="true" size={16} />Ảnh đại diện <b>*</b></h3>
            <div className="news-cover">
              {coverUrl && fields.coverImageId ? <img alt="" src={apiUrl(coverUrl)} /> : <div className="news-cover-empty">Ảnh ngang 16:9, ví dụ 1600 × 900</div>}
              {busy === 'cover' ? <span className="news-cover-busy"><LoaderCircle aria-hidden="true" className="spinning-icon" size={22} /></span> : null}
            </div>
            <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void pickCover(event.currentTarget.files?.[0])} ref={coverRef} type="file" />
            <div className="news-inline-actions">
              <button className="secondary-button" disabled={busy === 'cover'} onClick={() => coverRef.current?.click()} type="button"><ImagePlus aria-hidden="true" size={15} /><span>{fields.coverImageId ? 'Đổi ảnh' : 'Tải ảnh lên'}</span></button>
              {fields.coverImageId ? <button className="secondary-button" onClick={() => { update('coverImageId', null); setCoverUrl(null) }} type="button"><Trash2 aria-hidden="true" size={15} /><span>Gỡ ảnh</span></button> : null}
            </div>
            <small className="news-hint">JPG, PNG hoặc WebP. Ảnh lớn được tự thu nhỏ (rộng tối đa 1600 px) để trang mở nhanh. Ảnh này cũng hiện khi chia sẻ link lên Facebook, Zalo.</small>
          </section>

          <section className="content-surface news-side-card">
            <h3><Link2 aria-hidden="true" size={16} />Đường dẫn</h3>
            <div className={`news-slug${slugValid || !fields.slug ? '' : ' is-invalid'}`}>
              <span>/tin-tuc/</span>
              <input
                maxLength={120}
                onChange={(event) => { setSlugTouched(true); update('slug', event.currentTarget.value.toLowerCase().replace(/\s+/g, '-')) }}
                placeholder="tu-dong-theo-tieu-de"
                value={fields.slug}
              />
            </div>
            <div className="news-inline-actions">
              <button className="mini-link-button" onClick={() => { setSlugTouched(false); update('slug', slugify(fields.title.vi)) }} type="button"><RefreshCw aria-hidden="true" size={13} /><span>Tạo lại từ tiêu đề</span></button>
            </div>
            {!slugValid && fields.slug ? <small className="news-hint is-error">Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.</small> : null}
            {slugChangedAfterPublish ? <small className="news-hint is-warn">Bài đã đăng: link cũ vẫn tự chuyển về link mới (giữ cả tham số quảng cáo), nhưng nên hạn chế đổi khi bài đang chạy ads.</small> : <small className="news-hint">Link cố định của bài, dùng cho quảng cáo. Đổi chuyên mục không làm đổi link.</small>}
            {post && post.status !== 'draft' ? (
              <div className="news-share-links">
                {(['vi', 'en'] as const).map((value) => (
                  <div className="news-share-link" key={value}>
                    <span>{value === 'vi' ? 'Link tiếng Việt' : 'Link tiếng Anh'}</span>
                    <a href={newsPostUrl(post.slug, value)} rel="noreferrer" target="_blank">{newsPostUrl(post.slug, value).replace(/^https?:\/\//, '')}<ExternalLink aria-hidden="true" size={12} /></a>
                    <div>
                      <button className="mini-link-button" onClick={() => void copyText(newsPostUrl(post.slug, value)).then(() => setNotice('Đã sao chép link.'))} type="button"><Copy aria-hidden="true" size={13} /><span>Sao chép</span></button>
                      <button className="mini-link-button" onClick={() => void downloadQrCode(newsPostUrl(post.slug, value), `ma-qr-tin-tuc-${post.slug}${value === 'en' ? '-en' : ''}.png`)} type="button"><QrCode aria-hidden="true" size={13} /><span>Mã QR</span></button>
                    </div>
                  </div>
                ))}
                <small className="news-hint">Khi chạy quảng cáo, có thể thêm tham số như <code>?utm_source=facebook</code> vào cuối link.</small>
              </div>
            ) : null}
          </section>

          <section className="content-surface news-side-card">
            <h3>Nguồn bài gốc</h3>
            <label className="news-field">
              <span>Tên nguồn</span>
              <input maxLength={120} onChange={(event) => update('source', { ...fields.source, name: event.currentTarget.value })} placeholder="Ví dụ: CafeBiz" value={fields.source.name} />
            </label>
            <label className="news-field">
              <span>Link bài gốc</span>
              <input maxLength={500} onChange={(event) => update('source', { ...fields.source, url: event.currentTarget.value.trim() })} placeholder="https://..." type="url" value={fields.source.url} />
            </label>
            <small className="news-hint">Dùng khi đăng lại bài của báo khác. Để trống nếu là bài của CWI.</small>
          </section>

          {post ? (
            <section className="content-surface news-side-card news-info-card">
              <h3>Thông tin</h3>
              <dl>
                <div><dt>Lượt xem</dt><dd>{formatNumber(post.viewCount)}</dd></div>
                <div><dt>Tạo bởi</dt><dd>{personName(post.createdBy)} · {formatDateTime(post.createdAt)}</dd></div>
                <div><dt>Sửa gần nhất</dt><dd>{personName(post.updatedBy)} · {formatDateTime(post.updatedAt)}</dd></div>
                {post.previousSlugs.length ? <div><dt>Link cũ vẫn chuyển về bài</dt><dd>{post.previousSlugs.map((slug) => <code key={slug}>/tin-tuc/{slug}</code>)}</dd></div> : null}
              </dl>
              <button className="secondary-button news-delete-button" onClick={() => onRequestDelete({ id: post.id, title: post.title.vi }, () => { setDirty(false); onDeleted() })} type="button">
                <Trash2 aria-hidden="true" size={15} /><span>Xóa bài viết</span>
              </button>
            </section>
          ) : null}
        </aside>
      </div>

      {previewing ? <NewsPreviewDialog categories={categories} coverUrl={fields.coverImageId ? coverUrl : null} fields={fields} initialLanguage={language} onClose={() => setPreviewing(false)} /> : null}
      {confirmLeave ? (
        <NewsConfirmDialog
          busy={false}
          confirmLabel="Bỏ thay đổi và rời trang"
          error=""
          message="Bài có thay đổi chưa lưu. Nếu rời trang bây giờ, các thay đổi này sẽ mất."
          onClose={() => setConfirmLeave(false)}
          onConfirm={() => { setConfirmLeave(false); onBack() }}
          title="Rời trang khi chưa lưu?"
        />
      ) : null}
      {historyOpen && post ? <NewsPostHistoryDialog onClose={() => setHistoryOpen(false)} postId={post.id} title={post.title.vi} /> : null}
    </main>
  )
}
