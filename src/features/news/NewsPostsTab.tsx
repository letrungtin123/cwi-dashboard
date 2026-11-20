import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, ExternalLink, History, Languages, Pencil, Pin, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { apiUrl, listNewsPosts } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { personName } from '@/lib/roles'
import { CustomSelect, type SelectOption } from '@/components/CustomSelect'
import type { NewsCategory, NewsPostList, NewsPostListItem, NewsStatusFilter } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { NewsPostHistoryDialog } from './NewsHistoryDialogs'
import { NEWS_STATE_LABELS, newsPostState, newsPostUrl } from './newsLabels'

const PAGE_SIZE = 20

const statusOptions: Array<SelectOption<NewsStatusFilter>> = [
  { label: 'Mọi trạng thái', value: 'all' },
  { label: 'Đã đăng', value: 'published' },
  { label: 'Hẹn giờ', value: 'scheduled' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Đã ẩn', value: 'hidden' },
]

export function NewsPostsTab({ canEdit, categories, notice, onCreate, onDelete, onDismissNotice, onEdit, reloadKey, tabs }: {
  canEdit: boolean
  categories: NewsCategory[]
  notice: string
  onCreate: () => void
  onDelete: (post: { id: string; title: string }) => void
  onDismissNotice: () => void
  onEdit: (id: string) => void
  reloadKey: number
  tabs: ReactNode
}) {
  const [data, setData] = useState<NewsPostList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState<NewsStatusFilter>('all')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<NewsPostListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await listNewsPosts({ categoryId, page, pageSize: PAGE_SIZE, search: appliedSearch, status }))
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được danh sách bài viết.'))
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, categoryId, page, status])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  // Searching waits until typing pauses.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const categoryOptions: Array<SelectOption<string>> = [{ label: 'Mọi chuyên mục', value: 'all' }, ...categories.map((category) => ({ label: category.name.vi, value: category.id }))]
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const filtered = appliedSearch || status !== 'all' || categoryId !== 'all'

  return (
    <main className="dashboard-main">
      {tabs}
      <section aria-busy={loading} className="content-surface news-list">
        <div className="surface-head">
          <div>
            <p>Tin tức</p>
            <h2>Bài viết</h2>
          </div>
          <div className="surface-actions">
            {canEdit ? (
              <button className="primary-button" disabled={categories.length === 0} onClick={onCreate} type="button">
                <Plus aria-hidden="true" size={16} />
                <span>Viết bài mới</span>
              </button>
            ) : null}
            <button className="secondary-button" disabled={loading} onClick={() => void load()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        {canEdit && categories.length === 0 ? <p className="news-callout is-warning"><CircleAlert aria-hidden="true" size={16} /><span>Chưa có chuyên mục nào. Hãy tạo chuyên mục ở tab “Chuyên mục” trước khi viết bài.</span></p> : null}

        {notice ? (
          <p aria-live="polite" className="survey-sources-notice">
            <span>{notice}</span>
            <button aria-label="Ẩn thông báo" className="icon-button" onClick={onDismissNotice} type="button"><X aria-hidden="true" size={15} /></button>
          </p>
        ) : null}

        <div className="filter-bar news-filter-bar">
          <label className="news-search">
            <Search aria-hidden="true" size={16} />
            <input aria-label="Tìm bài viết" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Tìm theo tiêu đề hoặc đường dẫn" value={search} />
          </label>
          <CustomSelect label="Trạng thái" onChange={(value) => { setStatus(value); setPage(1) }} options={statusOptions} value={status} />
          <CustomSelect label="Chuyên mục" onChange={(value) => { setCategoryId(value); setPage(1) }} options={categoryOptions} value={categoryId} />
        </div>

        {error ? (
          <div className="empty-state">
            <CircleAlert aria-hidden="true" size={30} />
            <h2>Không tải được dữ liệu</h2>
            <p>{error}</p>
            <button className="secondary-button" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}

        {!error && loading && !data ? <p className="survey-sources-empty">Đang tải bài viết...</p> : null}

        {!error && data ? (
          <div className="news-table">
            <div aria-hidden="true" className="news-row news-row-head">
              <span>Bài viết</span>
              <span>Chuyên mục</span>
              <span>Trạng thái</span>
              <span>Ngày đăng</span>
              <span>Lượt xem</span>
              <span>Thao tác</span>
            </div>
            {data.items.length === 0 ? (
              <p className="survey-sources-empty">
                {filtered ? 'Không có bài viết nào khớp bộ lọc.' : canEdit ? 'Chưa có bài viết nào. Bấm “Viết bài mới” để bắt đầu.' : 'Chưa có bài viết nào.'}
              </p>
            ) : null}
            {data.items.map((post) => {
              const state = newsPostState(post.status, post.publishedAt)
              const live = state === 'published'
              return (
                <article className="news-row" key={post.id}>
                  <div className="news-row-title">
                    <div className="news-thumb">{post.coverImageId ? <img alt="" loading="lazy" src={apiUrl(`/api/v1/public/news/images/${post.coverImageId}`)} /> : null}</div>
                    <div>
                      {canEdit ? <button className="news-title-button" onClick={() => onEdit(post.id)} type="button">{post.title.vi}</button> : <strong>{post.title.vi}</strong>}
                      <small>/tin-tuc/{post.slug}</small>
                      <span className="news-row-badges">
                        {post.isPinned ? <span className="news-badge is-pin"><Pin aria-hidden="true" size={11} />Ghim</span> : null}
                        {post.hasEnglish ? null : <span className="news-badge is-warn"><Languages aria-hidden="true" size={11} />Thiếu bản EN</span>}
                      </span>
                    </div>
                  </div>
                  <div className="news-row-cell"><span className="news-row-label">Chuyên mục: </span>{post.category.name.vi}</div>
                  <div className="news-row-cell"><span className={`news-status is-${state}`}>{NEWS_STATE_LABELS[state]}</span></div>
                  <div className="news-row-cell news-row-date">
                    <span className="news-row-label">Ngày đăng: </span>{post.publishedAt ? formatDateTime(post.publishedAt) : '—'}
                    <small>Sửa: {personName(post.updatedBy)} · {formatDateTime(post.updatedAt)}</small>
                  </div>
                  <div className="news-row-cell"><span className="news-row-label">Lượt xem: </span>{formatNumber(post.viewCount)}</div>
                  <div className="news-row-actions">
                    {live ? (
                      <a aria-label={`Xem bài ${post.title.vi} trên web`} className="icon-button" data-tooltip="Xem trên web" href={newsPostUrl(post.slug)} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size={16} /></a>
                    ) : null}
                    <button aria-label={`Lịch sử bài ${post.title.vi}`} className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={() => setHistory(post)} type="button"><History aria-hidden="true" size={16} /></button>
                    {canEdit ? (
                      <>
                        <button aria-label={`Sửa bài ${post.title.vi}`} className="icon-button" data-tooltip="Sửa" onClick={() => onEdit(post.id)} type="button"><Pencil aria-hidden="true" size={16} /></button>
                        <button aria-label={`Xóa bài ${post.title.vi}`} className="icon-button news-danger" data-tooltip="Xóa" onClick={() => onDelete({ id: post.id, title: post.title.vi })} type="button"><Trash2 aria-hidden="true" size={16} /></button>
                      </>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}

        {data && data.total > PAGE_SIZE ? (
          <div className="news-pager">
            <span>{formatNumber(data.total)} bài · Trang {page}/{pages}</span>
            <div>
              <button aria-label="Trang trước" className="icon-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button"><ChevronLeft aria-hidden="true" size={16} /></button>
              <button aria-label="Trang sau" className="icon-button" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)} type="button"><ChevronRight aria-hidden="true" size={16} /></button>
            </div>
          </div>
        ) : data ? <p className="news-pager-total">{formatNumber(data.total)} bài viết</p> : null}
      </section>

      {history ? <NewsPostHistoryDialog onClose={() => setHistory(null)} postId={history.id} title={history.title.vi} /> : null}
    </main>
  )
}
