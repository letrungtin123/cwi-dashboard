import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// Dialogs open on top of each other (a confirmation over a detail drawer). Only the top one
// answers the keyboard: a dialog rendered inside another wins over it, otherwise the one opened
// last. (Effects run child-first, so open order alone would get nested dialogs wrong.)
type OpenDialog = { ref: RefObject<HTMLElement | null> }
const openDialogs: OpenDialog[] = []

function topDialog() {
  const innermost = openDialogs.filter((dialog) => !openDialogs.some((other) => other !== dialog && other.ref.current && dialog.ref.current?.contains(other.ref.current)))
  return innermost[innermost.length - 1]
}

export type DialogKeyboardOptions = {
  // Element that gets focus when the dialog opens. Without it, focus goes to the dialog itself,
  // unless something inside already took it (an input with autoFocus).
  initialFocusRef?: RefObject<HTMLElement | null>
  // Escape was pressed. Leave it out when Escape must not close the dialog.
  onEscape?: () => void
}

// Keyboard behaviour for dashboard dialogs and drawers while `open` is true: Escape closes,
// Tab / Shift+Tab stay inside, and focus goes back to where it was when the dialog closes.
// Callbacks are read through a ref, so re-renders never re-run the setup (which would move focus).
export function useDialogKeyboard(open: boolean, dialogRef: RefObject<HTMLElement | null>, options: DialogKeyboardOptions = {}) {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (!open) return
    const entry: OpenDialog = { ref: dialogRef }
    openDialogs.push(entry)
    const previousFocus = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog || dialog.contains(document.activeElement)) return
      ;(optionsRef.current.initialFocusRef?.current ?? dialog).focus({ preventScroll: true })
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (topDialog() !== entry) return
      // A menu inside the dialog (a select list) closes first and marks the key as handled.
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        const { onEscape } = optionsRef.current
        if (onEscape) {
          event.preventDefault()
          onEscape()
        }
        return
      }
      const dialog = dialogRef.current
      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getClientRects().length > 0 || element === document.activeElement)
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      openDialogs.splice(openDialogs.indexOf(entry), 1)
      // Only give focus back if it is still inside the closing dialog or lost to the page body;
      // never pull it away from something the user clicked meanwhile.
      window.requestAnimationFrame(() => {
        const active = document.activeElement
        if (previousFocus?.isConnected && (!active || active === document.body || dialogRef.current?.contains(active))) previousFocus.focus({ preventScroll: true })
      })
    }
  }, [dialogRef, open])
}
