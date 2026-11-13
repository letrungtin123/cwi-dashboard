import { describe, expect, it } from 'vitest'
import { canManageContent, isSuperadmin } from './roles'

describe('roles', () => {
  it('only admins and super admins may change content', () => {
    expect(canManageContent('superadmin')).toBe(true)
    expect(canManageContent('admin')).toBe(true)
    expect(canManageContent('viewer')).toBe(false)
    expect(canManageContent(undefined)).toBe(false)
  })

  it('only super admins manage accounts and delete submissions', () => {
    expect(isSuperadmin('superadmin')).toBe(true)
    expect(isSuperadmin('admin')).toBe(false)
    expect(isSuperadmin(undefined)).toBe(false)
  })
})
