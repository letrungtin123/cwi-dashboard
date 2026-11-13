import { useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Eye, EyeOff, X } from 'lucide-react'
import { changeMyPassword } from '@/lib/api'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'

const MIN_LENGTH = 8
const MAX_LENGTH = 72

// "Đổi mật khẩu" for the signed-in account. Other sessions of the account are
// signed out; this one stays signed in.
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLFormElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword
  const canSubmit = Boolean(currentPassword) && newPassword.length >= MIN_LENGTH && newPassword === confirmPassword && !busy
  const inputType = showPasswords ? 'text' : 'password'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await changeMyPassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'Không đổi được mật khẩu. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="report-modal-backdrop" role="presentation">
      <form aria-labelledby="change-password-title" aria-modal="true" className="report-modal survey-source-dialog" onSubmit={(event) => void submit(event)} role="dialog" ref={dialogRef} tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Tài khoản của bạn</p>
            <h2 id="change-password-title">Đổi mật khẩu</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {done ? (
          <div className="report-modal-body">
            <p className="password-change-done">
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới. Nếu tài khoản đang đăng nhập ở máy khác thì máy đó đã bị đăng xuất.</span>
            </p>
          </div>
        ) : (
          <div className="report-modal-body survey-source-form">
            <label className="roundtable-event-field">
              <span>Mật khẩu hiện tại <b>*</b></span>
              <input autoComplete="current-password" autoFocus maxLength={512} onChange={(event) => setCurrentPassword(event.currentTarget.value)} type={inputType} value={currentPassword} />
            </label>
            <label className="roundtable-event-field">
              <span>Mật khẩu mới <b>*</b></span>
              <input autoComplete="new-password" maxLength={MAX_LENGTH} onChange={(event) => setNewPassword(event.currentTarget.value)} type={inputType} value={newPassword} />
              <small className={`survey-source-hint${tooShort ? ' is-error' : ''}`}>
                Ít nhất {MIN_LENGTH} ký tự. Nên dài hơn và có chữ hoa, chữ thường, số và ký tự đặc biệt.
              </small>
            </label>
            <label className="roundtable-event-field">
              <span>Nhập lại mật khẩu mới <b>*</b></span>
              <input autoComplete="new-password" maxLength={MAX_LENGTH} onChange={(event) => setConfirmPassword(event.currentTarget.value)} type={inputType} value={confirmPassword} />
              {mismatch ? <small className="survey-source-hint is-error">Hai mật khẩu mới chưa giống nhau.</small> : null}
            </label>
            <button className="mini-link-button password-visibility-toggle" onClick={() => setShowPasswords((current) => !current)} type="button">
              {showPasswords ? <EyeOff aria-hidden="true" size={14} /> : <Eye aria-hidden="true" size={14} />}
              <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
            </button>
            {error ? <p className="report-delivery-error">{error}</p> : null}
          </div>
        )}

        <div className="report-modal-footer">
          {done ? (
            <button className="primary-button" onClick={onClose} type="button"><span>Đóng</span></button>
          ) : (
            <>
              <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
              <button className="primary-button" disabled={!canSubmit} type="submit">
                <span>{busy ? 'Đang đổi...' : 'Đổi mật khẩu'}</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
