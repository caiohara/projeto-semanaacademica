import { useState } from 'react'
import { DetalheAtividade } from './modulos/m1-grade/DetalheAtividade.jsx'
import { ProgramacaoPorDia } from './modulos/m1-grade/ProgramacaoPorDia.jsx'

const USUARIOS = [
  { id: 'p-carla', papel: 'participante', nome: 'Carla Mendes Souza' },
  { id: 'org-ana', papel: 'organizacao', nome: 'Ana Beatriz Lima' },
]

function App() {
  const [usuarioId, setUsuarioId] = useState(USUARIOS[0].id)
  const [atividadeSelecionadaId, setAtividadeSelecionadaId] = useState(null)

  return (
    <>
      <header>
        <label>
          Usuário
          <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            {USUARIOS.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </label>
      </header>

      {atividadeSelecionadaId ? (
        <>
          <button type="button" onClick={() => setAtividadeSelecionadaId(null)}>
            Voltar para a programação
          </button>
          <DetalheAtividade atividadeId={atividadeSelecionadaId} usuarioId={usuarioId} />
        </>
      ) : (
        <ProgramacaoPorDia usuarioId={usuarioId} onSelecionarAtividade={setAtividadeSelecionadaId} />
      )}
    </>
  )
}

export default App
