import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { servidor } from './testes/servidor.js'

const atividade = {
  id: 'atv_1a2b3c4d',
  titulo: 'Flutter do zero',
  tipo: 'minicurso',
  salaId: 'lab-3',
  vagas: 20,
  encontros: [{ id: 'enc_11111111', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
  cargaHorariaMinutos: 180,
  situacao: 'prevista',
  ocupadas: 12,
  vagasRestantes: 8,
  emEspera: 0,
}

const inscricao = {
  id: 'ins_9c0d1e2f',
  atividadeId: 'atv_1a2b3c4d',
  participanteId: 'p-carla',
  status: 'confirmada',
  posicaoNaEspera: null,
  convocadaAte: null,
  criadaEm: '2026-10-13T09:00:00-03:00',
}

function api() {
  servidor.use(
    http.get('/atividades', () => HttpResponse.json([atividade])),
    http.get('/atividades/atv_1a2b3c4d', () => HttpResponse.json(atividade)),
    http.get('/inscricoes', ({ request }) => {
      const filtro = new URL(request.url).searchParams.get('atividadeId')
      return HttpResponse.json(!filtro || filtro === inscricao.atividadeId ? [inscricao] : [])
    }),
  )
}

describe('App — M2', () => {
  it('participante abre o detalhe de uma atividade e vê a inscrição', async () => {
    api()

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: /flutter do zero/i }))

    expect(await screen.findByRole('heading', { name: 'Flutter do zero' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /cancelar inscrição/i })).toBeInTheDocument()
  })

  it('participante abre Minhas inscrições pela navegação', async () => {
    api()

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /minhas inscrições/i }))

    expect(await screen.findByRole('heading', { name: /minhas inscrições/i })).toBeInTheDocument()
    expect(await screen.findByText(/atv_1a2b3c4d/)).toBeInTheDocument()
  })

  it('organização não vê a inscrição nem Minhas inscrições', async () => {
    api()

    render(<App />)
    await userEvent.selectOptions(screen.getByLabelText(/usuário/i), 'org-ana')

    expect(screen.queryByRole('button', { name: /minhas inscrições/i })).not.toBeInTheDocument()
  })
})
