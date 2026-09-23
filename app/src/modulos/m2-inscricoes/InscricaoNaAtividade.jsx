import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { AcoesDaInscricao } from './AcoesDaInscricao.jsx'
import { SeloStatus } from './SeloStatus.jsx'
import { estaAtiva } from './statusDaInscricao.js'

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

  const cartao = 'space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-24'

  if (carregando) return <p className={`${cartao} animate-pulse text-sm text-gray-400`}>Carregando inscrição…</p>

  return (
    <section className={cartao}>
      <h2 className="text-lg font-semibold text-gray-900">Inscrição</h2>
      {inscricao ? (
        <>
          <p className="flex items-center justify-between gap-2 text-sm text-gray-500">
            Situação: <SeloStatus status={inscricao.status} />
          </p>
          {inscricao.status === 'em_espera' && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
              Posição {inscricao.posicaoNaEspera} na fila
            </p>
          )}
          <AcoesDaInscricao inscricao={inscricao} usuarioId={usuarioId} aoAtualizar={atualizada} />
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">Garanta sua vaga nesta atividade.</p>
          <button
            type="button"
            disabled={enviando}
            onClick={inscrever}
            className="w-full rounded-xl bg-primaria px-4 py-3 text-base font-semibold text-white shadow-md shadow-primaria/30 transition hover:bg-primaria-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:cursor-wait disabled:opacity-60"
          >
            Inscrever-se
          </button>
        </>
      )}
      {erro && !inscricao && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {erro.message}
        </p>
      )}
    </section>
  )
}
