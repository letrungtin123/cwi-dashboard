import { getSurveyQuarterHistory } from '@/lib/api'
import type { AuditEntry, SurveyQuarterAdmin } from '@/types'
import { CardHistoryDialog, quoted, record, type Change } from './CardHistoryDialog'

// In reading order: Vietnamese before English, title before description.
const textFields: Record<string, string> = {
  titleVi: 'tiêu đề (tiếng Việt)',
  titleEn: 'tiêu đề (tiếng Anh)',
  descriptionVi: 'mô tả (tiếng Việt)',
  descriptionEn: 'mô tả (tiếng Anh)',
}

// Plain-language title and detail lines for one history entry.
export function describeSurveyQuarterChange(entry: AuditEntry): { lines: string[]; title: string } {
  if (entry.action === 'survey_quarter.image_upload') return { lines: [], title: 'Tải ảnh mới cho thẻ' }
  if (entry.action === 'survey_quarter.image_remove') return { lines: ['Thẻ dùng lại ảnh mặc định của trang khảo sát'], title: 'Gỡ ảnh của thẻ' }
  if (entry.action !== 'survey_quarter.update') return { lines: [], title: entry.action }

  const changes = record(entry.metadata.changes) as Record<string, Change>
  const lines: string[] = []
  if (changes.isVisible) lines.push(changes.isVisible.to ? 'Hiện thẻ trên trang khảo sát' : 'Ẩn thẻ khỏi trang khảo sát')
  if (changes.sortOrder) lines.push(`Đổi thứ tự ${String(changes.sortOrder.from)} → ${String(changes.sortOrder.to)}`)
  for (const [key, name] of Object.entries(textFields)) {
    const change = changes[key]
    if (change) lines.push(`Sửa ${name} ${quoted(change.from)} → ${quoted(change.to)}`)
  }
  if (changes.reportGenerationEnabled) lines.push(changes.reportGenerationEnabled.to ? 'Bật tạo báo cáo' : 'Tạm dừng tạo báo cáo')
  if (changes.deferredResultDays) lines.push(`Đổi số ngày báo nhận báo cáo ${String(changes.deferredResultDays.from)} → ${String(changes.deferredResultDays.to)}`)
  return { lines, title: 'Sửa quý khảo sát' }
}

export function SurveyQuarterHistoryDialog({ onClose, quarter }: { onClose: () => void; quarter: SurveyQuarterAdmin }) {
  return (
    <CardHistoryDialog
      describe={describeSurveyQuarterChange}
      heading={`Khảo sát ${quarter.label.vi}`}
      kicker="Lịch sử quý khảo sát"
      load={() => getSurveyQuarterHistory(quarter.surveyVersion)}
      onClose={onClose}
    />
  )
}
