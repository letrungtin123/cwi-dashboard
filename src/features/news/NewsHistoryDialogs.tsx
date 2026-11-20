import { getNewsCategoryHistory, getNewsPostHistory } from '@/lib/api'
import type { AuditEntry } from '@/types'
import { CardHistoryDialog, quoted, record } from '@/features/surveyQuarters/CardHistoryDialog'
import { NEWS_STATE_LABELS } from './newsLabels'

const fieldLabels: Record<string, string> = {
  'author.en': 'tác giả (EN)',
  'author.vi': 'tác giả (VI)',
  category: 'chuyên mục',
  'content.en': 'nội dung (EN)',
  'content.vi': 'nội dung (VI)',
  'coverAlt.en': 'mô tả ảnh đại diện (EN)',
  'coverAlt.vi': 'mô tả ảnh đại diện (VI)',
  coverImage: 'ảnh đại diện',
  'excerpt.en': 'sapo (EN)',
  'excerpt.vi': 'sapo (VI)',
  isPinned: 'ghim nổi bật',
  publishedAt: 'ngày giờ đăng',
  'seoDescription.en': 'mô tả SEO (EN)',
  'seoDescription.vi': 'mô tả SEO (VI)',
  'seoTitle.en': 'tiêu đề SEO (EN)',
  'seoTitle.vi': 'tiêu đề SEO (VI)',
  slug: 'đường dẫn',
  source: 'nguồn bài gốc',
  status: 'trạng thái',
  'tags.en': 'thẻ (EN)',
  'tags.vi': 'thẻ (VI)',
  'title.en': 'tiêu đề (EN)',
  'title.vi': 'tiêu đề (VI)',
}

const statusLabel = (value: unknown) => (typeof value === 'string' && value in NEWS_STATE_LABELS ? NEWS_STATE_LABELS[value as keyof typeof NEWS_STATE_LABELS] : String(value))

function describePost(entry: AuditEntry) {
  const metadata = entry.metadata
  if (entry.action === 'news_post.create') return { lines: [`Trạng thái: ${statusLabel(metadata.status)}`], title: `Tạo bài ${quoted(metadata.title)}` }
  if (entry.action === 'news_post.delete') return { lines: [], title: `Xóa bài ${quoted(metadata.title)}` }
  const lines: string[] = []
  const statusChange = record(metadata.statusChange)
  if (statusChange.to) lines.push(`Trạng thái: ${statusLabel(statusChange.from)} → ${statusLabel(statusChange.to)}`)
  const slugChange = record(metadata.slugChange)
  if (slugChange.to) lines.push(`Đường dẫn: ${String(slugChange.from)} → ${String(slugChange.to)} (link cũ vẫn mở bài này)`)
  const changes = Array.isArray(metadata.changes) ? (metadata.changes as string[]).filter((key) => key !== 'status' && key !== 'slug') : []
  if (changes.length) lines.push(`Sửa: ${changes.map((key) => fieldLabels[key] ?? key).join(', ')}`)
  return { lines, title: statusChange.to === 'published' ? 'Đăng bài' : statusChange.to === 'hidden' ? 'Ẩn bài' : 'Sửa bài' }
}

const categoryFieldLabels: Record<string, string> = {
  descriptionEn: 'Mô tả (EN)', descriptionVi: 'Mô tả (VI)', isVisible: 'Hiện trên trang', nameEn: 'Tên (EN)', nameVi: 'Tên (VI)', slug: 'Đường dẫn', sortOrder: 'Thứ tự',
}

function describeCategory(entry: AuditEntry) {
  const metadata = entry.metadata
  if (entry.action === 'news_category.create') return { lines: [`Đường dẫn: ${String(metadata.slug)}`], title: `Tạo chuyên mục ${quoted(metadata.name)}` }
  if (entry.action === 'news_category.delete') return { lines: [], title: `Xóa chuyên mục ${quoted(metadata.name)}` }
  const changes = record(metadata.changes)
  const lines = Object.entries(changes).map(([key, value]) => {
    const change = record(value)
    const show = (item: unknown) => (typeof item === 'boolean' ? (item ? 'Hiện' : 'Ẩn') : typeof item === 'number' ? String(item) : quoted(item))
    return `${categoryFieldLabels[key] ?? key}: ${show(change.from)} → ${show(change.to)}`
  })
  return { lines, title: 'Sửa chuyên mục' }
}

export function NewsPostHistoryDialog({ onClose, postId, title }: { onClose: () => void; postId: string; title: string }) {
  return <CardHistoryDialog describe={describePost} heading={title} kicker="Lịch sử bài viết" load={() => getNewsPostHistory(postId)} onClose={onClose} />
}

export function NewsCategoryHistoryDialog({ categoryId, name, onClose }: { categoryId: string; name: string; onClose: () => void }) {
  return <CardHistoryDialog describe={describeCategory} heading={name} kicker="Lịch sử chuyên mục" load={() => getNewsCategoryHistory(categoryId)} onClose={onClose} />
}
