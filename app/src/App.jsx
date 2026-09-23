import { useState } from 'react'
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

      <ProgramacaoPorDia usuarioId={usuarioId} onSelecionarAtividade={setAtividadeSelecionadaId} />

      {atividadeSelecionadaId && <p>Atividade selecionada: {atividadeSelecionadaId}</p>}
    </>
  )
}

export default App
