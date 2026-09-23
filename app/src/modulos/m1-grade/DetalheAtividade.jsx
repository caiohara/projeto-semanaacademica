import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { rotuloDaSituacao, rotuloDoTipo } from './situacao.js'

const formatadorDeInstante = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

function formatarInstante(iso) {
  return formatadorDeInstante.format(new Date(iso))
}

export function DetalheAtividade({ atividadeId, usuarioId }) {
  const [atividade, setAtividade] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false
    setAtividade(null)
    setErro(null)

    chamarApi(`/atividades/${atividadeId}`, { usuarioId })
      .then((dados) => {
        if (!cancelado) setAtividade(dados)
      })
      .catch((e) => {
        if (!cancelado) setErro(e)
      })

    return () => {
      cancelado = true
    }
  }, [atividadeId, usuarioId])

  if (erro) return <p role="alert">Não foi possível carregar a atividade.</p>
  if (!atividade) return <p>Carregando…</p>

  return (
    <section>
      <h1>{atividade.titulo}</h1>
      <p>
        {rotuloDoTipo(atividade.tipo)} — {rotuloDaSituacao(atividade.situacao)}
      </p>

      <dl>
        <dt>Vagas</dt>
        <dd>{atividade.vagas}</dd>
        <dt>Ocupadas</dt>
        <dd>{atividade.ocupadas}</dd>
        <dt>Em espera</dt>
        <dd>{atividade.emEspera}</dd>
        <dt>Vagas restantes</dt>
        <dd>{atividade.vagasRestantes}</dd>
        <dt>Carga horária</dt>
        <dd>{atividade.cargaHorariaMinutos} min</dd>
      </dl>

      <h2>Encontros</h2>
      <ul>
        {atividade.encontros.map((encontro) => (
          <li key={encontro.id}>
            {formatarInstante(encontro.inicio)} — {formatarInstante(encontro.fim)}
          </li>
        ))}
      </ul>
    </section>
  )
}
