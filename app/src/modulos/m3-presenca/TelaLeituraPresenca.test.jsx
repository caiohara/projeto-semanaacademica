import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { TelaLeituraPresenca } from './TelaLeituraPresenca.jsx'

describe('TelaLeituraPresenca', () => {
  it('envia o código digitado e mostra mensagem de sucesso', async () => {
    let corpoRecebido = null
    servidor.use(
      http.post('/encontros/enc_11111111/presencas', async ({ request }) => {
        expect(request.headers.get('X-Usuario')).toBe('p-carla')
        corpoRecebido = await request.json()
        return HttpResponse.json(
          {
            id: 'pre_11111111',
            encontroId: 'enc_11111111',
            participanteId: 'p-carla',
            origem: 'qr',
            lidoEm: '2026-10-19T19:00:30-03:00',
            registradaEm: '2026-10-19T19:00:30-03:00',
            justificativa: null,
          },
          { status: 201 },
        )
      }),
    )

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByText(/presença registrada/i)).toBeInTheDocument()
    expect(corpoRecebido).toEqual({ codigo: 'K7M2QX' })
  })

  it('mostra FORA_DA_JANELA quando a API recusa por causa do horário', async () => {
    servidor.use(
      http.post('/encontros/enc_11111111/presencas', () =>
        HttpResponse.json({ erro: 'FORA_DA_JANELA', mensagem: 'fora da janela' }, { status: 422 }),
      ),
    )

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('FORA_DA_JANELA')
  })

  it('mostra CODIGO_INVALIDO quando o código não confere', async () => {
    servidor.use(
      http.post('/encontros/enc_11111111/presencas', () =>
        HttpResponse.json({ erro: 'CODIGO_INVALIDO', mensagem: 'código inválido' }, { status: 422 }),
      ),
    )

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-carla" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'ZZZZZZ')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('CODIGO_INVALIDO')
  })

  it('mostra NAO_INSCRITO quando o participante não está inscrito', async () => {
    servidor.use(
      http.post('/encontros/enc_11111111/presencas', () =>
        HttpResponse.json({ erro: 'NAO_INSCRITO', mensagem: 'não inscrito' }, { status: 403 }),
      ),
    )

    render(<TelaLeituraPresenca encontroId="enc_11111111" usuarioId="p-gabriela" />)

    await userEvent.type(screen.getByLabelText(/código/i), 'K7M2QX')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('NAO_INSCRITO')
  })
})
