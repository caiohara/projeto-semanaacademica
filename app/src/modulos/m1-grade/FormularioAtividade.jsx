import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'

function paraInstanteDeBrasilia(datetimeLocal) {
  return datetimeLocal ? `${datetimeLocal}:00-03:00` : ''
}

const ENCONTRO_VAZIO = { inicio: '', fim: '' }

export function FormularioAtividade({ usuarioId, onCriada }) {
  const [salas, setSalas] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('palestra')
  const [salaId, setSalaId] = useState('')
  const [vagas, setVagas] = useState('')
  const [encontros, setEncontros] = useState([ENCONTRO_VAZIO])
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    chamarApi('/salas', { usuarioId }).then(setSalas)
  }, [usuarioId])

  useEffect(() => {
    if (salas && !salaId) setSalaId(salas[0]?.id ?? '')
  }, [salas, salaId])

  function alterarEncontro(indice, campo, valor) {
    setEncontros((atual) => atual.map((e, i) => (i === indice ? { ...e, [campo]: valor } : e)))
  }

  function adicionarEncontro() {
    setEncontros((atual) => [...atual, ENCONTRO_VAZIO])
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      const atividade = await chamarApi('/atividades', {
        metodo: 'POST',
        usuarioId,
        corpo: {
          titulo,
          tipo,
          salaId,
          vagas: Number(vagas),
          encontros: encontros.map((e) => ({
            inicio: paraInstanteDeBrasilia(e.inicio),
            fim: paraInstanteDeBrasilia(e.fim),
          })),
        },
      })
      onCriada?.(atividade)
      setTitulo('')
      setVagas('')
      setEncontros([ENCONTRO_VAZIO])
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      <h1>Nova atividade</h1>

      <label>
        Título
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
      </label>

      <label>
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="palestra">Palestra</option>
          <option value="minicurso">Minicurso</option>
        </select>
      </label>

      <label>
        Sala
        <select value={salaId} onChange={(e) => setSalaId(e.target.value)}>
          {salas?.map((sala) => (
            <option key={sala.id} value={sala.id}>
              {sala.nome}
            </option>
          ))}
        </select>
      </label>

      <label>
        Vagas
        <input type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} required />
      </label>

      <fieldset>
        <legend>Encontros</legend>
        {encontros.map((encontro, indice) => (
          <div key={indice}>
            <label>
              {`Início do encontro ${indice + 1}`}
              <input
                type="datetime-local"
                value={encontro.inicio}
                onChange={(e) => alterarEncontro(indice, 'inicio', e.target.value)}
                required
              />
            </label>
            <label>
              {`Fim do encontro ${indice + 1}`}
              <input
                type="datetime-local"
                value={encontro.fim}
                onChange={(e) => alterarEncontro(indice, 'fim', e.target.value)}
                required
              />
            </label>
          </div>
        ))}
        <button type="button" onClick={adicionarEncontro}>
          Adicionar encontro
        </button>
      </fieldset>

      {erro && (
        <p role="alert">
          {erro instanceof ErroApi ? `${erro.codigo}: ${erro.mensagem}` : 'Não foi possível criar a atividade.'}
        </p>
      )}

      <button type="submit" disabled={enviando}>
        Criar atividade
      </button>
    </form>
  )
}
