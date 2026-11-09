import { useState, type FormEvent } from 'react'
import { Check, Copy, KeyRound, X } from 'lucide-react'
import { copyText } from '@/lib/shareLink'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles'
import type { AdminAccount, AdminRole } from '@/types'

export type AdminAccountFormValues = { displayName: string; email: string; role: AdminRole }

const ROLE_OPTIONS: Array<{ description: string; label: string; value: AdminRole }> = (['viewer', 'admin', 'superadmin'] as const).map((role) => ({
  description: ROLE_DESCRIPTIONS[role],
  label: ROLE_LABELS[role],
  value: role,
}))

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Add or edit an admin account. The email is the sign-in name, so it is only
// chosen when the account is created.
export function AdminAccountFormDialog({
  account,
  busy,
  error,
  isSelf,
  onClose,
  onSubmit,
}: {
  account: AdminAccount | null
  busy: boolean
  error: string
  isSelf: boolean
  onClose: () => void
  onSubmit: (values: AdminAccountFormValues) => void
}) {
  const [displayName, setDisplayName] = useState(account?.displayName ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [role, setRole] = useState<AdminRole>(account?.role ?? 'viewer')
  const emailValid = EMAIL_PATTERN.test(email.trim())
  const canSubmit = Boolean(displayName.trim()) && emailValid && !busy

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ displayName: displayName.trim(), email: email.trim().toLowerCase(), role })
  }

  return (
    <div className="report-modal-backdrop" role="presentation">
      <form aria-labelledby="admin-account-dialog-title" aria-modal="true" className="report-modal survey-source-dialog admin-account-dialog" onSubmit={submit} role="dialog">
        <div className="report-modal-header">
          <div>
            <p>Quản lý quản trị viên</p>
            <h2 id="admin-account-dialog-title">{account ? 'Sửa tài khoản' : 'Thêm tài khoản'}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="report-modal-body survey-source-form">
          <label className="roundtable-event-field">
            <span>Họ và tên <b>*</b></span>
            <input autoFocus maxLength={160} onChange={(event) => setDisplayName(event.currentTarget.value)} placeholder="Ví dụ: Nguyễn Văn An" value={displayName} />
            <small className="survey-source-hint">Tên này hiện trong lịch sử thay đổi, ví dụ “Tạo bởi Nguyễn Văn An”.</small>
          </label>

          <label className="roundtable-event-field">
            <span>Email đăng nhập {account ? null : <b>*</b>}</span>
            <input autoComplete="off" disabled={Boolean(account)} maxLength={254} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="ten@congty.vn" type="email" value={email} />
            <small className={`survey-source-hint${email && !emailValid ? ' is-error' : ''}`}>
              {account ? 'Email là tên đăng nhập nên không đổi được.' : email && !emailValid ? 'Email chưa đúng định dạng.' : 'Sau khi tạo, hệ thống hiện mật khẩu tạm một lần để bạn gửi cho người này.'}
            </small>
          </label>

          <div className="roundtable-event-field">
            <span>Vai trò <b>*</b></span>
            {isSelf ? (
              <>
                <input disabled value={ROLE_LABELS[role]} />
                <small className="survey-source-hint">Bạn không thể tự đổi vai trò của mình.</small>
              </>
            ) : (
              <div aria-label="Vai trò" className="role-options" role="radiogroup">
                {ROLE_OPTIONS.map((option) => (
                  <label className={`role-option${role === option.value ? ' is-selected' : ''}`} key={option.value}>
                    <input checked={role === option.value} name="admin-account-role" onChange={() => setRole(option.value)} type="radio" value={option.value} />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>

        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className="primary-button" disabled={!canSubmit} type="submit">
            <span>{busy ? 'Đang lưu...' : account ? 'Lưu thay đổi' : 'Tạo tài khoản'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

// Shows a new temporary password exactly once.
export function TemporaryPasswordDialog({
  account,
  isNew,
  onClose,
  password,
}: {
  account: AdminAccount
  isNew: boolean
  onClose: () => void
  password: string
}) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  async function copy() {
    try {
      await copyText(password)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="temporary-password-title" aria-modal="true" className="report-modal survey-source-dialog" role="dialog">
        <div className="report-modal-header">
          <div>
            <p>{account.displayName || account.email}</p>
            <h2 id="temporary-password-title">{isNew ? 'Đã tạo tài khoản' : 'Đã đặt lại mật khẩu'}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body survey-source-form">
          <p className="report-modal-intro">
            Gửi email và mật khẩu tạm dưới đây cho người dùng. Mật khẩu chỉ hiện <strong>một lần</strong>, đóng hộp này là không xem lại được. Người dùng nên vào “Đổi mật khẩu” sau lần đăng nhập đầu.
          </p>
          <div className="temporary-password-box">
            <div>
              <span>Email đăng nhập</span>
              <strong>{account.email}</strong>
            </div>
            <div>
              <span>Mật khẩu tạm</span>
              <code>{password}</code>
            </div>
            <button className="secondary-button" onClick={() => void copy()} type="button">
              {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép mật khẩu'}</span>
            </button>
          </div>
          {copyError ? <p className="report-delivery-error">Không sao chép được trên trình duyệt này. Hãy chép tay mật khẩu ở trên.</p> : null}
          {!isNew ? <p className="survey-source-hint"><KeyRound aria-hidden="true" size={13} /> Người này đã bị đăng xuất khỏi mọi thiết bị.</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="primary-button" onClick={onClose} type="button"><span>Tôi đã lưu mật khẩu</span></button>
        </div>
      </section>
    </div>
  )
}

export type AccountConfirm = { action: 'lock' | 'reset'; account: AdminAccount }

export function AccountConfirmDialog({ busy, confirm, error, onClose, onConfirm }: { busy: boolean; confirm: AccountConfirm; error: string; onClose: () => void; onConfirm: () => void }) {
  const name = confirm.account.displayName || confirm.account.email
  const isLock = confirm.action === 'lock'
  return (
    <div className="report-modal-backdrop" role="presentation">
      <section aria-labelledby="admin-account-confirm-title" aria-modal="true" className="report-modal survey-source-dialog" role="alertdialog">
        <div className="report-modal-header">
          <div>
            <p>Quản lý quản trị viên</p>
            <h2 id="admin-account-confirm-title">{isLock ? `Khóa tài khoản “${name}”?` : `Đặt lại mật khẩu cho “${name}”?`}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="report-modal-body">
          <p className="report-modal-intro">
            {isLock
              ? 'Người này bị đăng xuất ngay và không đăng nhập được nữa. Tên của họ vẫn giữ nguyên trong lịch sử. Có thể mở khóa lại bất cứ lúc nào.'
              : 'Hệ thống tạo một mật khẩu tạm mới và hiện cho bạn một lần. Mật khẩu cũ không dùng được nữa và người này bị đăng xuất khỏi mọi thiết bị.'}
          </p>
          {error ? <p className="report-delivery-error">{error}</p> : null}
        </div>
        <div className="report-modal-footer">
          <button className="secondary-button" onClick={onClose} type="button">Hủy</button>
          <button className={isLock ? 'danger-button' : 'primary-button'} disabled={busy} onClick={onConfirm} type="button">
            <span>{busy ? 'Đang xử lý...' : isLock ? 'Khóa tài khoản' : 'Đặt lại mật khẩu'}</span>
          </button>
        </div>
      </section>
    </div>
  )
}
