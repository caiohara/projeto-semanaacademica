import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { InscricaoNaAtividade } from './InscricaoNaAtividade.jsx'

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

function minhasInscricoes(lista) {
  return http.get('/inscricoes', ({ request }) => {
    const url = new URL(request.url)
    const filtro = url.searchParams.get('atividadeId')
    return HttpResponse.json(lista.filter((i) => !filtro || i.atividadeId === filtro))
  })
}

function renderizar(props = {}) {
  return render(<InscricaoNaAtividade atividadeId="atv_1a2b3c4d" usuarioId="p-carla" {...props} />)
}

describe('InscricaoNaAtividade', () => {
  it('sem inscrição ativa, oferece inscrever-se e não oferece cancelar', async () => {
    servidor.use(minhasInscricoes([inscricao({ status: 'cancelada' })]))

    renderizar()

    expect(await screen.findByRole('button', { name: /inscrever-se/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancelar inscrição/i })).not.toBeInTheDocument()
  })

  it('inscreve com POST /atividades/:id/inscricoes e passa a mostrar a inscrição com o botão de cancelar', async () => {
    let usuarioRecebido
    servidor.use(
      minhasInscricoes([]),
      http.post('/atividades/atv_1a2b3c4d/inscricoes', ({ request }) => {
        usuarioRecebido = request.headers.get('X-Usuario')
        return HttpResponse.json(inscricao(), { status: 201 })
      }),
    )
    const aoMudar = vi.fn()

    renderizar({ aoMudar })
    await userEvent.click(await screen.findByRole('button', { name: /inscrever-se/i }))

    expect(await screen.findByText(/confirmada/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar inscrição/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /inscrever-se/i })).not.toBeInTheDocument()
    expect(usuarioRecebido).toBe('p-carla')
    expect(aoMudar).toHaveBeenCalled()
  })

  it('mostra a posição na espera quando a inscrição nasce em espera', async () => {
    servidor.use(
      minhasInscricoes([]),
      http.post('/atividades/atv_1a2b3c4d/inscricoes', () =>
        HttpResponse.json(inscricao({ status: 'em_espera', posicaoNaEspera: 2 }), { status: 201 }),
      ),
    )

    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: /inscrever-se/i }))

    expect(await screen.findByText(/em espera/i)).toBeInTheDocument()
    expect(screen.getByText(/posição 2/i)).toBeInTheDocument()
  })

  it('mostra o erro da API quando a inscrição é recusada e mantém o botão de inscrever-se', async () => {
    servidor.use(
      minhasInscricoes([]),
      http.post('/atividades/atv_1a2b3c4d/inscricoes', () =>
        HttpResponse.json(
          { erro: 'CONFLITO_DE_HORARIO', mensagem: 'Você já tem atividade nesse horário.' },
          { status: 409 },
        ),
      ),
    )

    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: /inscrever-se/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já tem atividade nesse horário.')
    expect(screen.getByRole('button', { name: /inscrever-se/i })).toBeEnabled()
  })

  it('com inscrição ativa carregada, mostra o status e cancela com POST /inscricoes/:id/cancelamento', async () => {
    servidor.use(
      minhasInscricoes([inscricao({ status: 'cancelada', id: 'ins_00000000' }), inscricao()]),
      http.post('/inscricoes/ins_9c0d1e2f/cancelamento', () =>
        HttpResponse.json(inscricao({ status: 'cancelada' })),
      ),
    )
    const aoMudar = vi.fn()

    renderizar({ aoMudar })
    await userEvent.click(await screen.findByRole('button', { name: /cancelar inscrição/i }))

    expect(await screen.findByRole('button', { name: /inscrever-se/i })).toBeInTheDocument()
    expect(aoMudar).toHaveBeenCalled()
  })

  it('mostra o erro da API quando o cancelamento é recusado', async () => {
    servidor.use(
      minhasInscricoes([inscricao()]),
      http.post('/inscricoes/ins_9c0d1e2f/cancelamento', () =>
        HttpResponse.json(
          { erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'A atividade já começou.' },
          { status: 422 },
        ),
      ),
    )

    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: /cancelar inscrição/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A atividade já começou.')
  })

  it('mostra o botão de confirmar quando a inscrição está convocada', async () => {
    servidor.use(
      minhasInscricoes([inscricao({ status: 'convocada', convocadaAte: '2026-10-19T12:00:00-03:00' })]),
    )

    renderizar()

    expect(await screen.findByRole('button', { name: /confirmar convocação/i })).toBeInTheDocument()
  })
})
