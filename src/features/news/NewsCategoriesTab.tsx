import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CircleAlert, ExternalLink, Eye, EyeOff, History, Minus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { createNewsCategory, deleteNewsCategory, updateNewsCategory } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { NewsCategory, NewsCategoryInput } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { NewsCategoryHistoryDialog } from './NewsHistoryDialogs'
import { newsCategoryUrl, SLUG_PATTERN, slugify } from './newsLabels'
import { NewsConfirmDialog } from './NewsConfirmDialog'

function CategoryDialog({ category, nextOrder, onClose, onSaved }: { category: NewsCategory | null; nextOrder: number; onClose: () => void; onSaved: (category: NewsCategory) => void }) {
  const dialogRef = useRef<HTMLFormElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [nameVi, setNameVi] = useState(category?.name.vi ?? '')
  const [nameEn, setNameEn] = useState(category?.name.en ?? '')
  const [descriptionVi, setDescriptionVi] = useState(category?.description.vi ?? '')
  const [descriptionEn, setDescriptionEn] = useState(category?.description.en ?? '')
  const [typedSlug, setTypedSlug] = useState<string | null>(category ? category.slug : null)
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? nextOrder)
  const [isVisible, setIsVisible] = useState(category?.isVisible ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const slug = typedSlug ?? slugify(nameVi, 80)
  const slugValid = SLUG_PATTERN.test(slug)
  const canSubmit = Boolean(nameVi.trim() && nameEn.trim() && slugValid) && !busy

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    const input: NewsCategoryInput = { description: { en: descriptionEn, vi: descriptionVi }, isVisible, name: { en: nameEn.trim(), vi: nameVi.trim() }, slug, sortOrder }
    try {
      onSaved(category ? await updateNewsCategory(category.id, input) : await createNewsCategory(input))
    } catch (caught) {
      setError(errorMessage(caught, 'Không lưu được chuyên mục.'))
      setBusy(false)
    }
  }

  return (
    <div className="report-modal-backdrop news-modal-backdrop" role="presentation">
      <form aria-labelledby="news-category-dialog-title" aria-modal="true" className="report-modal survey-source-dialog news-category-dialog" onSubmit={(event) => void submit(event)} ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Chuyên mục</p>
            <h2 id="news-category-dialog-title">{category ? 'Sửa chuyên mục' : 'Thêm chuyên mục'}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button"><X aria-hidden="true" size={18} /></button>
        </div>
        <div className="report-modal-body news-category-form">
          <div className="quarter-bilingual">
            <label className="roundtable-event-field">
              <span>Tên tiếng Việt <b>*</b></span>
              <input autoFocus maxLength={80} onChange={(event) => setNameVi(event.currentTarget.value)} placeholder="Ví dụ: Sự kiện" value={nameVi} />
            </label>
            <label className="roundtable-event-field">
              <span>Tên tiếng Anh <b>*</b></span>
              <input maxLength={80} onChange={(event) => setNameEn(event.currentTarget.value)} placeholder="E.g. Events" value={nameEn} />
            </label>
          </div>
          <div className="quarter-bilingual">
            <label className="roundtable-event-field">
              <span>Mô tả tiếng Việt</span>
              <textarea maxLength={300} onChange={(event) => setDescriptionVi(event.currentTarget.value)} placeholder="Hiện dưới tên chuyên mục trên trang Tin tức" rows={3} value={descriptionVi} />
            </label>
            <label className="roundtable-event-field">
              <span>Mô tả tiếng Anh</span>
              <textarea maxLength={300} onChange={(event) => setDescriptionEn(event.currentTarget.value)} rows={3} value={descriptionEn} />
            </label>
          </div>
          <label className="roundtable-event-field">
            <span>Đường dẫn</span>
            <input maxLength={80} onChange={(event) => setTypedSlug(event.currentTarget.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="tu-dong-theo-ten" value={slug} />
            <small className={`survey-source-hint${slug && !slugValid ? ' is-error' : ''}`}>
              {slug && !slugValid ? 'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.' : `Trang của chuyên mục: /tin-tuc/chuyen-muc/${slug || '...'}${category && category.slug !== slug ? ' — link cũ của chuyên mục sẽ không mở được nữa.' : ''}`}
            </small>
          </label>
          <div className="news-category-row">
            <div className="roundtable-event-field">
              <span id="news-category-order-label">Thứ tự</span>
              <div className="news-stepper">
                <button aria-label="Giảm thứ tự" disabled={sortOrder <= 0} onClick={() => setSortOrder((current) => Math.max(0, current - 1))} type="button"><Minus aria-hidden="true" size={15} /></button>
                <input aria-labelledby="news-category-order-label" inputMode="numeric" onChange={(event) => setSortOrder(Math.max(0, Math.min(999, Number(event.currentTarget.value.replace(/\D/g, '')) || 0)))} value={sortOrder} />
                <button aria-label="Tăng thứ tự" disabled={sortOrder >= 999} onClick={() => setSortOrder((current) => Math.min(999, current + 1))} type="button"><Plus aria-hidden="true" size={15} /></button>
              </div>
              <small className="survey-source-hint">Số nhỏ hiện trước trên trang Tin tức.</small>
            </div>
            <label className="news-switch">
              <input checked={isVisible} onChange={(event) => setIsVisible(event.currentTarget.checked)} type="checkbox" />
              <span aria-hidden="true" className="news-switch-track" />
              <span>Hiện trên trang web <small>Ẩn chuyên mục thì mọi bài trong chuyên mục cũng ẩn khỏi trang web</small></span>
            </label>
          </div>
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className="primary-button" disabled={!canSubmit} type="submit"><span>{busy ? 'Đang lưu...' : category ? 'Lưu thay đổi' : 'Tạo chuyên mục'}</span></button>
        </div>
      </form>
    </div>
  )
}

export function NewsCategoriesTab({ canEdit, categories, error, loading, onChanged, onReload, tabs }: {
  canEdit: boolean
  categories: NewsCategory[]
  error: string
  loading: boolean
  onChanged: () => Promise<void>
  onReload: () => void
  tabs: ReactNode
}) {
  const [form, setForm] = useState<{ category: NewsCategory | null } | null>(null)
  const [history, setHistory] = useState<NewsCategory | null>(null)
  const [removing, setRemoving] = useState<NewsCategory | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const [notice, setNotice] = useState('')
  const nextOrder = categories.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1

  async function toggleVisible(category: NewsCategory) {
    try {
      await updateNewsCategory(category.id, { description: category.description, isVisible: !category.isVisible, name: category.name, slug: category.slug, sortOrder: category.sortOrder })
      setNotice(category.isVisible ? `Đã ẩn chuyên mục “${category.name.vi}” và các bài trong đó khỏi trang web.` : `Đã hiện lại chuyên mục “${category.name.vi}”.`)
      await onChanged()
    } catch (caught) {
      setNotice(errorMessage(caught, 'Không đổi được trạng thái chuyên mục.'))
    }
  }

  async function remove() {
    if (!removing) return
    setRemoveBusy(true)
    setRemoveError('')
    try {
      await deleteNewsCategory(removing.id)
      setNotice(`Đã xóa chuyên mục “${removing.name.vi}”.`)
      setRemoving(null)
      await onChanged()
    } catch (caught) {
      setRemoveError(errorMessage(caught, 'Không xóa được chuyên mục.'))
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <main className="dashboard-main">
      {tabs}
      <section aria-busy={loading} className="content-surface news-list">
        <div className="surface-head">
          <div>
            <p>Tin tức</p>
            <h2>Chuyên mục</h2>
          </div>
          <div className="surface-actions">
            {canEdit ? <button className="primary-button" onClick={() => setForm({ category: null })} type="button"><Plus aria-hidden="true" size={16} /><span>Thêm chuyên mục</span></button> : null}
            <button className="secondary-button" disabled={loading} onClick={onReload} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        </div>
        <div className="survey-sources-intro">
          <p>Mỗi bài viết thuộc một chuyên mục. Trang Tin tức hiện mỗi chuyên mục thành một khối với 3 bài mới nhất và nút “Xem tất cả”, theo thứ tự bên dưới.</p>
        </div>
        {notice ? (
          <p aria-live="polite" className="survey-sources-notice">
            <span>{notice}</span>
            <button aria-label="Ẩn thông báo" className="icon-button" onClick={() => setNotice('')} type="button"><X aria-hidden="true" size={15} /></button>
          </p>
        ) : null}
        {error ? (
          <div className="empty-state">
            <CircleAlert aria-hidden="true" size={30} />
            <h2>Không tải được dữ liệu</h2>
            <p>{error}</p>
            <button className="secondary-button" onClick={onReload} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}
        {!error ? (
          <div className="news-table">
            <div aria-hidden="true" className="news-row news-cat-row news-row-head">
              <span>Thứ tự</span>
              <span>Chuyên mục</span>
              <span>Bài viết</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {!loading && categories.length === 0 ? <p className="survey-sources-empty">Chưa có chuyên mục nào.{canEdit ? ' Bấm “Thêm chuyên mục” để tạo chuyên mục đầu tiên.' : ''}</p> : null}
            {categories.map((category) => (
              <article className={`news-row news-cat-row${category.isVisible ? '' : ' is-muted'}`} key={category.id}>
                <div className="news-row-cell news-order">{category.sortOrder}</div>
                <div className="news-row-title news-cat-title">
                  <div>
                    <strong>{category.name.vi}</strong>
                    <small>EN: {category.name.en}</small>
                    <a className="news-cat-link" href={newsCategoryUrl(category.slug)} rel="noreferrer" target="_blank">/tin-tuc/chuyen-muc/{category.slug}<ExternalLink aria-hidden="true" size={11} /></a>
                  </div>
                </div>
                <div className="news-row-cell"><span className="news-row-label">Bài viết: </span>{formatNumber(category.publicPostCount)} đang hiện / {formatNumber(category.postCount)} bài</div>
                <div className="news-row-cell"><span className={`news-status is-${category.isVisible ? 'published' : 'hidden'}`}>{category.isVisible ? 'Đang hiện' : 'Đã ẩn'}</span></div>
                <div className="news-row-actions">
                  <button aria-label={`Lịch sử chuyên mục ${category.name.vi}`} className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={() => setHistory(category)} type="button"><History aria-hidden="true" size={16} /></button>
                  {canEdit ? (
                    <>
                      <button aria-label={`Sửa chuyên mục ${category.name.vi}`} className="icon-button" data-tooltip="Sửa" onClick={() => setForm({ category })} type="button"><Pencil aria-hidden="true" size={16} /></button>
                      <button aria-label={category.isVisible ? `Ẩn chuyên mục ${category.name.vi}` : `Hiện chuyên mục ${category.name.vi}`} className="icon-button" data-tooltip={category.isVisible ? 'Ẩn khỏi trang web' : 'Hiện lại'} onClick={() => void toggleVisible(category)} type="button">
                        {category.isVisible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                      </button>
                      <button aria-label={`Xóa chuyên mục ${category.name.vi}`} className="icon-button news-danger" data-tooltip={category.postCount ? 'Còn bài viết: chuyển bài sang chuyên mục khác hoặc ẩn chuyên mục' : 'Xóa'} disabled={category.postCount > 0} onClick={() => { setRemoveError(''); setRemoving(category) }} type="button"><Trash2 aria-hidden="true" size={16} /></button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {form ? (
        <CategoryDialog
          category={form.category}
          key={form.category?.id ?? 'new'}
          nextOrder={nextOrder}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setNotice(form.category ? `Đã lưu chuyên mục “${saved.name.vi}”.` : `Đã tạo chuyên mục “${saved.name.vi}”.`)
            setForm(null)
            void onChanged()
          }}
        />
      ) : null}
      {history ? <NewsCategoryHistoryDialog categoryId={history.id} name={history.name.vi} onClose={() => setHistory(null)} /> : null}
      {removing ? (
        <NewsConfirmDialog
          busy={removeBusy}
          confirmLabel="Xóa chuyên mục"
          error={removeError}
          message={`Chuyên mục “${removing.name.vi}” chưa có bài viết nào. Xóa xong sẽ không khôi phục được.`}
          onClose={() => setRemoving(null)}
          onConfirm={() => void remove()}
          title="Xóa chuyên mục?"
        />
      ) : null}
    </main>
  )
}
