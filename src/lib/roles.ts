import type { AdminPerson, AdminRole } from '@/types'

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Quản trị viên',
  superadmin: 'Super Admin',
  viewer: 'Người xem',
}

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: 'Xem, xuất Excel, sửa nguồn mời, báo cáo và cài đặt',
  superadmin: 'Toàn quyền, thêm và quản lý tài khoản quản trị',
  viewer: 'Chỉ xem, không sửa và không xuất dữ liệu',
}

// Admins and super admins change content; viewers only read.
export function canManageContent(role: AdminRole | undefined) {
  return role === 'admin' || role === 'superadmin'
}

export function isSuperadmin(role: AdminRole | undefined) {
  return role === 'superadmin'
}

export function personName(person: AdminPerson | null | undefined) {
  return person?.name || person?.email || 'Không rõ'
}
