import { getLandingUrl } from '@/lib/landing'
import type { NewsPostStatus } from '@/types'

export type NewsPostState = 'draft' | 'scheduled' | 'published' | 'hidden'

// What a visitor sees: a published post whose time has not come yet is "scheduled".
export function newsPostState(status: NewsPostStatus, publishedAt: string | null, now = Date.now()): NewsPostState {
  if (status === 'published' && publishedAt && new Date(publishedAt).getTime() > now) return 'scheduled'
  return status
}

export const NEWS_STATE_LABELS: Record<NewsPostState, string> = {
  draft: 'Nháp',
  hidden: 'Đã ẩn',
  published: 'Đã đăng',
  scheduled: 'Hẹn giờ',
}

export const NEWS_STATE_HELP: Record<NewsPostState, string> = {
  draft: 'Chỉ người quản trị thấy. Bấm “Đăng” khi bài đã đủ hai bản tiếng Việt và tiếng Anh.',
  hidden: 'Bài đã gỡ khỏi trang web; link bài báo “không tìm thấy”. Bấm “Đăng lại” để hiện lại.',
  published: 'Bài đang hiện trên trang Tin tức.',
  scheduled: 'Bài sẽ tự hiện trên trang Tin tức đúng thời điểm đã chọn.',
}

// The post's link, also the one for ads. English opens the English version.
export function newsPostUrl(slug: string, language: 'vi' | 'en' = 'vi') {
  return getLandingUrl(`/tin-tuc/${encodeURIComponent(slug)}${language === 'en' ? '?lang=en' : ''}`)
}

export function newsCategoryUrl(slug: string) {
  return getLandingUrl(`/tin-tuc/chuyen-muc/${encodeURIComponent(slug)}`)
}

// Same rule as the server: "Năng lực lãnh đạo Q3/2026" -> "nang-luc-lanh-dao-q3-2026".
export function slugify(value: string, max = 120) {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= max) return slug
  const cut = slug.slice(0, max)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash > max / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '')
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const RESERVED_SLUGS = new Set(['chuyen-muc', 'the'])
