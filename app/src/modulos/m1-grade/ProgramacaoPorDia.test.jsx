import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { ProgramacaoPorDia } from './ProgramacaoPorDia.jsx'

function atividade(sobrepor = {}) {
  return {
    id: 'atv_11111111',
    titulo: 'IA hoje',
    tipo: 'palestra',
    salaId: 'sala-101',
    vagas: 40,
    encontros: [{ id: 'enc_11111111', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
    cargaHorariaMinutos: 120,
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: 40,
    emEspera: 0,
    ...sobrepor,
  }
}

describe('ProgramacaoPorDia', () => {
  it('lista as atividades do dia inicial do evento', async () => {
    servidor.use(
      http.get('/atividades', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('dia')).toBe('2026-10-19')
        return HttpResponse.json([atividade()])
      }),
    )

    render(<ProgramacaoPorDia usuarioId="p-carla" />)

    expect(await screen.findByText('IA hoje')).toBeInTheDocument()
  })

  it('mostra mensagem quando não há atividades no dia', async () => {
    servidor.use(http.get('/atividades', () => HttpResponse.json([])))

    render(<ProgramacaoPorDia usuarioId="p-carla" />)

    expect(await screen.findByText(/nenhuma atividade/i)).toBeInTheDocument()
  })

  it('filtra por tipo ao escolher no seletor', async () => {
    let ultimoTipo = null
    servidor.use(
      http.get('/atividades', ({ request }) => {
        const url = new URL(request.url)
        ultimoTipo = url.searchParams.get('tipo')
        return HttpResponse.json(
          ultimoTipo === 'minicurso' ? [atividade({ id: 'atv_22222222', titulo: 'Flutter do zero', tipo: 'minicurso' })] : [atividade()],
        )
      }),
    )

    render(<ProgramacaoPorDia usuarioId="p-carla" />)
    await screen.findByText('IA hoje')

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'minicurso')

    expect(await screen.findByText('Flutter do zero')).toBeInTheDocument()
    expect(ultimoTipo).toBe('minicurso')
  })

  it('navega para o próximo dia e desabilita o botão no último dia', async () => {
    const dias = []
    servidor.use(
      http.get('/atividades', ({ request }) => {
        const url = new URL(request.url)
        dias.push(url.searchParams.get('dia'))
        return HttpResponse.json([])
      }),
    )

    render(<ProgramacaoPorDia usuarioId="p-carla" />)
    await screen.findByText(/nenhuma atividade/i)

    const proximo = screen.getByRole('button', { name: /próximo dia/i })
    const anterior = screen.getByRole('button', { name: /dia anterior/i })

    expect(anterior).toBeDisabled()

    await userEvent.click(proximo)
    await userEvent.click(proximo)
    await userEvent.click(proximo)
    await userEvent.click(proximo)

    await waitFor(() => expect(proximo).toBeDisabled())
    expect(dias.at(-1)).toBe('2026-10-23')
  })

  it('chama onSelecionarAtividade ao clicar em uma atividade', async () => {
    servidor.use(http.get('/atividades', () => HttpResponse.json([atividade()])))

    let selecionada = null
    render(<ProgramacaoPorDia usuarioId="p-carla" onSelecionarAtividade={(id) => (selecionada = id)} />)

    const item = await screen.findByRole('button', { name: /ia hoje/i })
    await userEvent.click(item)

    expect(selecionada).toBe('atv_11111111')
  })
})
