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

  return (
    <>
      <header>
        <label>
          Usuário
          <select
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value)
              irParaProgramacao()
            }}
          >
            {USUARIOS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>

        <nav>
          <button type="button" onClick={irParaProgramacao}>
            Programação
          </button>
          {usuario.papel === 'participante' && (
            <button
              type="button"
              onClick={() => {
                irParaProgramacao()
                setMostrarMinhasInscricoes(true)
              }}
            >
              Minhas inscrições
            </button>
          )}
          {usuario.papel === 'organizacao' && (
            <button type="button" onClick={() => setMostrarFormulario(true)}>
              Nova atividade
            </button>
          )}
        </nav>
      </header>

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
        <>
          <button type="button" onClick={() => setAtividadeSelecionadaId(null)}>
            Voltar para a programação
          </button>
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
        </>
      )}

      {!mostrarFormulario && !mostrarMinhasInscricoes && !atividadeSelecionadaId && (
        <ProgramacaoPorDia usuarioId={usuarioId} onSelecionarAtividade={setAtividadeSelecionadaId} />
      )}
    </>
  )
}

export default App
