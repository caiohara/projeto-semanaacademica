import { useState } from 'react'
import { DetalheAtividade } from './modulos/m1-grade/DetalheAtividade.jsx'
import { FormularioAtividade } from './modulos/m1-grade/FormularioAtividade.jsx'
import { ProgramacaoPorDia } from './modulos/m1-grade/ProgramacaoPorDia.jsx'
import { MinhasInscricoes } from './modulos/m2-inscricoes/MinhasInscricoes.jsx'
import { InscricaoNaAtividade } from './modulos/m2-inscricoes/InscricaoNaAtividade.jsx'

const USUARIOS = [
  { id: 'p-carla', papel: 'participante', nome: 'Carla Mendes Souza' },
  { id: 'org-ana', papel: 'organizacao', nome: 'Ana Beatriz Lima' },
]

function App() {
  const [usuarioId, setUsuarioId] = useState(USUARIOS[0].id)
  const [atividadeSelecionadaId, setAtividadeSelecionadaId] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarMinhasInscricoes, setMostrarMinhasInscricoes] = useState(false)
  const [versaoDoDetalhe, setVersaoDoDetalhe] = useState(0)

  const usuario = USUARIOS.find((u) => u.id === usuarioId)

  function irParaProgramacao() {
    setAtividadeSelecionadaId(null)
    setMostrarFormulario(false)
    setMostrarMinhasInscricoes(false)
  }

  const secaoAtual = mostrarFormulario ? 'nova' : mostrarMinhasInscricoes ? 'minhas' : 'programacao'

  function classeDoItem(secao) {
    return secao === secaoAtual
      ? 'rounded-lg bg-primaria-clara px-3.5 py-2 text-sm font-semibold text-primaria'
      : 'rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
  }

  return (
    <div className="min-h-screen bg-fundo font-sans text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-xl bg-primaria text-sm font-extrabold tracking-tight text-white shadow-sm shadow-primaria/30"
            >
              SA
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight">Semana Acadêmica</span>
              <span className="block text-xs text-gray-500">19 a 23 de outubro de 2026</span>
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              type="button"
              onClick={irParaProgramacao}
              aria-current={secaoAtual === 'programacao' ? 'page' : undefined}
              className={classeDoItem('programacao')}
            >
              Programação
            </button>
            {usuario.papel === 'participante' && (
              <button
                type="button"
                onClick={() => {
                  irParaProgramacao()
                  setMostrarMinhasInscricoes(true)
                }}
                aria-current={secaoAtual === 'minhas' ? 'page' : undefined}
                className={classeDoItem('minhas')}
              >
                Minhas inscrições
              </button>
            )}
            {usuario.papel === 'organizacao' && (
              <button
                type="button"
                onClick={() => setMostrarFormulario(true)}
                aria-current={secaoAtual === 'nova' ? 'page' : undefined}
                className={classeDoItem('nova')}
              >
                Nova atividade
              </button>
            )}
          </nav>

          <label className="ml-auto flex items-center gap-2 text-sm font-medium text-gray-500">
            Usuário
            <select
              value={usuarioId}
              onChange={(e) => {
                setUsuarioId(e.target.value)
                irParaProgramacao()
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/20"
            >
              {USUARIOS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {mostrarFormulario && (
          <FormularioAtividade
            usuarioId={usuarioId}
            onCriada={() => {
              setMostrarFormulario(false)
            }}
          />
        )}

        {!mostrarFormulario && mostrarMinhasInscricoes && <MinhasInscricoes usuarioId={usuarioId} />}

        {!mostrarFormulario && !mostrarMinhasInscricoes && atividadeSelecionadaId && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setAtividadeSelecionadaId(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-primaria"
            >
              <span aria-hidden="true">←</span>
              Voltar para a programação
            </button>
            <div
              className={
                usuario.papel === 'participante' ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]' : ''
              }
            >
              <DetalheAtividade
                key={versaoDoDetalhe}
                atividadeId={atividadeSelecionadaId}
                usuarioId={usuarioId}
              />
              {usuario.papel === 'participante' && (
                <InscricaoNaAtividade
                  atividadeId={atividadeSelecionadaId}
                  usuarioId={usuarioId}
                  aoMudar={() => setVersaoDoDetalhe((v) => v + 1)}
                />
              )}
            </div>
          </div>
        )}

        {!mostrarFormulario && !mostrarMinhasInscricoes && !atividadeSelecionadaId && (
          <ProgramacaoPorDia usuarioId={usuarioId} onSelecionarAtividade={setAtividadeSelecionadaId} />
        )}
      </main>
    </div>
  )
}

export default App
