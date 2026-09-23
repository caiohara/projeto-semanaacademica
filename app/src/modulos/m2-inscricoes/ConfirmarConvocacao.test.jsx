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
    participanteId: 'p-diego',
    status: 'convocada',
    posicaoNaEspera: null,
    convocadaAte: '2026-10-19T12:00:00-03:00',
    criadaEm: '2026-10-13T09:00:00-03:00',
    ...sobrepor,
  }
}

describe('AcoesDaInscricao — confirmar convocação', () => {
  it('oferece o botão de confirmar quando o status é convocada', () => {
    render(<AcoesDaInscricao inscricao={inscricao()} usuarioId="p-diego" />)

    expect(screen.getByRole('button', { name: /confirmar convocação/i })).toBeInTheDocument()
  })

  it.each(['confirmada', 'em_espera', 'cancelada', 'expirada'])(
    'não oferece confirmar quando o status é %s',
    (status) => {
      render(
        <AcoesDaInscricao
          inscricao={inscricao({ status, convocadaAte: null })}
          usuarioId="p-diego"
        />,
      )

      expect(screen.queryByRole('button', { name: /confirmar convocação/i })).not.toBeInTheDocument()
    },
  )

  it('chama POST /inscricoes/:id/confirmacao com o X-Usuario e devolve a inscrição atualizada', async () => {
    let usuarioRecebido
    const confirmada = inscricao({ status: 'confirmada', convocadaAte: null })
    servidor.use(
      http.post('/inscricoes/ins_9c0d1e2f/confirmacao', ({ request }) => {
        usuarioRecebido = request.headers.get('X-Usuario')
        return HttpResponse.json(confirmada)
      }),
    )
    const aoAtualizar = vi.fn()

    render(
      <AcoesDaInscricao inscricao={inscricao()} usuarioId="p-diego" aoAtualizar={aoAtualizar} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /confirmar convocação/i }))

    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(confirmada))
    expect(usuarioRecebido).toBe('p-diego')
  })

  it.each([
    ['CONVOCACAO_EXPIRADA', 'O prazo para confirmar acabou.'],
    ['CONFLITO_DE_HORARIO', 'Você já tem outra atividade nesse horário.'],
  ])('mostra o erro %s da API e mantém o botão disponível', async (codigo, mensagem) => {
    servidor.use(
      http.post('/inscricoes/ins_9c0d1e2f/confirmacao', () =>
        HttpResponse.json({ erro: codigo, mensagem }, { status: codigo === 'CONFLITO_DE_HORARIO' ? 409 : 422 }),
      ),
    )
    const aoAtualizar = vi.fn()

    render(
      <AcoesDaInscricao inscricao={inscricao()} usuarioId="p-diego" aoAtualizar={aoAtualizar} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /confirmar convocação/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
    expect(aoAtualizar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirmar convocação/i })).toBeEnabled()
  })
})
