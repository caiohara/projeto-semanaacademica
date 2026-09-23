import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { AcoesDaInscricao } from './AcoesDaInscricao.jsx'
import { SeloStatus } from './SeloStatus.jsx'

const BORDA_DO_STATUS = {
  confirmada: 'border-l-green-500',
  em_espera: 'border-l-amber-400',
  convocada: 'border-l-primaria',
  cancelada: 'border-l-gray-300',
  expirada: 'border-l-red-400',
}

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
  if (restante <= 0)
    return (
      <p className="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-600">Prazo encerrado</p>
    )
  return (
    <p className="flex flex-col items-center gap-1 rounded-xl bg-primaria-clara px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-primaria ring-1 ring-primaria/20">
      Tempo para confirmar:{' '}
      <span className="font-mono text-3xl font-bold normal-case tracking-normal text-primaria-escura tabular-nums">
        {formatarRestante(restante)}
      </span>
    </p>
  )
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

  if (erro)
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        Não foi possível carregar suas inscrições.
      </p>
    )
  if (!inscricoes) return <p className="animate-pulse text-gray-400">Carregando…</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Minhas inscrições</h1>
        <p className="mt-1 text-sm text-gray-500">Acompanhe a situação de cada atividade em que você se inscreveu.</p>
      </div>
      {inscricoes.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
          Nenhuma inscrição ainda.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {inscricoes.map((inscricao) => (
            <li
              key={inscricao.id}
              className={`flex flex-col gap-4 rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-gray-200 ${
                BORDA_DO_STATUS[inscricao.status] ?? 'border-l-gray-300'
              } ${inscricao.status === 'convocada' ? 'shadow-md ring-primaria/30' : ''} ${
                ['cancelada', 'expirada'].includes(inscricao.status) ? 'opacity-75' : ''
              }`}
            >
              <div className="space-y-2">
                <p className="font-mono text-sm font-semibold text-gray-900">Atividade {inscricao.atividadeId}</p>
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  Situação: <SeloStatus status={inscricao.status} />
                </p>
              </div>
              {inscricao.status === 'em_espera' && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                  Posição {inscricao.posicaoNaEspera} na fila
                </p>
              )}
              {inscricao.status === 'convocada' && <ContagemRegressiva ate={inscricao.convocadaAte} />}
              <div className="mt-auto">
                <AcoesDaInscricao inscricao={inscricao} usuarioId={usuarioId} aoAtualizar={substituir} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
