import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { getRoundtableEvent, saveRoundtableEvent } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { RoundtableEvent } from '@/types'

// Time and location shown in the Roundtable registration popups on the
// landing page and in the survey, for the quarter that is open for registration.
export function RoundtableEventSettings({ canEdit }: { canEdit: boolean }) {
  const [event, setEvent] = useState<RoundtableEvent | null>(null)
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getRoundtableEvent()
      .then((next) => {
        if (!active) return
        setEvent(next)
        setEventTime(next.eventTime ?? '')
        setEventLocation(next.eventLocation ?? '')
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Không tải được thông tin CEO Roundtable.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const trimmedTime = eventTime.trim()
  const trimmedLocation = eventLocation.trim()
  const isDirty = trimmedTime !== (event?.eventTime ?? '') || trimmedLocation !== (event?.eventLocation ?? '')
  const canSave = canEdit && !isLoading && !isSaving && isDirty && Boolean(trimmedTime) && Boolean(trimmedLocation)

  const save = async () => {
    if (!canSave) return
    setIsSaving(true)
    setNotice('')
    setError('')
    try {
      const saved = await saveRoundtableEvent({ eventLocation: trimmedLocation, eventTime: trimmedTime })
      setEvent(saved)
      setEventTime(saved.eventTime ?? '')
      setEventLocation(saved.eventLocation ?? '')
      setNotice('Đã lưu. Popup đăng ký trên landing page hiển thị thông tin mới ngay.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được thông tin CEO Roundtable.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section aria-busy={isLoading || isSaving} className="content-surface roundtable-event-settings">
      <div className="surface-head">
        <div>
          <p>Thông tin chương trình</p>
          <h2>CEO Roundtable {event ? `quý ${event.quarter}` : ''}</h2>
        </div>
      </div>
      <div className="roundtable-event-form">
        <label className="roundtable-event-field">
          <span>Thời gian <b>*</b></span>
          <input
            disabled={!canEdit || isLoading || isSaving}
            maxLength={300}
            onChange={(next) => { setEventTime(next.currentTarget.value); setNotice('') }}
            placeholder="Ví dụ: 8:00 – 10:00, Thứ năm ngày 17/12/2026"
            value={eventTime}
          />
        </label>
        <label className="roundtable-event-field">
          <span>Địa điểm <b>*</b></span>
          <input
            disabled={!canEdit || isLoading || isSaving}
            maxLength={300}
            onChange={(next) => { setEventLocation(next.currentTarget.value); setNotice('') }}
            placeholder="Ví dụ: Tòa nhà VCCI, 171 Võ Thị Sáu, TP. HCM"
            value={eventLocation}
          />
        </label>
        <div className="roundtable-event-footer">
          <p className="roundtable-event-meta">
            {event?.updatedAt
              ? `Cập nhật ${formatDateTime(event.updatedAt)}${event.updatedByEmail ? ` bởi ${event.updatedByEmail}` : ''}`
              : 'Chưa nhập thông tin cho quý này. Landing page đang hiển thị "Đang cập nhật".'}
          </p>
          {canEdit ? (
            <button className="primary-button" disabled={!canSave} onClick={() => void save()} type="button">
              <Save aria-hidden="true" size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          ) : null}
        </div>
        {notice ? <p aria-live="polite" className="roundtable-event-notice">{notice}</p> : null}
        {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
      </div>
    </section>
  )
}
