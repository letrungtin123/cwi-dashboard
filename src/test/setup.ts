import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Tests import vitest explicitly (no globals), so Testing Library cannot clean up by itself.
afterEach(() => {
  cleanup()
})
