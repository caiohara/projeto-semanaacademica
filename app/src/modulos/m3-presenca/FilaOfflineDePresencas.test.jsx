import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { TelaLeituraPresenca } from './TelaLeituraPresenca.jsx'

function definirOnLine(valor) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: valor })
}

beforeEach(async () => {
  await new Promise((resolve) => {
    const requisicao = indexedDB.deleteDatabase('semana-academica-presencas')
    requisicao.onsuccess = resolve
    requisicao.onerror = resolve
    requisicao.onblocked = resolve
  })
})

afterEach(() => {
  definirOnLine(true)
})

describe('Fila offline de presenças', () => {
  it('guarda a leitura no IndexedDB quando está offline e mostra quantas estão pendentes', async () => {
    definirOnLine(false)

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByText(/1 leitura pendente/i)).toBeInTheDocument()
  })

  it('envia tudo que está na fila quando o evento online dispara', async () => {
    definirOnLine(false)

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await screen.findByText(/1 leitura pendente/i)

    let corpoRecebido = null
    servidor.use(
      http.post('/encontros/enc_11111111/presencas', async ({ request }) => {
        corpoRecebido = await request.json()
        return HttpResponse.json(
          {
            id: 'pre_11111111',
            encontroId: 'enc_11111111',
            participanteId: 'p-carla',
            origem: 'qr_offline',
            lidoEm: corpoRecebido.lidoEm,
            registradaEm: '2026-10-19T21:00:00-03:00',
            justificativa: null,
          },
          { status: 201 },
        )
      }),
    )

    definirOnLine(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(screen.queryByText(/pendente/i)).not.toBeInTheDocument())
    expect(corpoRecebido.codigo).toBe('K7M2QX')
    expect(typeof corpoRecebido.lidoEm).toBe('string')
  })

  it('mantém a leitura na fila se o reenvio falhar de novo', async () => {
    definirOnLine(false)
    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)
    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await screen.findByText(/1 leitura pendente/i)

    servidor.use(
      http.post('/encontros/enc_11111111/presencas', () =>
        HttpResponse.json({ erro: 'CODIGO_INVALIDO', mensagem: 'expirado' }, { status: 422 }),
      ),
    )

    definirOnLine(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    expect(await screen.findByText(/1 leitura pendente/i)).toBeInTheDocument()
  })
})
