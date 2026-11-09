import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CircleAlert, Copy, Eye, History, Pause, Pencil, Play, Plus, QrCode, RefreshCw, Trash2, X } from 'lucide-react'
import { CustomSelect, type SelectOption } from '@/components/CustomSelect'
import { createSurveySource, deleteSurveySource, getSubmissionStats, listSurveySources, updateSurveySource } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { personName } from '@/lib/roles'
import { copyText, downloadQrCode } from '@/lib/shareLink'
import type { SubmissionStats, SurveySource, SurveySourceList } from '@/types'
import { SurveySourceFormDialog, type SurveySourceFormValues } from './SurveySourceFormDialog'
import { SurveySourceHistoryDialog } from './SurveySourceHistoryDialog'
import { surveySourceQrFileName, surveySourceUrl } from './surveySourceLinks'

type FormState = { source: SurveySource | null }
type ConfirmState = { action: 'disable' | 'delete'; source: SurveySource }

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}

function buildQuarterOptions(stats: SubmissionStats | null): Array<SelectOption<string>> {
  return [
    { description: 'Đếm bài nộp của mọi quý', label: 'Tất cả quý', value: 'all' },
    ...(stats?.surveyVersions ?? []).map((version) => ({
      description: `${formatNumber(version.totalSubmissions)} lượt gửi`,
      label: `Bộ ${version.surveyVersion}`,
      value: version.surveyVersion,
    })),
  ]
}

