import { getQuarterlyReportHistory } from '@/lib/api'
import type { AuditEntry, QuarterlyReportAdmin } from '@/types'
import { CardHistoryDialog, quoted, record, type Change } from '@/features/surveyQuarters/CardHistoryDialog'

// In reading order: Vietnamese before English, title before description.
const textFields: Record<string, string> = {
  titleVi: 'tiêu đề (tiếng Việt)',
  titleEn: 'tiêu đề (tiếng Anh)',
  descriptionVi: 'mô tả (tiếng Việt)',
  descriptionEn: 'mô tả (tiếng Anh)',
}

const languageName = (value: unknown) => (value === 'en' ? 'tiếng Anh' : 'tiếng Việt')

// Plain-language title and detail lines for one history entry.
export function describeQuarterlyReportChange(entry: AuditEntry): { lines: string[]; title: string } {
  const fileName = typeof entry.metadata.fileName === 'string' ? [`File: ${entry.metadata.fileName}`] : []
  switch (entry.action) {
    case 'quarterly_report.create':
      return { lines: ['Quý mới đang ẩn, chưa có file PDF'], title: 'Thêm quý' }
    case 'quarterly_report.file_upload':
      return { lines: fileName, title: `Tải PDF ${languageName(entry.metadata.language)}` }
    case 'quarterly_report.file_remove':
      return { lines: fileName, title: `Gỡ PDF ${languageName(entry.metadata.language)}` }
    case 'quarterly_report.image_upload':
      return { lines: [], title: 'Tải ảnh mới cho thẻ' }
    case 'quarterly_report.image_remove':
      return { lines: ['Thẻ dùng lại ảnh mặc định của trang báo cáo'], title: 'Gỡ ảnh của thẻ' }
    case 'quarterly_report.update':
      break
    default:
      return { lines: [], title: entry.action }
  }

  const changes = record(entry.metadata.changes) as Record<string, Change>
  const lines: string[] = []
  if (changes.isVisible) lines.push(changes.isVisible.to ? 'Hiện thẻ trên trang Báo cáo quý' : 'Ẩn thẻ khỏi trang Báo cáo quý')
  if (changes.sortOrder) lines.push(`Đổi thứ tự ${String(changes.sortOrder.from)} → ${String(changes.sortOrder.to)}`)
  for (const [key, name] of Object.entries(textFields)) {
    const change = changes[key]
    if (change) lines.push(`Sửa ${name} ${quoted(change.from)} → ${quoted(change.to)}`)
  }
  return { lines, title: 'Sửa thẻ báo cáo' }
}

export function QuarterlyReportHistoryDialog({ onClose, report }: { onClose: () => void; report: QuarterlyReportAdmin }) {
  return (
    <CardHistoryDialog
      describe={describeQuarterlyReportChange}
      heading={`Báo cáo ${report.label.vi}`}
      kicker="Lịch sử báo cáo quý"
      load={() => getQuarterlyReportHistory(report.slug)}
      onClose={onClose}
    />
  )
}
