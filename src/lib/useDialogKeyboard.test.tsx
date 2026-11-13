import { useRef, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CustomSelect } from '@/components/CustomSelect'
import { useDialogKeyboard } from './useDialogKeyboard'

// jsdom has no layout: report every element as visible so the Tab trap sees the buttons.
beforeAll(() => {
  HTMLElement.prototype.getClientRects = function () {
    return [{}] as unknown as DOMRectList
  }
})

async function nextFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  })
}

function Drawer({ onClose, open, children }: { children?: React.ReactNode; onClose: () => void; open: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useDialogKeyboard(open, ref, { onEscape: onClose })
  return (
    <aside aria-label="Ngăn chi tiết" inert={!open} ref={ref} role="dialog" tabIndex={-1}>
      <button type="button">Đầu</button>
      <button disabled type="button">Tắt</button>
      <button type="button">Cuối</button>
      {children}
    </aside>
  )
}

function Confirm({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useDialogKeyboard(true, ref, { onEscape: onClose })
  return (
    <section aria-label="Xác nhận" ref={ref} role="alertdialog" tabIndex={-1}>
      <button type="button">Hủy</button>
    </section>
  )
}

describe('useDialogKeyboard (dashboard)', () => {
  it('focuses the drawer, keeps Tab inside, closes on Escape and gives focus back', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">Mở</button>
          <Drawer onClose={() => setOpen(false)} open={open} />
        </>
      )
    }
    render(<Page />)
    const opener = screen.getByText('Mở')
    opener.focus()
    fireEvent.click(opener)
    await nextFrame()
    expect(document.activeElement).toBe(screen.getByRole('dialog'))

    screen.getByText('Cuối').focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('Đầu'))
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByText('Cuối'))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByLabelText('Ngăn chi tiết').hasAttribute('inert')).toBe(true)
    await nextFrame()
    expect(document.activeElement).toBe(opener)
  })

  it('lets only the top dialog answer Escape', async () => {
    const closeDrawer = vi.fn()
    function Page() {
      const [confirmOpen, setConfirmOpen] = useState(true)
      return <Drawer onClose={closeDrawer} open>{confirmOpen ? <Confirm onClose={() => setConfirmOpen(false)} /> : null}</Drawer>
    }
    render(<Page />)
    await nextFrame()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(closeDrawer).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeDrawer).toHaveBeenCalledTimes(1)
  })

  it('closes an open select list first and keeps the dialog open', async () => {
    const closeDrawer = vi.fn()
    render(
      <Drawer onClose={closeDrawer} open>
        <CustomSelect label="Vai trò" onChange={() => undefined} options={[{ label: 'Xem', value: 'viewer' }, { label: 'Quản trị', value: 'admin' }]} value="viewer" />
      </Drawer>,
    )
    await nextFrame()
    fireEvent.click(screen.getByRole('button', { name: /Vai trò/ }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(closeDrawer).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeDrawer).toHaveBeenCalledTimes(1)
  })
})
