import { useState } from 'react'
import { DetalheAtividade } from './modulos/m1-grade/DetalheAtividade.jsx'
import { FormularioAtividade } from './modulos/m1-grade/FormularioAtividade.jsx'
import { ProgramacaoPorDia } from './modulos/m1-grade/ProgramacaoPorDia.jsx'
import { InscricaoNaAtividade } from './modulos/m2-inscricoes/InscricaoNaAtividade.jsx'

const USUARIOS = [
  { id: 'p-carla', papel: 'participante', nome: 'Carla Mendes Souza' },
  { id: 'org-ana', papel: 'organizacao', nome: 'Ana Beatriz Lima' },
]

function App() {
  const [usuarioId, setUsuarioId] = useState(USUARIOS[0].id)
  const [atividadeSelecionadaId, setAtividadeSelecionadaId] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const usuario = USUARIOS.find((u) => u.id === usuarioId)

  function irParaProgramacao() {
    setAtividadeSelecionadaId(null)
    setMostrarFormulario(false)
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

      {!mostrarFormulario && atividadeSelecionadaId && (
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

      {!mostrarFormulario && !atividadeSelecionadaId && (
        <ProgramacaoPorDia usuarioId={usuarioId} onSelecionarAtividade={setAtividadeSelecionadaId} />
      )}
    </>
  )
}

export default App
