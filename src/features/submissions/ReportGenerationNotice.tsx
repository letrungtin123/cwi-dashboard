import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { getReportGenerationSettings } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import type { ReportGenerationSettings } from '@/types'

// Shown only while the technical team has paused report creation for every quarter (set on
// the server, not in the dashboard). Per-quarter switches are in the "Quý khảo sát" tab.
export function ReportGenerationNotice() {
  const [settings, setSettings] = useState<ReportGenerationSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    getReportGenerationSettings()
      .then((result) => { if (!cancelled) setSettings(result) })
      .catch(() => {
        // Only a notice; the page works without it.
      })
    return () => { cancelled = true }
  }, [])

  if (!settings?.globalPaused) return null

  return (
    <p className="report-generation-notice" role="status">
      <CircleAlert aria-hidden="true" size={18} />
      <span>
        <strong>Đang tạm dừng tạo báo cáo cho mọi quý (bộ phận kỹ thuật đang xử lý).</strong>{' '}
        Khảo sát vẫn nhận bài bình thường; người làm khảo sát được báo nhận báo cáo qua email sau.
        {settings.unfinishedJobs > 0 ? ` Hiện có ${formatNumber(settings.unfinishedJobs)} người đang chờ nhận báo cáo.` : ''}
      </span>
    </p>
  )
}
