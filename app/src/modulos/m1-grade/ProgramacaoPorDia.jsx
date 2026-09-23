import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { DIAS_DO_EVENTO, formatarDia } from './dias.js'
import { rotuloDaSituacao, rotuloDoTipo } from './situacao.js'

export function ProgramacaoPorDia({ usuarioId, onSelecionarAtividade }) {
  const [indiceDoDia, setIndiceDoDia] = useState(0)
  const [tipo, setTipo] = useState('')
  const [atividades, setAtividades] = useState(null)
  const [erro, setErro] = useState(null)

  const dia = DIAS_DO_EVENTO[indiceDoDia]

  useEffect(() => {
    let cancelado = false
    setAtividades(null)
    setErro(null)

    const parametros = new URLSearchParams({ dia })
    if (tipo) parametros.set('tipo', tipo)

    chamarApi(`/atividades?${parametros}`, { usuarioId })
      .then((dados) => {
        if (!cancelado) setAtividades(dados)
      })
      .catch((e) => {
        if (!cancelado) setErro(e)
      })

    return () => {
      cancelado = true
    }
  }, [dia, tipo, usuarioId])

  return (
    <section>
      <h1>Programação</h1>

      <div role="group" aria-label="Navegação por dia">
        <button type="button" onClick={() => setIndiceDoDia((i) => i - 1)} disabled={indiceDoDia === 0}>
          Dia anterior
        </button>
        <span>{formatarDia(dia)}</span>
        <button
          type="button"
          onClick={() => setIndiceDoDia((i) => i + 1)}
          disabled={indiceDoDia === DIAS_DO_EVENTO.length - 1}
        >
          Próximo dia
        </button>
      </div>

      <label>
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="palestra">Palestra</option>
          <option value="minicurso">Minicurso</option>
        </select>
      </label>

      {erro && <p role="alert">Não foi possível carregar a programação.</p>}

      {atividades && atividades.length === 0 && <p>Nenhuma atividade neste dia.</p>}

      {atividades && atividades.length > 0 && (
        <ul>
          {atividades.map((atividade) => (
            <li key={atividade.id}>
              <button type="button" onClick={() => onSelecionarAtividade?.(atividade.id)}>
                <strong>{atividade.titulo}</strong> — {rotuloDoTipo(atividade.tipo)} — {rotuloDaSituacao(atividade.situacao)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