function ConfirmDialog({ busy, confirm, error, onClose, onConfirm }: { busy: boolean; confirm: ConfirmState; error: string; onClose: () => void; onConfirm: () => void }) {
  const isDelete = confirm.action === 'delete'
  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="survey-source-confirm-title" aria-modal="true" className="report-modal survey-source-dialog" role="alertdialog">
        <div className="report-modal-header">
          <div>
            <p>Nguồn mời</p>
            <h2 id="survey-source-confirm-title">{isDelete ? 'Xóa' : 'Ngưng'} nguồn “{confirm.source.name}”?</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body">
          <p className="report-modal-intro">
            {isDelete
              ? 'Nguồn này chưa có bài nộp nào. Sau khi xóa, nếu ai đó vẫn dùng link hoặc mã QR cũ thì bài vẫn được nhận nhưng không tính cho nguồn nào. Không hoàn tác được.'
              : 'Link và mã QR của nguồn này vẫn mở được khảo sát và bài vẫn được nhận, nhưng bài nộp mới sẽ không được tính cho nguồn này nữa. Các bài đã tính vẫn giữ nguyên. Có thể bật lại bất cứ lúc nào.'}
          </p>
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className={isDelete ? 'danger-button' : 'primary-button'} disabled={busy} onClick={onConfirm} type="button">
            <span>{busy ? 'Đang xử lý...' : isDelete ? 'Xóa nguồn' : 'Ngưng nguồn'}</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export function SurveySourcesPage({ canEdit, onShowSubmissions, tabs }: { canEdit: boolean; onShowSubmissions: (sourceFilter: string) => void; tabs: ReactNode }) {
  const [surveyVersion, setSurveyVersion] = useState('all')
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [data, setData] = useState<SurveySourceList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [historySource, setHistorySource] = useState<SurveySource | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const quarterOptions = useMemo(() => buildQuarterOptions(stats), [stats])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await listSurveySources(surveyVersion === 'all' ? undefined : surveyVersion))
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được danh sách nguồn mời.'))
    } finally {
      setIsLoading(false)
    }
  }, [surveyVersion])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    getSubmissionStats().then(setStats).catch(() => {
      // The quarter list is optional; "Tất cả quý" still works.
    })
  }, [])

  function closeDialogs() {
    setForm(null)
    setConfirm(null)
    setDialogError('')
  }

  async function copyLink(source: SurveySource) {
    try {
      await copyText(surveySourceUrl(source.code))
      setNotice(`Đã sao chép link của nguồn “${source.name}”.`)
    } catch {
      setNotice('Không thể sao chép link trên trình duyệt này.')
    }
  }

  async function downloadQr(source: SurveySource) {
    try {
      await downloadQrCode(surveySourceUrl(source.code), surveySourceQrFileName(source.code))
      setNotice(`Đã tải mã QR của nguồn “${source.name}”.`)
    } catch {
      setNotice('Không thể tạo mã QR. Vui lòng thử lại.')
    }
  }

  async function saveForm(values: SurveySourceFormValues) {
    if (!form) return
    setBusy(true)
    setDialogError('')
    try {
      if (form.source) {
        await updateSurveySource(form.source.id, { isActive: form.source.isActive, name: values.name, note: values.note })
        setNotice(`Đã lưu nguồn “${values.name}”.`)
      } else {
        await createSurveySource(values)
        setNotice(`Đã tạo nguồn “${values.name}”. Bấm Sao chép link hoặc Tải mã QR để gửi cho bên đi mời.`)
      }
      closeDialogs()
      await load()
    } catch (caught) {
      setDialogError(errorMessage(caught, 'Không lưu được nguồn mời.'))
    } finally {
      setBusy(false)
    }
  }

  async function enable(source: SurveySource) {
    setBusy(true)
    try {
      await updateSurveySource(source.id, { isActive: true, name: source.name, note: source.note })
      setNotice(`Đã bật lại nguồn “${source.name}”. Bài nộp mới qua link của nguồn này sẽ được tính.`)
      await load()
    } catch (caught) {
      setNotice(errorMessage(caught, 'Không bật lại được nguồn mời.'))
    } finally {
      setBusy(false)
    }
  }

  async function runConfirm() {
    if (!confirm) return
    const { action, source } = confirm
    setBusy(true)
    setDialogError('')
    try {
      if (action === 'delete') {
        await deleteSurveySource(source.id)
        setNotice(`Đã xóa nguồn “${source.name}”.`)
      } else {
        await updateSurveySource(source.id, { isActive: false, name: source.name, note: source.note })
        setNotice(`Đã ngưng nguồn “${source.name}”. Bài nộp mới qua link của nguồn này không được tính nữa.`)
      }
      closeDialogs()
      await load()
    } catch (caught) {
      setDialogError(errorMessage(caught, 'Không thực hiện được. Vui lòng thử lại.'))
    } finally {
      setBusy(false)
    }
  }

  const items = data?.items ?? []

  return (
    <main className="dashboard-main">
      {tabs}

      <section aria-busy={isLoading} className="content-surface survey-sources">
        <div className="surface-head">
          <div>
            <p>Khảo sát</p>
            <h2>Nguồn mời</h2>
          </div>
          <div className="surface-actions">
            {canEdit ? (
              <button className="primary-button" onClick={() => { setDialogError(''); setForm({ source: null }) }} type="button">
                <Plus aria-hidden="true" size={16} />
                <span>Thêm nguồn</span>
              </button>
            ) : null}
            <button className="secondary-button" disabled={isLoading} onClick={() => void load()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        <div className="survey-sources-intro">
          <p>Mỗi nguồn là một bên đi mời (đối tác, sự kiện, người giới thiệu...) với link và mã QR riêng. Chỉ khi người được mời <strong>nộp bài khảo sát</strong> thì nguồn mới được tính.</p>
          <p>Người mở link rồi vài ngày sau mới làm (trong vòng 30 ngày, trên cùng điện thoại hoặc máy tính) vẫn được tính. Nếu họ mở link của nhiều nguồn, nguồn mở gần nhất được tính.</p>
        </div>

        <div className="filter-bar survey-sources-filter">
          <CustomSelect label="Quý khảo sát" onChange={setSurveyVersion} options={quarterOptions} value={surveyVersion} />
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
            <button className="secondary-button" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={16} /><span>Tải lại</span></button>
          </div>
        ) : null}

        {!error && isLoading && !data ? <p className="survey-sources-empty">Đang tải nguồn mời...</p> : null}

        {!error && data ? (
          <div className="survey-sources-list">
            <div aria-hidden="true" className="survey-source-row survey-source-header">
              <span>Nguồn mời</span>
              <span>Link và mã QR</span>
              <span>Bài nộp</span>
              <span>Lần nộp gần nhất</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            {items.length === 0 ? (
              <p className="survey-sources-empty">
                Chưa có nguồn mời nào.{canEdit ? ' Bấm “Thêm nguồn” để tạo link và mã QR cho bên đi mời.' : ''}
              </p>
            ) : null}

            {items.map((source) => (
              <article className={`survey-source-row${source.isActive ? '' : ' is-inactive'}`} key={source.id}>
                <div className="survey-source-name">
                  <strong>{source.name}</strong>
                  {source.note ? <span>{source.note}</span> : null}
                  <small className="survey-source-meta">
                    Tạo bởi {personName(source.createdBy)} · {formatDateTime(source.createdAt)}
                    {source.updatedAt !== source.createdAt && source.updatedBy ? <><br />Sửa gần nhất: {personName(source.updatedBy)} · {formatDateTime(source.updatedAt)}</> : null}
                  </small>
                </div>
                <div className="survey-source-link">
                  <a href={surveySourceUrl(source.code)} rel="noreferrer" target="_blank">{surveySourceUrl(source.code)}</a>
                  <div className="survey-source-link-actions">
                    <button className="mini-link-button" onClick={() => void copyLink(source)} type="button">
                      <Copy aria-hidden="true" size={14} />
                      <span>Sao chép link</span>
                    </button>
                    <button className="mini-link-button" onClick={() => void downloadQr(source)} type="button">
                      <QrCode aria-hidden="true" size={14} />
                      <span>Tải mã QR</span>
                    </button>
                  </div>
                </div>
                <div className="survey-source-count">
                  <strong>{formatNumber(source.submissionCount)}</strong>
                  <button className="survey-source-view" onClick={() => onShowSubmissions(source.id)} type="button">
                    <Eye aria-hidden="true" size={14} />
                    <span>Xem danh sách</span>
                  </button>
                </div>
                <div className="survey-source-last">
                  <span className="survey-source-mobile-label">Lần nộp gần nhất: </span>
                  {source.lastSubmittedAt ? formatDateTime(source.lastSubmittedAt) : 'Chưa có'}
                </div>
                <div className="survey-source-state">
                  <span className={`survey-source-status${source.isActive ? ' is-active' : ''}`}>{source.isActive ? 'Đang dùng' : 'Đã ngưng'}</span>
                </div>
                <div className="survey-source-actions">
                  <button aria-label={`Lịch sử nguồn ${source.name}`} className="icon-button" data-tooltip="Lịch sử thay đổi" onClick={() => setHistorySource(source)} type="button">
                    <History aria-hidden="true" size={16} />
                  </button>
                  {canEdit ? (
                    <>
                      <button aria-label={`Sửa nguồn ${source.name}`} className="icon-button" data-tooltip="Sửa" onClick={() => { setDialogError(''); setForm({ source }) }} type="button">
                        <Pencil aria-hidden="true" size={16} />
                      </button>
                      {source.isActive ? (
                        <button aria-label={`Ngưng nguồn ${source.name}`} className="icon-button" data-tooltip="Ngưng tính cho nguồn này" onClick={() => { setDialogError(''); setConfirm({ action: 'disable', source }) }} type="button">
                          <Pause aria-hidden="true" size={16} />
                        </button>
                      ) : (
                        <button aria-label={`Bật lại nguồn ${source.name}`} className="icon-button" data-tooltip="Bật lại" disabled={busy} onClick={() => void enable(source)} type="button">
                          <Play aria-hidden="true" size={16} />
                        </button>
                      )}
                      {source.totalSubmissionCount === 0 ? (
                        <button aria-label={`Xóa nguồn ${source.name}`} className="icon-button survey-source-delete" data-tooltip="Xóa" onClick={() => { setDialogError(''); setConfirm({ action: 'delete', source }) }} type="button">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </article>
            ))}

            <article className="survey-source-row survey-source-unattributed">
              <div className="survey-source-name">
                <strong>Không có nguồn mời</strong>
                <span>Nộp qua link chung hoặc vào thẳng website</span>
              </div>
              <div />
              <div className="survey-source-count">
                <strong>{formatNumber(data.unattributedSubmissions)}</strong>
                <button className="survey-source-view" onClick={() => onShowSubmissions('none')} type="button">
                  <Eye aria-hidden="true" size={14} />
                  <span>Xem danh sách</span>
                </button>
              </div>
              <div />
              <div />
              <div />
            </article>
          </div>
        ) : null}
      </section>

      {form ? <SurveySourceFormDialog busy={busy} error={dialogError} key={form.source?.id ?? 'new'} onClose={closeDialogs} onSubmit={(values) => void saveForm(values)} source={form.source} /> : null}
      {confirm ? <ConfirmDialog busy={busy} confirm={confirm} error={dialogError} onClose={closeDialogs} onConfirm={() => void runConfirm()} /> : null}
      {historySource ? <SurveySourceHistoryDialog onClose={() => setHistorySource(null)} source={historySource} /> : null}
    </main>
  )
}
