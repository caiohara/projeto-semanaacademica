import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { AcoesDaInscricao } from './AcoesDaInscricao.jsx'
import { rotuloDoStatus } from './statusDaInscricao.js'

function doisDigitos(n) {
  return String(n).padStart(2, '0')
}

function formatarRestante(ms) {
  const total = Math.floor(ms / 1000)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  return `${doisDigitos(horas)}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`
}

function ContagemRegressiva({ ate }) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const restante = new Date(ate).getTime() - agora
  if (restante <= 0) return <p>Prazo encerrado</p>
  return <p>Tempo para confirmar: {formatarRestante(restante)}</p>
}

export function MinhasInscricoes({ usuarioId }) {
  const [inscricoes, setInscricoes] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false

    chamarApi('/inscricoes', { usuarioId })
      .then((lista) => {
        if (!cancelado) setInscricoes(lista)
      })
      .catch((e) => {
        if (!cancelado) setErro(e)
      })

    return () => {
      cancelado = true
    }
  }, [usuarioId])

  function substituir(nova) {
    setInscricoes((lista) => lista.map((i) => (i.id === nova.id ? nova : i)))
  }

  if (erro) return <p role="alert">Não foi possível carregar suas inscrições.</p>
  if (!inscricoes) return <p>Carregando…</p>

  return (
    <section>
      <h1>Minhas inscrições</h1>
      {inscricoes.length === 0 ? (
        <p>Nenhuma inscrição ainda.</p>
      ) : (
        <ul>
          {inscricoes.map((inscricao) => (
            <li key={inscricao.id}>
              <p>Atividade {inscricao.atividadeId}</p>
              <p>Situação: {rotuloDoStatus(inscricao.status)}</p>
              {inscricao.status === 'em_espera' && <p>Posição {inscricao.posicaoNaEspera} na fila</p>}
              {inscricao.status === 'convocada' && <ContagemRegressiva ate={inscricao.convocadaAte} />}
              <AcoesDaInscricao inscricao={inscricao} usuarioId={usuarioId} aoAtualizar={substituir} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
