import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { TelaCodigoEncontro } from './TelaCodigoEncontro.jsx'

describe('TelaCodigoEncontro', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T19:00:30-03:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra o código atual assim que a tela abre', async () => {
    servidor.use(
      http.get('/encontros/enc_11111111/codigo', () =>
        HttpResponse.json({
          encontroId: 'enc_11111111',
          codigo: 'K7M2QX',
          trocaEm: '2026-10-19T19:01:00-03:00',
          validoAte: '2026-10-19T19:02:00-03:00',
        }),
      ),
    )

    render(<TelaCodigoEncontro encontroId="enc_11111111" usuarioId="org-ana" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('K7M2QX')).toBeInTheDocument()
  })

  it('busca o próximo código automaticamente quando o relógio chega em trocaEm', async () => {
    let chamadas = 0
    servidor.use(
      http.get('/encontros/enc_11111111/codigo', () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({
              encontroId: 'enc_11111111',
              codigo: 'K7M2QX',
              trocaEm: '2026-10-19T19:01:00-03:00',
              validoAte: '2026-10-19T19:02:00-03:00',
            })
          : HttpResponse.json({
              encontroId: 'enc_11111111',
              codigo: 'B34XCT',
              trocaEm: '2026-10-19T19:02:00-03:00',
              validoAte: '2026-10-19T19:03:00-03:00',
            })
      }),
    )

    render(<TelaCodigoEncontro encontroId="enc_11111111" usuarioId="org-ana" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByText('K7M2QX')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(screen.getByText('B34XCT')).toBeInTheDocument()
    expect(chamadas).toBe(2)
  })

  it('mostra o erro da API, como FORA_DA_JANELA', async () => {
    servidor.use(
      http.get('/encontros/enc_11111111/codigo', () =>
        HttpResponse.json({ erro: 'FORA_DA_JANELA', mensagem: 'fora da janela' }, { status: 422 }),
      ),
    )

    render(<TelaCodigoEncontro encontroId="enc_11111111" usuarioId="org-ana" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('FORA_DA_JANELA')
  })
})
