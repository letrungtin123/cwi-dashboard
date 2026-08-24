import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { createExportJob, getExportDownloadUrl, getExportJob } from "@/lib/api"
import type { ExportDataset, ExportFilters, ExportJob } from '@/types'

type ExportDataButtonProps = {
  dataset: ExportDataset
  filters: ExportFilters
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function triggerDownload(downloadUrl: string, fileName: string | null) {
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName || 'du-lieu.xlsx'
  anchor.rel = 'noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function statusText(job: ExportJob | null) {
  if (!job) return 'Đang chuẩn bị file...'
  if (job.status === 'queued') return 'Đang chờ xử lý...'
  if (job.status === 'generating') return 'Đang tạo file...'
  return 'Đang tải file...'
}
const QUEUED_TIMEOUT_MS = 30_000

export function ExportDataButton({ dataset, filters }: ExportDataButtonProps) {
  const [activeJob, setActiveJob] = useState<ExportJob | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleExport = async () => {
    if (isBusy) return
    setError('')
    setIsBusy(true)
    setActiveJob(null)

    try {
      let job = await createExportJob({ dataset, filters })
      if (!mountedRef.current) return
      setActiveJob(job)

      const deadline = Date.now() + 15 * 60 * 1000
      while (job.status === 'queued' || job.status === 'generating') {
        if (Date.now() >= deadline) throw new Error('Quá thời gian chờ tạo file. Vui lòng thử lại.')
        if (job.status === "queued" && Date.now() - Date.parse(job.createdAt) >= QUEUED_TIMEOUT_MS) {
          throw new Error("Hệ thống chưa bắt đầu xử lý file. Vui lòng thử lại sau.")
        }
        await wait(1500)
        job = await getExportJob(job.id)
        if (!mountedRef.current) return
        setActiveJob(job)
      }

      if (job.status !== 'completed') {
        throw new Error(job.errorMessage || 'Không thể tạo file dữ liệu.')
      }

      const readyDownloadUrl = getExportDownloadUrl(job.id)
      if (!mountedRef.current) return
      triggerDownload(readyDownloadUrl, job.fileName)
      setActiveJob(null)
    } catch (caught) {
      if (!mountedRef.current) return
      setError(caught instanceof Error ? caught.message : 'Không thể xuất dữ liệu.')
      setActiveJob(null)
    } finally {
      if (mountedRef.current) setIsBusy(false)
    }
  }

  return (
    <div className="export-action">
      <button aria-busy={isBusy} className="secondary-button export-button" disabled={isBusy} onClick={() => void handleExport()} type="button">
        <Download aria-hidden="true" size={16} />
        <span>{isBusy ? statusText(activeJob) : 'Xuất dữ liệu'}</span>
      </button>
      {error ? <span className="export-error" role="status">{error}</span> : null}
    </div>
  )
}
