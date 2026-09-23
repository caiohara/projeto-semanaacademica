import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { BarraDeVagas, SeloSituacao, SeloTipo } from './Selos.jsx'

const FUSO = 'America/Sao_Paulo'
const formatadorDeData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: FUSO,
})
const formatadorDeHora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: FUSO })

function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (!horas) return `${resto} min`
  return resto ? `${horas}h${String(resto).padStart(2, '0')}` : `${horas}h`
}

function duracaoDoEncontro(encontro) {
  return Math.round((new Date(encontro.fim).getTime() - new Date(encontro.inicio).getTime()) / 60000)
}

const CARTAO = 'rounded-2xl bg-white shadow-sm ring-1 ring-gray-200'

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

  if (erro)
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        Não foi possível carregar a atividade.
      </p>
    )
  if (!atividade) return <p className={`${CARTAO} animate-pulse p-8 text-gray-400`}>Carregando…</p>

  return (
    <section className="space-y-6">
      <div className={`${CARTAO} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center gap-2">
          <SeloTipo tipo={atividade.tipo} />
          <SeloSituacao situacao={atividade.situacao} />
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{atividade.titulo}</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sala <span className="font-medium text-gray-700">{atividade.salaId}</span>
        </p>

        <div className="mt-6 space-y-2">
          <BarraDeVagas vagas={atividade.vagas} ocupadas={atividade.ocupadas} className="h-2.5" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-500">Vagas</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{atividade.vagas}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-500">Ocupadas</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{atividade.ocupadas}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-500">Em espera</dt>
            <dd className="mt-1 text-2xl font-bold text-amber-600">{atividade.emEspera}</dd>
          </div>
          <div className="rounded-xl bg-primaria-clara p-3">
            <dt className="text-xs font-medium text-primaria">Vagas restantes</dt>
            <dd className="mt-1 text-2xl font-bold text-primaria">{atividade.vagasRestantes}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-500">Carga horária</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">
              {atividade.cargaHorariaMinutos} <span className="text-sm font-medium text-gray-500">min</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className={`${CARTAO} p-6 sm:p-8`}>
        <h2 className="text-lg font-semibold text-gray-900">Encontros</h2>
        <ul className="mt-4 divide-y divide-gray-100">
          {atividade.encontros.map((encontro, indice) => (
            <li key={encontro.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primaria-clara text-sm font-bold text-primaria">
                {indice + 1}
              </span>
              <span className="flex-1">
                <span className="block font-medium capitalize text-gray-900">
                  {formatadorDeData.format(new Date(encontro.inicio))}
                </span>
                <span className="block text-sm text-gray-500">
                  {formatadorDeHora.format(new Date(encontro.inicio))} – {formatadorDeHora.format(new Date(encontro.fim))}
                </span>
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {formatarDuracao(duracaoDoEncontro(encontro))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
