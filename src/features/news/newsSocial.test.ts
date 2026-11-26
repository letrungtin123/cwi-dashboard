import { describe, expect, it } from 'vitest'
import type { NewsPageSettings } from '@/types'
import { normalizeSocialUrl, samePageSettings, shownSocialNetworks, socialUrlError } from './newsSocial'

const none = { on: false, url: '' }
const base: NewsPageSettings = { copyLink: true, social: { facebook: none, linkedin: none, youtube: none, zalo: none } }

describe('CWI social page links', () => {
  it('turns a pasted link into its https address and refuses other sites', () => {
    expect(normalizeSocialUrl('facebook', ' facebook.com/cwi.vn ')).toBe('https://facebook.com/cwi.vn')
    expect(normalizeSocialUrl('youtube', 'http://www.youtube.com/@cwi#about')).toBe('https://www.youtube.com/@cwi')
    expect(normalizeSocialUrl('zalo', 'https://oa.zalo.me/home/123')).toBe('https://oa.zalo.me/home/123')
    expect(normalizeSocialUrl('linkedin', '')).toBe('')
    expect(normalizeSocialUrl('facebook', 'https://www.linkedin.com/company/cwi')).toBeNull()
    expect(normalizeSocialUrl('linkedin', 'https://evil-linkedin.com/company/cwi')).toBeNull()
    expect(normalizeSocialUrl('youtube', 'https://www.youtube.com/')).toBeNull()
    expect(normalizeSocialUrl('zalo', 'javascript:alert(1)//zalo.me/1')).toBeNull()
    expect(socialUrlError('facebook', 'abc')).toContain('facebook.com')
    expect(socialUrlError('facebook', 'fb.com/cwi')).toBe('')
  })

  it('shows only networks switched on with a working link, and compares settings by their links', () => {
    const settings = { ...base, social: { ...base.social, facebook: { on: true, url: 'facebook.com/cwi' }, linkedin: { on: false, url: 'linkedin.com/company/cwi' }, zalo: { on: true, url: 'bad' } } }
    expect(shownSocialNetworks(settings)).toEqual(['facebook'])
    expect(samePageSettings(base, { ...base })).toBe(true)
    expect(samePageSettings(base, { ...base, copyLink: false })).toBe(false)
    expect(samePageSettings(settings, { ...settings, social: { ...settings.social, facebook: { on: true, url: ' facebook.com/cwi ' } } })).toBe(true)
  })
})
