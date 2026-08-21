import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const pageSizeOptions = [10, 25, 50, 100] as const

type TablePaginationProps = {
  hasNextPage: boolean
  hasPreviousPage: boolean
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  page: number
  pageSize: number
  rowCount: number
}

export function TablePagination({
  hasNextPage,
  hasPreviousPage,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  rowCount,
}: TablePaginationProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedPageSize = pageSizeOptions.includes(pageSize as (typeof pageSizeOptions)[number]) ? pageSize : 10

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="table-footer">
      <div className="pagination-summary">
        <strong>Trang {page}</strong>
        <span>{rowCount} dòng đang hiển thị</span>
      </div>

      <div className="pagination-controls">
        <div className="pagination-page-size" ref={rootRef}>
          <button
            aria-expanded={open}
            aria-haspopup="listbox"
            className={'pagination-select-trigger' + (open ? ' is-open' : '')}
            disabled={isLoading}
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <span className="pagination-select-label">Số dòng</span>
            <span className="pagination-select-value">{selectedPageSize} dòng/trang</span>
            <ChevronDown aria-hidden="true" className="pagination-select-chevron" size={16} />
          </button>

          <AnimatePresence>
            {open ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="pagination-select-menu"
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: -6 }}
                role="listbox"
                transition={{ duration: 0.14, ease: 'easeOut' }}
              >
                {pageSizeOptions.map((option) => {
                  const isSelected = option === selectedPageSize
                  return (
                    <button
                      aria-selected={isSelected}
                      className={'pagination-select-option' + (isSelected ? ' is-selected' : '')}
                      key={option}
                      onClick={() => {
                        onPageSizeChange(option)
                        setOpen(false)
                      }}
                      role="option"
                      type="button"
                    >
                      <span>{option} dòng/trang</span>
                      {isSelected ? <Check aria-hidden="true" size={16} /> : null}
                    </button>
                  )
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <button
          aria-label="Trang trước"
          className="pagination-arrow"
          disabled={isLoading || !hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          title="Trang trước"
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <span aria-live="polite" className="pagination-page-label">Trang {page}</span>
        <button
          aria-label="Trang sau"
          className="pagination-arrow"
          disabled={isLoading || !hasNextPage}
          onClick={() => onPageChange(page + 1)}
          title="Trang sau"
          type="button"
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </div>
  )
}