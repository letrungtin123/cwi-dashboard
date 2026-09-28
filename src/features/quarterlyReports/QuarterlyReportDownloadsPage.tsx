import { Download, FileText, Search, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getQuarterlyReportDownloadStats, listQuarterlyReportDownloadsPage, ApiError } from '@/lib/api'
import { TablePagination } from '@/components/TablePagination'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { CursorPage, QuarterlyReportDownloadListItem, QuarterlyReportDownloadStats } from '@/types'

const emptyPage: CursorPage<QuarterlyReportDownloadListItem> = { hasNextPage: false, items: [], nextCursor: null }

export function QuarterlyReportDownloadsPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [cursors, setCursors] = useState<Array<string | null>>([null])
  const [data, setData] = useState<CursorPage<QuarterlyReportDownloadListItem>>(emptyPage)
  const [stats, setStats] = useState<QuarterlyReportDownloadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
      setCursors([null])
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      listQuarterlyReportDownloadsPage({ cursor: cursors[page - 1] ?? undefined, limit: pageSize, search: query || undefined }),
      getQuarterlyReportDownloadStats(),
    ]).then(([nextData, nextStats]) => {
      if (cancelled) return
      setData(nextData)
      setStats(nextStats)
      setError('')
    }).catch((loadError) => {
      if (cancelled) return
      setError(loadError instanceof ApiError ? loadError.message : 'Không thể tải danh sách tải báo cáo.')
    }).finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [cursors, page, pageSize, query])

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || isLoading) return
    if (nextPage > page) {
      if (!data.nextCursor) return
      setCursors((current) => { const next = [...current]; next[nextPage - 1] = data.nextCursor; return next })
    }
    setPage(nextPage)
  }

  return (
    <main className="dashboard-main quarterly-report-downloads">
      <section className="stats-grid quarterly-download-stats">
        <article className="stat-tile"><div className="stat-icon"><UsersRound aria-hidden="true" size={20} /></div><div><p>Tổng yêu cầu</p><strong>{formatNumber(stats?.totalRequests ?? 0)}</strong></div></article>
        <article className="stat-tile"><div className="stat-icon"><FileText aria-hidden="true" size={20} /></div><div><p>Yêu cầu hôm nay</p><strong>{formatNumber(stats?.todayRequests ?? 0)}</strong></div></article>
        <article className="stat-tile"><div className="stat-icon"><Download aria-hidden="true" size={20} /></div><div><p>Đã tải file</p><strong>{formatNumber(stats?.downloadedCount ?? 0)}</strong></div></article>
      </section>
      <section className="content-surface" data-loading={isLoading}>
        <div className="surface-head"><div><p className="surface-kicker">LEAD TẢI BÁO CÁO</p><h2>Danh sách tải báo cáo quý</h2><p>Thông tin đã xác nhận consent trước khi tải PDF đầy đủ.</p></div></div>
        <div className="filter-bar"><label className="search-box"><Search aria-hidden="true" size={17} /><input onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Tìm họ tên, email, số điện thoại, chức vụ..." value={search} /></label></div>
        {error ? <p className="quarterly-report-page-error" role="alert">{error}</p> : null}
        <div className="table-scroll"><table className="quarterly-download-table"><thead><tr><th>Người tải</th><th>Liên hệ</th><th>Chức vụ</th><th>Báo cáo</th><th>Yêu cầu lần đầu</th><th>Trạng thái tải</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><strong>{item.fullName}</strong></td><td><span>{item.email}</span><small>{item.phone}</small></td><td>{item.position}</td><td><strong>{item.reportPeriod}</strong><small>{item.reportSlug}</small></td><td>{formatDateTime(item.requestedAt)}</td><td><span className={item.downloadCount > 0 ? 'quarterly-report-status is-active' : 'quarterly-report-status'}>{item.downloadCount > 0 ? `Đã tải ${item.downloadCount} lần` : 'Chưa tải file'}</span></td></tr>)}{!isLoading && !data.items.length ? <tr><td className="quarterly-report-empty" colSpan={6}>Không tìm thấy dữ liệu tải báo cáo.</td></tr> : null}</tbody></table></div>
        <TablePagination hasNextPage={data.hasNextPage} hasPreviousPage={page > 1} isLoading={isLoading} onPageChange={changePage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); setCursors([null]) }} page={page} pageSize={pageSize} rowCount={data.items.length} />
      </section>
    </main>
  )
}
