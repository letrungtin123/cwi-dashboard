import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RefreshCw, Save } from 'lucide-react'
import { getReportGenerationSettings, saveReportGenerationSettings } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { ReportGenerationSettings as Settings } from '@/types'

type PendingChange = 'pause' | 'resume' | null

// The survey waiting page writes the day count with two digits ("07 ngày").
const padDays = (days: number) => String(days).padStart(2, '0')

// Same sentence the survey shows after submitting while report creation is paused
// (source4 ReportDeferredScreen), so the admin sees exactly what participants read.
const participantMessage = (days: number) => `Báo cáo cá nhân sẽ được gửi đến email Anh/Chị sau ${padDays(days)} ngày tới.`

// Switch for calling cwi-ai, worded for non-technical admins. While it is off, new
// submissions are stored with a waiting report job and the survey tells the
// participant the report arrives by email after N days; turning it back on lets the
// worker create and email every waiting report.
export function ReportGenerationSettings({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [daysInput, setDaysInput] = useState('')
  const [pendingChange, setPendingChange] = useState<PendingChange>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const apply = (next: Settings) => {
    setSettings(next)
    setDaysInput(String(next.deferredResultDays))
  }

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      apply(await getReportGenerationSettings())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được cài đặt báo cáo cá nhân.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const days = Number(daysInput)
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 60
  const daysDirty = Boolean(settings) && daysValid && days !== settings?.deferredResultDays
  const busy = isLoading || isSaving

  const save = async (input: { aiCallsEnabled: boolean; deferredResultDays: number }, successNotice: string) => {
    setIsSaving(true)
    setNotice('')
    setError('')
    try {
      apply(await saveReportGenerationSettings(input))
      setPendingChange(null)
      setNotice(successNotice)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được cài đặt báo cáo cá nhân.')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmPendingChange = () => {
    if (!settings || !pendingChange) return
    const aiCallsEnabled = pendingChange === 'resume'
    void save(
      { aiCallsEnabled, deferredResultDays: settings.deferredResultDays },
      aiCallsEnabled
        ? 'Đã bật lại. Những người đang chờ sẽ lần lượt nhận báo cáo qua email.'
        : `Đã tạm dừng. Người làm khảo sát từ giờ sẽ được báo nhận báo cáo qua email sau ${padDays(settings.deferredResultDays)} ngày.`,
    )
  }

  const saveDays = () => {
    if (!settings || !daysDirty) return
    void save({ aiCallsEnabled: settings.aiCallsEnabled, deferredResultDays: days }, `Đã lưu: ${padDays(days)} ngày.`)
  }

  const enabled = settings?.aiCallsEnabled ?? true
  const waitingCount = settings?.unfinishedJobs ?? 0
  const waiting = formatNumber(waitingCount)
  const previewDays = daysValid ? days : settings?.deferredResultDays ?? 7

  return (
    <section aria-busy={busy} className="content-surface report-generation-settings" data-paused={settings ? !enabled : undefined}>
      <div className="surface-head">
        <div>
          <p>Báo cáo cá nhân</p>
          <h2>Tạo và gửi báo cáo cho người làm khảo sát</h2>
        </div>
        <div className="report-generation-head-actions">
          {settings ? <span className={`report-generation-state ${enabled ? 'is-on' : 'is-off'}`}>{enabled ? 'Đang hoạt động' : 'Đang tạm dừng'}</span> : null}
          <button aria-label="Tải lại" className="icon-button" data-tooltip="Tải lại" disabled={busy} onClick={() => void load()} type="button">
            <RefreshCw aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {settings ? (
        <div className="report-generation-body">
          <div className="report-generation-status">
            <p>
              {enabled
                ? 'Người làm khảo sát xem được báo cáo ngay sau khi nộp bài và nhận báo cáo qua email.'
                : 'Khảo sát vẫn nhận bài bình thường nhưng tạm thời chưa tạo báo cáo. Khi bật lại, những người đang chờ sẽ tự động nhận báo cáo qua email.'}
            </p>
            <p className="report-generation-waiting">
              {waitingCount > 0 ? <><strong>{waiting}</strong> người đang chờ nhận báo cáo.</> : 'Không có ai đang chờ nhận báo cáo.'}
            </p>
            {enabled ? (
              <p className="report-generation-hint">
                Chỉ tạm dừng khi bộ phận kỹ thuật báo hệ thống tạo báo cáo đang gặp sự cố.
              </p>
            ) : null}
          </div>

          <div className="report-generation-message">
            <div className="report-generation-message-copy">
              <span>
                {enabled
                  ? 'Khi tạm dừng, người làm khảo sát sẽ thấy sau khi nộp bài:'
                  : daysDirty
                    ? 'Sau khi lưu số ngày, người làm khảo sát sẽ thấy:'
                    : 'Người làm khảo sát đang thấy sau khi nộp bài:'}
              </span>
              <q>{participantMessage(previewDays)}</q>
            </div>
            {canEdit ? (
              <div className="report-generation-days">
                <label className="roundtable-event-field">
                  <span>Số ngày</span>
                  <input
                    disabled={busy}
                    inputMode="numeric"
                    max={60}
                    min={1}
                    onChange={(next) => { setDaysInput(next.currentTarget.value); setNotice('') }}
                    type="number"
                    value={daysInput}
                  />
                </label>
                <button className="secondary-button" disabled={busy || !daysDirty} onClick={saveDays} type="button">
                  <Save aria-hidden="true" size={16} />
                  <span>Lưu số ngày</span>
                </button>
              </div>
            ) : null}
          </div>
          {daysInput && !daysValid ? <p className="roundtable-event-error">Số ngày phải từ 1 đến 60.</p> : null}

          {canEdit ? (
            <div className="report-generation-controls">
              {enabled ? (
                <button className="secondary-button report-generation-pause" disabled={busy || pendingChange !== null} onClick={() => { setPendingChange('pause'); setNotice('') }} type="button">
                  <Pause aria-hidden="true" size={16} />
                  <span>Tạm dừng tạo báo cáo</span>
                </button>
              ) : (
                <button className="primary-button" disabled={busy || pendingChange !== null} onClick={() => { setPendingChange('resume'); setNotice('') }} type="button">
                  <Play aria-hidden="true" size={16} />
                  <span>Bật lại tạo báo cáo</span>
                </button>
              )}
            </div>
          ) : null}

          {pendingChange ? (
            <div className="report-generation-confirm" role="alertdialog" aria-label={pendingChange === 'pause' ? 'Xác nhận tạm dừng tạo báo cáo' : 'Xác nhận bật lại tạo báo cáo'}>
              <p>
                {pendingChange === 'pause'
                  ? `Tạm dừng tạo báo cáo? Khảo sát vẫn nhận bài bình thường. Người làm khảo sát sẽ được báo nhận báo cáo qua email sau ${padDays(settings.deferredResultDays)} ngày.`
                  : waitingCount > 0
                    ? `Bật lại tạo báo cáo? ${waiting} người đang chờ sẽ lần lượt nhận báo cáo qua email. Chỉ bật lại khi bộ phận kỹ thuật báo hệ thống đã ổn.`
                    : 'Bật lại tạo báo cáo? Chỉ bật lại khi bộ phận kỹ thuật báo hệ thống đã ổn.'}
              </p>
              <div>
                <button className="primary-button compact" disabled={isSaving} onClick={confirmPendingChange} type="button">
                  <span>{isSaving ? 'Đang lưu...' : pendingChange === 'pause' ? 'Tạm dừng' : 'Bật lại'}</span>
                </button>
                <button className="secondary-button" disabled={isSaving} onClick={() => setPendingChange(null)} type="button">
                  <span>Hủy</span>
                </button>
              </div>
            </div>
          ) : null}

          {settings.updatedAt ? (
            <p className="roundtable-event-meta">Đổi lần cuối lúc {formatDateTime(settings.updatedAt)}{settings.updatedByEmail ? ` bởi ${settings.updatedByEmail}` : ''}</p>
          ) : null}
          {notice ? <p aria-live="polite" className="roundtable-event-notice">{notice}</p> : null}
        </div>
      ) : null}
      {error ? <p className="roundtable-event-error report-generation-load-error" role="alert">{error}</p> : null}
    </section>
  )
}
