import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { AcoesDaInscricao } from './AcoesDaInscricao.jsx'

function inscricao(sobrepor = {}) {
  return {
    id: 'ins_9c0d1e2f',
    atividadeId: 'atv_1a2b3c4d',
    participanteId: 'p-carla',
    status: 'confirmada',
    posicaoNaEspera: null,
    convocadaAte: null,
    criadaEm: '2026-10-13T09:00:00-03:00',
    ...sobrepor,
  }
}

describe('AcoesDaInscricao — cancelar', () => {
  it.each(['confirmada', 'em_espera', 'convocada'])(
    'oferece o botão de cancelar quando o status é %s',
    (status) => {
      render(<AcoesDaInscricao inscricao={inscricao({ status })} usuarioId="p-carla" />)

      expect(screen.getByRole('button', { name: /cancelar inscrição/i })).toBeInTheDocument()
    },
  )

  it.each(['cancelada', 'expirada'])('não oferece cancelar quando o status é %s', (status) => {
    render(<AcoesDaInscricao inscricao={inscricao({ status })} usuarioId="p-carla" />)

    expect(screen.queryByRole('button', { name: /cancelar inscrição/i })).not.toBeInTheDocument()
  })

  it('chama POST /inscricoes/:id/cancelamento com o X-Usuario e devolve a inscrição atualizada', async () => {
    let usuarioRecebido
    servidor.use(
      http.post('/inscricoes/ins_9c0d1e2f/cancelamento', ({ request }) => {
        usuarioRecebido = request.headers.get('X-Usuario')
        return HttpResponse.json(inscricao({ status: 'cancelada' }))
      }),
    )
    const aoAtualizar = vi.fn()

    render(
      <AcoesDaInscricao inscricao={inscricao()} usuarioId="p-carla" aoAtualizar={aoAtualizar} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /cancelar inscrição/i }))

    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(inscricao({ status: 'cancelada' })))
    expect(usuarioRecebido).toBe('p-carla')
  })

  it('mostra a mensagem da API quando o cancelamento é recusado', async () => {
    servidor.use(
      http.post('/inscricoes/ins_9c0d1e2f/cancelamento', () =>
        HttpResponse.json(
          { erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'A atividade já começou.' },
          { status: 422 },
        ),
      ),
    )
    const aoAtualizar = vi.fn()

    render(
      <AcoesDaInscricao inscricao={inscricao()} usuarioId="p-carla" aoAtualizar={aoAtualizar} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /cancelar inscrição/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A atividade já começou.')
    expect(aoAtualizar).not.toHaveBeenCalled()
  })
})
