import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type TooltipState = {
  text: string
  wide: boolean
  left: number
  top: number
  placement: 'top' | 'bottom' | 'right'
}

function getTooltipTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  const element = target.closest<HTMLElement>('[data-tooltip]')
  return element?.dataset.tooltip ? element : null
}

function getTooltipState(element: HTMLElement): TooltipState {
  const rect = element.getBoundingClientRect()
  const wide = element.hasAttribute('data-tooltip-wide')
  const maxWidth = Math.min(wide ? 320 : 280, Math.max(window.innerWidth - 24, 180))
  const halfWidth = maxWidth / 2
  const collapsedSidebar = element.closest<HTMLElement>('.sidebar[data-collapsed="true"]')

  if (collapsedSidebar) {
    const rightLimit = Math.max(12, window.innerWidth - maxWidth - 12)

    return {
      text: element.dataset.tooltip ?? '',
      wide,
      left: Math.min(Math.max(rect.right + 10, 12), rightLimit),
      placement: 'right',
      top: rect.top + rect.height / 2,
    }
  }

  const left = Math.min(Math.max(rect.left + rect.width / 2, halfWidth + 12), window.innerWidth - halfWidth - 12)
  const placement = rect.top < 74 ? 'bottom' : 'top'

  return {
    text: element.dataset.tooltip ?? '',
    wide,
    left,
    placement,
    top: placement === 'bottom' ? rect.bottom + 10 : rect.top - 10,
  }
}

export function TooltipLayer() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    let activeElement: HTMLElement | null = null

    const show = (element: HTMLElement) => {
      activeElement = element
      setTooltip(getTooltipState(element))
    }

    const hide = (element?: HTMLElement) => {
      if (!element || activeElement === element) {
        activeElement = null
        setTooltip(null)
      }
    }

    const handlePointerOver = (event: PointerEvent) => {
      const element = getTooltipTarget(event.target)
      if (element) show(element)
    }

    const handlePointerOut = (event: PointerEvent) => {
      const element = getTooltipTarget(event.target)
      const relatedTarget = getTooltipTarget(event.relatedTarget)
      if (element && relatedTarget !== element) hide(element)
    }

    const handleFocusIn = (event: FocusEvent) => {
      const element = getTooltipTarget(event.target)
      if (element) show(element)
    }

    const handleFocusOut = (event: FocusEvent) => {
      const element = getTooltipTarget(event.target)
      const relatedTarget = getTooltipTarget(event.relatedTarget)
      if (element && relatedTarget !== element) hide(element)
    }

    const handleViewportChange = () => {
      if (activeElement) setTooltip(getTooltipState(activeElement))
    }

    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    document.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)

    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [])

  if (!tooltip) return null

  return createPortal(
    <div
      aria-hidden="true"
      className={`cwi-tooltip ${tooltip.wide ? 'is-wide' : ''} is-${tooltip.placement}`}
      role="tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.text}
    </div>,
    document.body,
  )
}
