import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, Link2, RefreshCw, Share2, Undo2, X } from 'lucide-react'
import { getNewsSettings, saveNewsSettings } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { NewsSettings, NewsShareSettings } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'

function FacebookIcon() {
  return <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" fill="currentColor" /></svg>
}

function LinkedInIcon() {
  return <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17"><path d="M6.9 8.8H3.6V20h3.3V8.8ZM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.6c0-3-1.6-5-4.4-5-1.4 0-2.4.8-2.8 1.5V8.8H10V20h3.3v-5.6c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.3l-.1-6.4Z" fill="currentColor" /></svg>
}

// The buttons in the order the post page shows them.
const BUTTONS: Array<{ description: string; icon: ReactNode; key: keyof NewsShareSettings; label: string }> = [
  { description: 'Mở trang chia sẻ của Facebook kèm link bài viết.', icon: <FacebookIcon />, key: 'facebook', label: 'Chia sẻ lên Facebook' },
  { description: 'Mở trang chia sẻ của LinkedIn kèm link bài viết.', icon: <LinkedInIcon />, key: 'linkedin', label: 'Chia sẻ lên LinkedIn' },
  { description: 'Chép link bài để người đọc tự dán vào Zalo, email, tin nhắn…', icon: <Link2 aria-hidden="true" size={17} />, key: 'copyLink', label: 'Chép link bài viết' },
  { description: 'Mở bảng chia sẻ của điện thoại (Zalo, Messenger, mail…). Chỉ hiện trên điện thoại và một số trình duyệt máy tính.', icon: <Share2 aria-hidden="true" size={17} />, key: 'native', label: 'Chia sẻ qua ứng dụng khác' },
]

const sameShare = (a: NewsShareSettings, b: NewsShareSettings) => BUTTONS.every(({ key }) => a[key] === b[key])

// "Tin tức" -> "Cài đặt": which share buttons every post page shows.
export function NewsSettingsTab({ canEdit, tabs }: { canEdit: boolean; tabs: ReactNode }) {
  const [saved, setSaved] = useState<NewsSettings | null>(null)
  const [share, setShare] = useState<NewsShareSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const settings = await getNewsSettings()
      setSaved(settings)
      setShare(settings.share)
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Không tải được cài đặt.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changed = Boolean(saved && share && !sameShare(saved.share, share))
  const shown = share ? BUTTONS.filter(({ key }) => share[key]) : []

  async function save() {
    if (!share || !changed) return
    setBusy(true)
    setSaveError('')
    setNotice('')
    try {
      const next = await saveNewsSettings(share)
      setSaved(next)
      setShare(next.share)
      setNotice('Đã lưu. Trang bài viết sẽ cập nhật trong khoảng 1 phút.')
    } catch (caught) {
      setSaveError(errorMessage(caught, 'Không lưu được cài đặt.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="dashboard-main">
      {tabs}
      <section aria-busy={loading} className="content-surface news-list news-settings">
        <div className="surface-head">
          <div>
            <p>Tin tức</p>
            <h2>Cài đặt</h2>
          </div>
          <div className="surface-actions">
            <button className="secondary-button" disabled={loading || busy} onClick={() => { setNotice(''); void load() }} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        </div>
        <div className="survey-sources-intro">
          <p>Chọn các nút chia sẻ hiện trên mọi bài viết. Nút nào tắt sẽ ẩn ở cả cột nút bên trái bài và dòng “Chia sẻ bài viết” cuối bài. Tắt cả 4 nút thì phần chia sẻ được ẩn hẳn.</p>
        </div>
        {notice ? (
          <p aria-live="polite" className="survey-sources-notice">
            <span>{notice}</span>
            <button aria-label="Ẩn thông báo" className="icon-button" onClick={() => setNotice('')} type="button"><X aria-hidden="true" size={15} /></button>
          </p>
        ) : null}
        {loadError ? (
          <div className="empty-state">
            <CircleAlert aria-hidden="true" size={30} />
            <h2>Không tải được dữ liệu</h2>
            <p>{loadError}</p>
            <button className="secondary-button" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}
        {!loadError && share ? (
          <div className="news-settings-body">
            <h3 className="news-settings-title">Nút chia sẻ trong bài viết</h3>
            <ul className="news-settings-list">
              {BUTTONS.map(({ description, icon, key, label }) => (
                <li className={`news-settings-row${share[key] ? '' : ' is-off'}`} key={key}>
                  <span aria-hidden="true" className="news-settings-icon">{icon}</span>
                  <span className="news-settings-text">
                    <strong id={`news-share-${key}`}>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <label className="quarter-toggle news-settings-toggle">
                    <input
                      aria-labelledby={`news-share-${key}`}
                      checked={share[key]}
                      disabled={!canEdit || busy}
                      onChange={(event) => { const on = event.currentTarget.checked; setNotice(''); setShare((current) => (current ? { ...current, [key]: on } : current)) }}
                      role="switch"
                      type="checkbox"
                    />
                    <span>{share[key] ? 'Đang hiện' : 'Đang ẩn'}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="news-settings-preview">
              <span>Người đọc sẽ thấy:</span>
              {shown.length ? (
                <span className="news-settings-preview-buttons">
                  {shown.map(({ icon, key, label }) => <span aria-label={label} className="news-settings-icon is-preview" key={key} role="img">{icon}</span>)}
                </span>
              ) : <em>Không có phần chia sẻ</em>}
            </div>

            {saveError ? <p className="roundtable-event-error" role="alert">{saveError}</p> : null}

            <div className="news-settings-footer">
              <small>
                {saved?.updatedAt && saved.updatedByEmail
                  ? <>Cập nhật lần cuối {formatDateTime(saved.updatedAt)} bởi {saved.updatedByEmail}</>
                  : 'Chưa ai đổi cài đặt này: mọi nút đang hiện như mặc định.'}
              </small>
              {canEdit ? (
                <div className="news-settings-actions">
                  <button className="secondary-button" disabled={!changed || busy} onClick={() => { setSaveError(''); if (saved) setShare(saved.share) }} type="button"><Undo2 aria-hidden="true" size={16} /><span>Hoàn tác</span></button>
                  <button className="primary-button" disabled={!changed || busy} onClick={() => void save()} type="button"><span>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</span></button>
                </div>
              ) : <small className="news-settings-readonly">Chỉ admin mới đổi được cài đặt này.</small>}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
