import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../../testes/servidor.js'
import { FormularioAtividade } from './FormularioAtividade.jsx'

const SALAS = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
]

function preencherPalestraValida() {
  return async () => {
    await userEvent.type(screen.getByLabelText(/título/i), 'IA hoje')
    await userEvent.selectOptions(screen.getByLabelText(/^tipo$/i), 'palestra')
    await userEvent.selectOptions(screen.getByLabelText(/sala/i), 'sala-101')
    await userEvent.clear(screen.getByLabelText(/vagas/i))
    await userEvent.type(screen.getByLabelText(/vagas/i), '40')
    await userEvent.type(screen.getByLabelText(/início do encontro 1/i), '2026-10-19T19:00')
    await userEvent.type(screen.getByLabelText(/fim do encontro 1/i), '2026-10-19T21:00')
  }
}

describe('FormularioAtividade', () => {
  it('carrega as salas e cria a atividade com sucesso', async () => {
    servidor.use(
      http.get('/salas', () => HttpResponse.json(SALAS)),
      http.post('/atividades', async ({ request }) => {
        expect(request.headers.get('X-Usuario')).toBe('org-ana')
        const corpo = await request.json()
        expect(corpo).toEqual({
          titulo: 'IA hoje',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 40,
          encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
        })
        return HttpResponse.json({ id: 'atv_11111111', ...corpo }, { status: 201 })
      }),
    )

    let criada = null
    render(<FormularioAtividade usuarioId="org-ana" onCriada={(a) => (criada = a)} />)

    await screen.findByRole('option', { name: 'Sala 101' })
    await preencherPalestraValida()()

    await userEvent.click(screen.getByRole('button', { name: /criar atividade/i }))

    await waitFor(() => expect(criada).not.toBeNull())
    expect(criada.id).toBe('atv_11111111')
  })

  it('mostra o código de erro devolvido pela API em conflito de sala', async () => {
    servidor.use(
      http.get('/salas', () => HttpResponse.json(SALAS)),
      http.post('/atividades', () =>
        HttpResponse.json({ erro: 'CONFLITO_DE_SALA', mensagem: 'sala ocupada' }, { status: 409 }),
      ),
    )

    render(<FormularioAtividade usuarioId="org-ana" />)

    await screen.findByRole('option', { name: 'Sala 101' })
    await preencherPalestraValida()()
    await userEvent.click(screen.getByRole('button', { name: /criar atividade/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('CONFLITO_DE_SALA')
  })

  it('mostra o código de erro em encontro inválido', async () => {
    servidor.use(
      http.get('/salas', () => HttpResponse.json(SALAS)),
      http.post('/atividades', () =>
        HttpResponse.json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'duração inválida' }, { status: 422 }),
      ),
    )

    render(<FormularioAtividade usuarioId="org-ana" />)

    await screen.findByRole('option', { name: 'Sala 101' })
    await preencherPalestraValida()()
    await userEvent.click(screen.getByRole('button', { name: /criar atividade/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ENCONTRO_INVALIDO')
  })

  it('adiciona um novo par de campos de encontro', async () => {
    servidor.use(http.get('/salas', () => HttpResponse.json(SALAS)))

    render(<FormularioAtividade usuarioId="org-ana" />)
    await screen.findByRole('option', { name: 'Sala 101' })

    expect(screen.queryByLabelText(/início do encontro 2/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /adicionar encontro/i }))

    expect(screen.getByLabelText(/início do encontro 2/i)).toBeInTheDocument()
  })
})
