import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption<T extends string> = { description?: string; label: string; value: T }

export function CustomSelect<T extends string>({ label, onChange, options, value }: { label: string; onChange: (value: T) => void; options: Array<SelectOption<T>>; value: T }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value) ?? options[0]

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
    <div className="custom-select" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`custom-select-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="custom-select-label">{label}</span>
        <span className="custom-select-value">{selected.label}</span>
        <ChevronDown aria-hidden="true" className="custom-select-chevron" size={17} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="custom-select-menu"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: -6 }}
            role="listbox"
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  aria-selected={isSelected}
                  className={`custom-select-option${isSelected ? ' is-selected' : ''}`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  role="option"
                  type="button"
                >
                  <span className="custom-select-option-text">
                    <strong>{option.label}</strong>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <Check aria-hidden="true" size={16} /> : null}
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
