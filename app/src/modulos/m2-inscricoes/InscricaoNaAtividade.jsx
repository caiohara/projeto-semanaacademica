import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { AcoesDaInscricao } from './AcoesDaInscricao.jsx'
import { estaAtiva, rotuloDoStatus } from './statusDaInscricao.js'

export function InscricaoNaAtividade({ atividadeId, usuarioId, aoMudar }) {
  const [carregando, setCarregando] = useState(true)
  const [inscricao, setInscricao] = useState(null)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelado = false

    chamarApi(`/inscricoes?atividadeId=${encodeURIComponent(atividadeId)}`, { usuarioId })
      .then((lista) => {
        if (cancelado) return
        setInscricao(lista.find(estaAtiva) ?? null)
        setCarregando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setErro(e)
        setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [atividadeId, usuarioId])

  async function inscrever() {
    setErro(null)
    setEnviando(true)
    try {
      const criada = await chamarApi(`/atividades/${atividadeId}/inscricoes`, {
        metodo: 'POST',
        usuarioId,
      })
      setInscricao(criada)
      aoMudar?.()
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  function atualizada(nova) {
    setInscricao(estaAtiva(nova) ? nova : null)
    aoMudar?.()
  }

  if (carregando) return <p>Carregando inscrição…</p>

  return (
    <section>
      <h2>Inscrição</h2>
      {inscricao ? (
        <>
          <p>Situação: {rotuloDoStatus(inscricao.status)}</p>
          {inscricao.status === 'em_espera' && <p>Posição {inscricao.posicaoNaEspera} na fila</p>}
          <AcoesDaInscricao inscricao={inscricao} usuarioId={usuarioId} aoAtualizar={atualizada} />
        </>
      ) : (
        <button type="button" disabled={enviando} onClick={inscrever}>
          Inscrever-se
        </button>
      )}
      {erro && !inscricao && <p role="alert">{erro.message}</p>}
    </section>
  )
}
