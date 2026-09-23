import { setupServer } from 'msw/node'

// Handlers ficam vazios aqui; cada teste registra os seus com servidor.use(...).
export const servidor = setupServer()
