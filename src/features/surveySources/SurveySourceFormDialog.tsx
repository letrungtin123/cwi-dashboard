import { useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { SurveySource } from '@/types'
import { suggestSurveySourceCode, SURVEY_SOURCE_CODE_PATTERN, surveySourceUrl } from './surveySourceLinks'

export type SurveySourceFormValues = { code: string; name: string; note: string | null }

// Add or edit a source. The code is only chosen when the source is created,
// because it is printed in the QR code.
export function SurveySourceFormDialog({
  busy,
  error,
  onClose,
  onSubmit,
  source,
}: {
  busy: boolean
  error: string
  onClose: () => void
  onSubmit: (values: SurveySourceFormValues) => void
  source: SurveySource | null
}) {
  const dialogRef = useRef<HTMLFormElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [name, setName] = useState(source?.name ?? '')
  const [typedCode, setTypedCode] = useState<string | null>(null)
  const [note, setNote] = useState(source?.note ?? '')
  const code = source ? source.code : typedCode ?? suggestSurveySourceCode(name)
  const codeValid = SURVEY_SOURCE_CODE_PATTERN.test(code)
  const canSubmit = Boolean(name.trim()) && codeValid && !busy

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ code, name: name.trim(), note: note.trim() || null })
  }

  return (
    <div className="report-modal-backdrop" role="presentation">
      <form aria-labelledby="survey-source-dialog-title" aria-modal="true" className="report-modal survey-source-dialog" onSubmit={submit} role="dialog" ref={dialogRef} tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Nguồn mời</p>
            <h2 id="survey-source-dialog-title">{source ? 'Sửa nguồn mời' : 'Thêm nguồn mời'}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="report-modal-body survey-source-form">
          <label className="roundtable-event-field">
            <span>Tên nguồn <b>*</b></span>
            <input autoFocus maxLength={120} onChange={(event) => setName(event.currentTarget.value)} placeholder="Ví dụ: VCCI Hồ Chí Minh" value={name} />
          </label>

          <label className="roundtable-event-field">
            <span>Mã trong link {source ? null : <b>*</b>}</span>
            <input
              disabled={Boolean(source)}
              maxLength={48}
              onChange={(event) => setTypedCode(event.currentTarget.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="vi-du-vcci-hcm"
              value={code}
            />
            <small className={`survey-source-hint${code && !codeValid ? ' is-error' : ''}`}>
              {source
                ? 'Mã này nằm trong link và mã QR đã phát nên không đổi được.'
                : code && !codeValid
                  ? 'Mã chỉ gồm chữ thường không dấu, số và dấu gạch ngang, không bắt đầu hay kết thúc bằng dấu gạch ngang.'
                  : 'Tự tạo theo tên nguồn, có thể sửa. Sau khi tạo sẽ không đổi được vì mã nằm trong link và mã QR.'}
            </small>
          </label>

          <label className="roundtable-event-field survey-source-note-field">
            <span>Ghi chú</span>
            <textarea maxLength={500} onChange={(event) => setNote(event.currentTarget.value)} placeholder="Ví dụ: người phụ trách, sự kiện, thời gian phát QR" rows={3} value={note} />
          </label>

          <div className="survey-source-link-preview">
            <span>Link khảo sát của nguồn này</span>
            <code>{codeValid ? surveySourceUrl(code) : 'Nhập tên hoặc mã để xem link'}</code>
          </div>

          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>

        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className="primary-button" disabled={!canSubmit} type="submit">
            <span>{busy ? 'Đang lưu...' : source ? 'Lưu thay đổi' : 'Tạo nguồn'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
