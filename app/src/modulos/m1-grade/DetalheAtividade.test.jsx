import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { DetalheAtividade } from './DetalheAtividade.jsx'

function atividade(sobrepor = {}) {
  return {
    id: 'atv_1a2b3c4d',
    titulo: 'Flutter do zero',
    tipo: 'minicurso',
    salaId: 'lab-3',
    vagas: 20,
    encontros: [
      { id: 'enc_11111111', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
      { id: 'enc_22222222', inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T22:00:00-03:00' },
    ],
    cargaHorariaMinutos: 360,
    situacao: 'prevista',
    ocupadas: 12,
    vagasRestantes: 8,
    emEspera: 3,
    ...sobrepor,
  }
}

describe('DetalheAtividade', () => {
  it('mostra o título, a situação e as vagas da atividade', async () => {
    servidor.use(http.get('/atividades/atv_1a2b3c4d', () => HttpResponse.json(atividade())))

    render(<DetalheAtividade atividadeId="atv_1a2b3c4d" usuarioId="p-carla" />)

    expect(await screen.findByRole('heading', { name: 'Flutter do zero' })).toBeInTheDocument()
    expect(screen.getByText(/prevista/i)).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('lista os encontros com início e fim', async () => {
    servidor.use(http.get('/atividades/atv_1a2b3c4d', () => HttpResponse.json(atividade())))

    render(<DetalheAtividade atividadeId="atv_1a2b3c4d" usuarioId="p-carla" />)

    const encontros = await screen.findAllByRole('listitem')
    expect(encontros).toHaveLength(2)
  })

  it('mostra mensagem de erro quando a atividade não existe', async () => {
    servidor.use(
      http.get('/atividades/atv_inexistente', () =>
        HttpResponse.json({ erro: 'NAO_ENCONTRADO', mensagem: 'não encontrada' }, { status: 404 }),
      ),
    )

    render(<DetalheAtividade atividadeId="atv_inexistente" usuarioId="p-carla" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i)
  })
})
