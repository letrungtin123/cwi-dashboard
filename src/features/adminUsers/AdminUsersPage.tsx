import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, KeyRound, Lock, LockOpen, Pencil, Plus, RefreshCw, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { createAdminAccount, listAdminAccounts, resetAdminAccountPassword, setAdminAccountLocked, updateAdminAccount } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { personName, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/roles'
import type { AdminAccount, AdminRole } from '@/types'
import { AccountConfirmDialog, AdminAccountFormDialog, TemporaryPasswordDialog, type AccountConfirm, type AdminAccountFormValues } from './AdminAccountDialogs'

type FormState = { account: AdminAccount | null }
type PasswordState = { account: AdminAccount; isNew: boolean; password: string }

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}

const ROLE_ORDER: AdminRole[] = ['superadmin', 'admin', 'viewer']

// "Quản lý quản trị viên" (super admins only): add accounts, change name and role,
// lock / unlock, reset passwords. Accounts are never deleted, only locked.
export function AdminUsersPage() {
  const { retrySession, user } = useAuth()
  const [items, setItems] = useState<AdminAccount[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [confirm, setConfirm] = useState<AccountConfirm | null>(null)
  const [password, setPassword] = useState<PasswordState | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setItems((await listAdminAccounts()).items)
    } catch (caught) {
      setError(errorMessage(caught, 'Không tải được danh sách tài khoản quản trị.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function closeDialogs() {
    setForm(null)
    setConfirm(null)
    setDialogError('')
  }

  async function saveForm(values: AdminAccountFormValues) {
    if (!form) return
    setBusy(true)
    setDialogError('')
    try {
      if (form.account) {
        await updateAdminAccount(form.account.id, { displayName: values.displayName, role: values.role })
        setNotice(`Đã lưu tài khoản “${values.displayName}”.`)
        if (form.account.id === user?.id) void retrySession()
      } else {
        const created = await createAdminAccount(values)
        setPassword({ account: created.account, isNew: true, password: created.temporaryPassword })
        setNotice(`Đã tạo tài khoản “${values.displayName}”.`)
      }
      closeDialogs()
      await load()
    } catch (caught) {
      setDialogError(errorMessage(caught, 'Không lưu được tài khoản.'))
    } finally {
      setBusy(false)
    }
  }

  async function unlock(account: AdminAccount) {
    setBusy(true)
    try {
      await setAdminAccountLocked(account.id, false)
      setNotice(`Đã mở khóa “${account.displayName || account.email}”. Người này đăng nhập lại được bằng mật khẩu cũ.`)
      await load()
    } catch (caught) {
      setNotice(errorMessage(caught, 'Không mở khóa được tài khoản.'))
    } finally {
      setBusy(false)
    }
  }

  async function runConfirm() {
    if (!confirm) return
    const { account, action } = confirm
    const name = account.displayName || account.email
    setBusy(true)
    setDialogError('')
    try {
      if (action === 'lock') {
        await setAdminAccountLocked(account.id, true)
        setNotice(`Đã khóa “${name}”. Người này đã bị đăng xuất.`)
      } else {
        const reset = await resetAdminAccountPassword(account.id)
        setPassword({ account: reset.account, isNew: false, password: reset.temporaryPassword })
        setNotice(`Đã đặt lại mật khẩu cho “${name}”.`)
      }
      closeDialogs()
      await load()
    } catch (caught) {
      setDialogError(errorMessage(caught, 'Không thực hiện được. Vui lòng thử lại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="dashboard-main">
      <section aria-busy={isLoading} className="content-surface admin-users">
        <div className="surface-head">
          <div>
            <p>Hệ thống</p>
            <h2>Tài khoản quản trị</h2>
          </div>
          <div className="surface-actions">
            <button className="primary-button" onClick={() => { setDialogError(''); setForm({ account: null }) }} type="button">
              <Plus aria-hidden="true" size={16} />
              <span>Thêm tài khoản</span>
            </button>
            <button className="secondary-button" disabled={isLoading} onClick={() => void load()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        <div className="survey-sources-intro admin-users-roles">
          {ROLE_ORDER.map((role) => (
            <p key={role}><span className={`admin-role-badge is-${role}`}>{ROLE_LABELS[role]}</span> {ROLE_DESCRIPTIONS[role]}.</p>
          ))}
          <p>Tài khoản không xóa được, chỉ khóa, để tên người làm vẫn hiện đúng trong lịch sử thay đổi.</p>
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

        {!error && isLoading && !items ? <p className="survey-sources-empty">Đang tải tài khoản...</p> : null}

        {!error && items ? (
          <div className="survey-sources-list">
            <div aria-hidden="true" className="admin-user-row survey-source-header">
              <span>Họ tên</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Đăng nhập gần nhất</span>
              <span>Tạo bởi</span>
              <span>Thao tác</span>
            </div>

            {items.map((account) => {
              const isSelf = account.id === user?.id
              const name = account.displayName || account.email
              return (
                <article className={`admin-user-row${account.isActive ? '' : ' is-inactive'}`} key={account.id}>
                  <div className="survey-source-name admin-user-name">
                    <strong>{account.displayName || 'Chưa có họ tên'}{isSelf ? <em> (Bạn)</em> : null}</strong>
                    <span>{account.email}</span>
                  </div>
                  <div className="admin-user-role">
                    <span className={`admin-role-badge is-${account.role}`}>{ROLE_LABELS[account.role]}</span>
                  </div>
                  <div className="admin-user-state">
                    <span className={`survey-source-status${account.isActive ? ' is-active' : ''}`}>{account.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span>
                  </div>
                  <div className="survey-source-last admin-user-login">
                    <span className="survey-source-mobile-label">Đăng nhập gần nhất: </span>
                    {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'Chưa đăng nhập'}
                  </div>
                  <div className="survey-source-last admin-user-created">
                    <span className="survey-source-mobile-label">Tạo bởi: </span>
                    {account.createdBy ? personName(account.createdBy) : 'Hệ thống'}
                    <small>{formatDateTime(account.createdAt)}</small>
                  </div>
                  <div className="survey-source-actions">
                    <button aria-label={`Sửa tài khoản ${name}`} className="icon-button" data-tooltip="Sửa họ tên, vai trò" onClick={() => { setDialogError(''); setForm({ account }) }} type="button">
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    {isSelf ? null : (
                      <>
                        <button aria-label={`Đặt lại mật khẩu cho ${name}`} className="icon-button" data-tooltip="Đặt lại mật khẩu" onClick={() => { setDialogError(''); setConfirm({ account, action: 'reset' }) }} type="button">
                          <KeyRound aria-hidden="true" size={16} />
                        </button>
                        {account.isActive ? (
                          <button aria-label={`Khóa tài khoản ${name}`} className="icon-button survey-source-delete" data-tooltip="Khóa tài khoản" onClick={() => { setDialogError(''); setConfirm({ account, action: 'lock' }) }} type="button">
                            <Lock aria-hidden="true" size={16} />
                          </button>
                        ) : (
                          <button aria-label={`Mở khóa tài khoản ${name}`} className="icon-button" data-tooltip="Mở khóa" disabled={busy} onClick={() => void unlock(account)} type="button">
                            <LockOpen aria-hidden="true" size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>

      {form ? (
        <AdminAccountFormDialog
          account={form.account}
          busy={busy}
          error={dialogError}
          isSelf={form.account?.id === user?.id}
          key={form.account?.id ?? 'new'}
          onClose={closeDialogs}
          onSubmit={(values) => void saveForm(values)}
        />
      ) : null}
      {confirm ? <AccountConfirmDialog busy={busy} confirm={confirm} error={dialogError} onClose={closeDialogs} onConfirm={() => void runConfirm()} /> : null}
      {password ? <TemporaryPasswordDialog account={password.account} isNew={password.isNew} onClose={() => setPassword(null)} password={password.password} /> : null}
    </main>
  )
}
