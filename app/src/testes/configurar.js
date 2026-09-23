import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { servidor } from './servidor.js'

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  servidor.resetHandlers()
  cleanup()
})
afterAll(() => servidor.close())
