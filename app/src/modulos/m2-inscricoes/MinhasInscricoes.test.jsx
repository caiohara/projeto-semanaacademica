import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { MinhasInscricoes } from './MinhasInscricoes.jsx'

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

function listaDe(inscricoes) {
  return http.get('/inscricoes', () => HttpResponse.json(inscricoes))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MinhasInscricoes', () => {
  it('lista as inscrições do participante com o status de cada uma', async () => {
    servidor.use(
      listaDe([
        inscricao({ id: 'ins_00000001', atividadeId: 'atv_aaaaaaaa', status: 'confirmada' }),
        inscricao({ id: 'ins_00000002', atividadeId: 'atv_bbbbbbbb', status: 'cancelada' }),
      ]),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    const itens = await screen.findAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(within(itens[0]).getByText(/atv_aaaaaaaa/)).toBeInTheDocument()
    expect(within(itens[0]).getByText(/confirmada/i)).toBeInTheDocument()
    expect(within(itens[1]).getByText(/cancelada/i)).toBeInTheDocument()
  })

  it('envia o X-Usuario ao buscar as inscrições', async () => {
    let usuarioRecebido
    servidor.use(
      http.get('/inscricoes', ({ request }) => {
        usuarioRecebido = request.headers.get('X-Usuario')
        return HttpResponse.json([])
      }),
    )

    render(<MinhasInscricoes usuarioId="p-diego" />)
    await screen.findByText(/nenhuma inscrição/i)

    expect(usuarioRecebido).toBe('p-diego')
  })

  it('avisa quando o participante não tem inscrições', async () => {
    servidor.use(listaDe([]))

    render(<MinhasInscricoes usuarioId="p-carla" />)

    expect(await screen.findByText(/nenhuma inscrição/i)).toBeInTheDocument()
  })

  it('mostra a posição na espera só para inscrição em espera', async () => {
    servidor.use(
      listaDe([
        inscricao({ id: 'ins_00000001', status: 'em_espera', posicaoNaEspera: 3 }),
        inscricao({ id: 'ins_00000002', status: 'confirmada' }),
      ]),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    const itens = await screen.findAllByRole('listitem')
    expect(within(itens[0]).getByText(/posição 3/i)).toBeInTheDocument()
    expect(within(itens[1]).queryByText(/posição/i)).not.toBeInTheDocument()
  })

  it('mostra a contagem regressiva até convocadaAte e ela avança a cada segundo', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-19T10:30:00-03:00'))
    servidor.use(
      listaDe([inscricao({ status: 'convocada', convocadaAte: '2026-10-19T12:00:00-03:00' })]),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    expect(await screen.findByText(/01:30:00/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/01:29:59/)).toBeInTheDocument()
  })

  it('mostra prazo encerrado quando convocadaAte já passou', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-19T12:00:01-03:00'))
    servidor.use(
      listaDe([inscricao({ status: 'convocada', convocadaAte: '2026-10-19T12:00:00-03:00' })]),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    expect(await screen.findByText(/prazo encerrado/i)).toBeInTheDocument()
  })

  it('não mostra contagem para inscrição que não está convocada', async () => {
    servidor.use(listaDe([inscricao({ status: 'confirmada' })]))

    render(<MinhasInscricoes usuarioId="p-carla" />)

    await screen.findByText(/confirmada/i)
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).not.toBeInTheDocument()
  })

  it('oferece confirmar só na convocada e cancelar em qualquer status ativo', async () => {
    servidor.use(
      listaDe([
        inscricao({ id: 'ins_00000001', status: 'convocada', convocadaAte: '2099-01-01T00:00:00-03:00' }),
        inscricao({ id: 'ins_00000002', status: 'em_espera', posicaoNaEspera: 1 }),
        inscricao({ id: 'ins_00000003', status: 'expirada' }),
      ]),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    const itens = await screen.findAllByRole('listitem')
    expect(within(itens[0]).getByRole('button', { name: /confirmar convocação/i })).toBeInTheDocument()
    expect(within(itens[0]).getByRole('button', { name: /cancelar inscrição/i })).toBeInTheDocument()
    expect(within(itens[1]).queryByRole('button', { name: /confirmar convocação/i })).not.toBeInTheDocument()
    expect(within(itens[1]).getByRole('button', { name: /cancelar inscrição/i })).toBeInTheDocument()
    expect(within(itens[2]).queryByRole('button')).not.toBeInTheDocument()
  })

  it('atualiza a linha depois de cancelar', async () => {
    servidor.use(
      listaDe([inscricao()]),
      http.post('/inscricoes/ins_9c0d1e2f/cancelamento', () =>
        HttpResponse.json(inscricao({ status: 'cancelada' })),
      ),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)
    await userEvent.click(await screen.findByRole('button', { name: /cancelar inscrição/i }))

    expect(await screen.findByText(/cancelada/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancelar inscrição/i })).not.toBeInTheDocument()
  })

  it('mostra erro quando a lista não carrega', async () => {
    servidor.use(
      http.get('/inscricoes', () =>
        HttpResponse.json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'sem usuário' }, { status: 401 }),
      ),
    )

    render(<MinhasInscricoes usuarioId="p-carla" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i)
  })
})
