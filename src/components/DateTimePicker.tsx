import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import './dateTimePicker.css'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const HOURS = Array.from({ length: 24 }, (_unused, hour) => hour)
const MINUTE_STEP = 5

const pad = (value: number) => String(value).padStart(2, '0')

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateTimeVi(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// The 6 weeks shown for a month, Monday first (as Vietnamese calendars are).
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_unused, index) => new Date(year, month, index - offset + 1))
}

// Next full 5 minutes from now: a sensible time when only a day is picked.
function nextRoundTime() {
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(Math.ceil((now.getMinutes() + 1) / MINUTE_STEP) * MINUTE_STEP)
  return now
}

function TimeColumn({ label, onPick, selected, values }: { label: string; onPick: (value: number) => void; selected: number; values: number[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  // The chosen value starts in the middle of its column, without scrolling the page.
  useLayoutEffect(() => {
    const center = () => {
      const list = listRef.current
      const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!list || !active) return
      const listBox = list.getBoundingClientRect()
      const activeBox = active.getBoundingClientRect()
      // Absolute, so running more than once gives the same position.
      const offset = activeBox.top - listBox.top + list.scrollTop
      list.scrollTop = offset - list.clientHeight / 2 + activeBox.height / 2
    }
    center()
    // Again once the picker has settled (on phones it becomes a sheet and its layout changes).
    const timer = window.setTimeout(center, 80)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="dt-time-column">
      <span>{label}</span>
      <div className="dt-time-list" ref={listRef}>
        {values.map((value) => (
          <button aria-label={`${label} ${pad(value)}`} aria-pressed={value === selected} className={value === selected ? 'is-selected' : ''} key={value} onClick={() => onPick(value)} type="button">
            {pad(value)}
          </button>
        ))}
      </div>
    </div>
  )
}

// Date and time in one field (24-hour clock, Monday-first calendar), instead of the browser's
// own datetime picker. value / onChange use ISO strings; null is "not set".
export function DateTimePicker({ emptyText, label, onChange, value }: {
  emptyText: string
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  const selected = useMemo(() => (value ? new Date(value) : null), [value])
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [view, setView] = useState(() => {
    const base = selected ?? new Date()
    return { month: base.getMonth(), year: base.getFullYear() }
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    if (!open) {
      const base = selected ?? new Date()
      setView({ month: base.getMonth(), year: base.getFullYear() })
      const rect = rootRef.current?.getBoundingClientRect()
      setOpenUp(Boolean(rect && window.innerHeight - rect.bottom < 420 && rect.top > 420))
    }
    setOpen((current) => !current)
  }

  function commit(date: Date) {
    date.setSeconds(0, 0)
    onChange(date.toISOString())
  }

  function pickDay(day: Date) {
    const time = selected ?? nextRoundTime()
    commit(new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes()))
    if (day.getMonth() !== view.month) setView({ month: day.getMonth(), year: day.getFullYear() })
  }

  function pickTime(part: 'hour' | 'minute', amount: number) {
    const base = selected ? new Date(selected) : nextRoundTime()
    if (part === 'hour') base.setHours(amount)
    else base.setMinutes(amount)
    commit(base)
  }

  function moveMonth(step: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + step, 1)
      return { month: next.getMonth(), year: next.getFullYear() }
    })
  }

  const days = monthGrid(view.year, view.month)
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_unused, index) => index * MINUTE_STEP)
  if (selected && !minutes.includes(selected.getMinutes())) minutes.push(selected.getMinutes())
  minutes.sort((a, b) => a - b)

  return (
    <div className={`dt-picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <div className="dt-field">
        <button aria-expanded={open} aria-haspopup="dialog" className="dt-trigger" onClick={toggle} type="button">
          <CalendarClock aria-hidden="true" className="dt-trigger-icon" size={18} />
          <span className="dt-trigger-text">
            <span className="dt-trigger-label">{label}</span>
            {selected ? <strong>{formatDateTimeVi(selected)}</strong> : <span className="dt-trigger-empty">{emptyText}</span>}
          </span>
          <ChevronDown aria-hidden="true" className="dt-trigger-chevron" size={17} />
        </button>
        {selected ? (
          <button aria-label="Xóa ngày giờ đã chọn" className="dt-clear" data-tooltip="Xóa ngày giờ" onClick={() => onChange(null)} type="button">
            <X aria-hidden="true" size={15} />
          </button>
        ) : null}
      </div>

      {/* Phones: the picker is a sheet from the bottom; tapping the dimmed page closes it. */}
      {open ? <div aria-hidden="true" className="dt-backdrop" onClick={() => setOpen(false)} /> : null}
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-label={label}
            className={`dt-popover${openUp ? ' is-up' : ''}`}
            exit={{ opacity: 0, y: openUp ? 6 : -6 }}
            initial={{ opacity: 0, y: openUp ? 6 : -6 }}
            role="dialog"
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <div className="dt-body">
              <div className="dt-calendar">
                <div className="dt-month">
                  <button aria-label="Tháng trước" className="dt-nav" onClick={() => moveMonth(-1)} type="button"><ChevronLeft aria-hidden="true" size={17} /></button>
                  <strong>Tháng {view.month + 1}, {view.year}</strong>
                  <button aria-label="Tháng sau" className="dt-nav" onClick={() => moveMonth(1)} type="button"><ChevronRight aria-hidden="true" size={17} /></button>
                </div>
                <div aria-hidden="true" className="dt-weekdays">
                  {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="dt-days">
                  {days.map((day) => {
                    const outside = day.getMonth() !== view.month
                    const isSelected = Boolean(selected && sameDay(day, selected))
                    const isToday = sameDay(day, today)
                    return (
                      <button
                        aria-label={`${WEEKDAY_NAMES[day.getDay()]}, ${day.getDate()} tháng ${day.getMonth() + 1} năm ${day.getFullYear()}`}
                        aria-pressed={isSelected}
                        className={`dt-day${outside ? ' is-outside' : ''}${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                        key={day.toISOString()}
                        onClick={() => pickDay(day)}
                        type="button"
                      >
                        {day.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="dt-time">
                <TimeColumn key={`h-${open}`} label="Giờ" onPick={(hour) => pickTime('hour', hour)} selected={selected?.getHours() ?? -1} values={HOURS} />
                <TimeColumn key={`m-${open}`} label="Phút" onPick={(minute) => pickTime('minute', minute)} selected={selected?.getMinutes() ?? -1} values={minutes} />
              </div>
            </div>
            <div className="dt-footer">
              <button className="dt-link" onClick={() => { const now = new Date(); commit(now); setView({ month: now.getMonth(), year: now.getFullYear() }) }} type="button">Bây giờ</button>
              {selected ? <button className="dt-link is-muted" onClick={() => onChange(null)} type="button">Xóa</button> : null}
              <button className="primary-button dt-done" onClick={() => setOpen(false)} type="button"><span>Xong</span></button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
