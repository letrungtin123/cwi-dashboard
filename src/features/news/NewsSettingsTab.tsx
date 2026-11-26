import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, ExternalLink, Link2, RefreshCw, Undo2, X } from 'lucide-react'
import { getNewsSettings, saveNewsSettings } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { NewsPageSettings, NewsSettings, NewsSocialNetwork } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { NEWS_SOCIAL_NETWORKS, NEWS_SOCIAL_SITES, normalizeSocialUrl, samePageSettings, shownSocialNetworks, socialUrlError } from './newsSocial'

// The same icons as the post page (cwi-fe-landing-page NewsArticle.tsx).
const SOCIAL_ICONS: Record<NewsSocialNetwork, ReactNode> = {
  facebook: <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" fill="currentColor" /></svg>,
  linkedin: <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17"><path d="M6.9 8.8H3.6V20h3.3V8.8ZM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.6c0-3-1.6-5-4.4-5-1.4 0-2.4.8-2.8 1.5V8.8H10V20h3.3v-5.6c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.3l-.1-6.4Z" fill="currentColor" /></svg>,
  youtube: <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" fill="currentColor" fillRule="evenodd" /></svg>,
  zalo: <svg aria-hidden="true" height="19" viewBox="0 0 24 24" width="19"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.6 1.4 4.9 3.6 6.5L5 21l3.6-1.8c1.1.3 2.2.5 3.4.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3ZM8.5 7.8h7v1.3l-4.8 5h4.8v1.3h-7v-1.3l4.8-5H8.5V7.8Z" fill="currentColor" fillRule="evenodd" /></svg>,
}

const COPY_ICON = <Link2 aria-hidden="true" size={17} />

const clone = (settings: NewsPageSettings): NewsPageSettings => ({
  copyLink: settings.copyLink,
  social: Object.fromEntries(NEWS_SOCIAL_NETWORKS.map((network) => [network, { ...settings.social[network] }])) as NewsPageSettings['social'],
})

// "Tin tức" -> "Cài đặt": the icons beside every post. Each network icon opens CWI's page
// there; the copy-link icon copies the post's link for the reader.
export function NewsSettingsTab({ canEdit, tabs }: { canEdit: boolean; tabs: ReactNode }) {
  const [saved, setSaved] = useState<NewsSettings | null>(null)
  const [draft, setDraft] = useState<NewsPageSettings | null>(null)
  // A link's mistake is shown once its field is left (or on Save), not while typing.
  const [checked, setChecked] = useState<Partial<Record<NewsSocialNetwork, boolean>>>({})
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
      setDraft(clone(settings))
      setChecked({})
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Không tải được cài đặt.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changed = Boolean(saved && draft && !samePageSettings(saved, draft))
  const errors = draft
    ? Object.fromEntries(NEWS_SOCIAL_NETWORKS.map((network) => [network, socialUrlError(network, draft.social[network].url)])) as Record<NewsSocialNetwork, string>
    : null
  const shown = draft ? shownSocialNetworks(draft) : []

  function edit(change: (current: NewsPageSettings) => NewsPageSettings) {
    setNotice('')
    setSaveError('')
    setDraft((current) => (current ? change(current) : current))
  }

  function setUrl(network: NewsSocialNetwork, url: string) {
    edit((current) => {
      const before = current.social[network]
      // A link pasted into an empty row shows its icon; clearing the link hides it.
      const on = !url.trim() ? false : !before.url.trim() ? true : before.on
      return { ...current, social: { ...current.social, [network]: { on, url } } }
    })
  }

  function leaveUrl(network: NewsSocialNetwork) {
    setChecked((current) => ({ ...current, [network]: true }))
    // "facebook.com/cwi" is shown as the full address it will be saved as.
    setDraft((current) => {
      const url = current ? normalizeSocialUrl(network, current.social[network].url) : null
      if (!current || !url || url === current.social[network].url) return current
      return { ...current, social: { ...current.social, [network]: { ...current.social[network], url } } }
    })
  }

  async function save() {
    if (!draft || !changed || !errors) return
    const wrong = NEWS_SOCIAL_NETWORKS.filter((network) => errors[network])
    if (wrong.length) {
      setChecked(Object.fromEntries(NEWS_SOCIAL_NETWORKS.map((network) => [network, true])))
      setSaveError(`Link ${wrong.map((network) => NEWS_SOCIAL_SITES[network].label).join(', ')} chưa đúng, vui lòng sửa trước khi lưu.`)
      return
    }
    setBusy(true)
    setSaveError('')
    setNotice('')
    try {
      const next = await saveNewsSettings(draft)
      setSaved(next)
      setDraft(clone(next))
      setChecked({})
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
          <p>Các icon này nằm ở cột bên trái bài viết và ở cuối bài. Icon mạng xã hội mở trang của CWI trên mạng đó, icon chép link giúp người đọc lấy link bài để gửi đi.</p>
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
        {!loadError && draft && errors ? (
          <div className="news-settings-body">
            <div className="news-settings-group">
              <h3 className="news-settings-title">Trang của CWI trên mạng xã hội</h3>
              <p className="news-settings-lead">Dán link trang của CWI vào mạng tương ứng. Mạng nào chưa có link thì icon đó không hiện.</p>
              <ul className="news-settings-list">
                {NEWS_SOCIAL_NETWORKS.map((network) => {
                  const { example, label } = NEWS_SOCIAL_SITES[network]
                  const link = draft.social[network]
                  const url = normalizeSocialUrl(network, link.url)
                  const error = checked[network] ? errors[network] : ''
                  return (
                    <li className={`news-settings-row news-social-row${link.on && url ? '' : ' is-off'}`} key={network}>
                      <span aria-hidden="true" className="news-settings-icon">{SOCIAL_ICONS[network]}</span>
                      <div className="news-social-field">
                        <label htmlFor={`news-social-${network}`}><strong id={`news-social-${network}-label`}>{label}</strong></label>
                        <div className="news-social-input">
                          <input
                            aria-describedby={error ? `news-social-${network}-error` : undefined}
                            aria-invalid={Boolean(error)}
                            autoComplete="off"
                            disabled={!canEdit || busy}
                            id={`news-social-${network}`}
                            inputMode="url"
                            maxLength={500}
                            onBlur={() => leaveUrl(network)}
                            onChange={(event) => setUrl(network, event.currentTarget.value)}
                            placeholder={example}
                            spellCheck={false}
                            value={link.url}
                          />
                          {url ? (
                            <a aria-label={`Mở thử trang ${label} của CWI`} className="icon-button news-social-open" data-tooltip="Mở thử link" href={url} rel="noopener noreferrer" target="_blank">
                              <ExternalLink aria-hidden="true" size={16} />
                            </a>
                          ) : null}
                        </div>
                        {error ? <small className="news-hint is-error" id={`news-social-${network}-error`}>{error}</small> : null}
                      </div>
                      <label className="quarter-toggle news-settings-toggle">
                        <input
                          aria-labelledby={`news-social-${network}-label`}
                          checked={link.on}
                          disabled={!canEdit || busy || !link.url.trim()}
                          onChange={(event) => { const on = event.currentTarget.checked; edit((current) => ({ ...current, social: { ...current.social, [network]: { ...current.social[network], on } } })) }}
                          role="switch"
                          type="checkbox"
                        />
                        <span>{link.on ? 'Đang hiện' : link.url.trim() ? 'Đang ẩn' : 'Chưa có link'}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="news-settings-group">
              <h3 className="news-settings-title">Chia sẻ bài viết</h3>
              <ul className="news-settings-list">
                <li className={`news-settings-row${draft.copyLink ? '' : ' is-off'}`}>
                  <span aria-hidden="true" className="news-settings-icon">{COPY_ICON}</span>
                  <span className="news-settings-text">
                    <strong id="news-copy-link-label">Chép link bài viết</strong>
                    <small>Người đọc bấm vào sẽ chép link bài đang xem và thấy thông báo “Đã sao chép link”.</small>
                  </span>
                  <label className="quarter-toggle news-settings-toggle">
                    <input
                      aria-labelledby="news-copy-link-label"
                      checked={draft.copyLink}
                      disabled={!canEdit || busy}
                      onChange={(event) => { const on = event.currentTarget.checked; edit((current) => ({ ...current, copyLink: on })) }}
                      role="switch"
                      type="checkbox"
                    />
                    <span>{draft.copyLink ? 'Đang hiện' : 'Đang ẩn'}</span>
                  </label>
                </li>
              </ul>
            </div>

            <div className="news-settings-preview">
              <span>Người đọc sẽ thấy:</span>
              {shown.length || draft.copyLink ? (
                <span className="news-settings-preview-buttons">
                  {shown.map((network) => <span aria-label={NEWS_SOCIAL_SITES[network].label} className="news-settings-icon is-preview" key={network} role="img">{SOCIAL_ICONS[network]}</span>)}
                  {shown.length && draft.copyLink ? <span aria-hidden="true" className="news-settings-preview-divider" /> : null}
                  {draft.copyLink ? <span aria-label="Chép link bài viết" className="news-settings-icon is-preview" role="img">{COPY_ICON}</span> : null}
                </span>
              ) : <em>Không có icon nào</em>}
            </div>

            {saveError ? <p className="roundtable-event-error" role="alert">{saveError}</p> : null}

            <div className="news-settings-footer">
              <small>
                {saved?.updatedAt && saved.updatedByEmail
                  ? <>Cập nhật lần cuối {formatDateTime(saved.updatedAt)} bởi {saved.updatedByEmail}</>
                  : 'Chưa ai đổi cài đặt này.'}
              </small>
              {canEdit ? (
                <div className="news-settings-actions">
                  <button className="secondary-button" disabled={!changed || busy} onClick={() => { setSaveError(''); setChecked({}); if (saved) setDraft(clone(saved)) }} type="button"><Undo2 aria-hidden="true" size={16} /><span>Hoàn tác</span></button>
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
