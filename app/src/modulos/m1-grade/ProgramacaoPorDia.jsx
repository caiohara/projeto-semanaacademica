import { useEffect, useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { DIAS_DO_EVENTO, formatarDia } from './dias.js'
import { BarraDeVagas, SeloSituacao, SeloTipo } from './Selos.jsx'

const FUSO = 'America/Sao_Paulo'
const formatadorDeHora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: FUSO })
const formatadorDeDiaIso = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: FUSO })
const formatadorDeDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: FUSO })

function diaDaSemana(dia) {
  return formatadorDeDiaDaSemana.format(new Date(`${dia}T12:00:00-03:00`))
}

function horarioNoDia(atividade, dia) {
  const encontro =
    atividade.encontros?.find((e) => formatadorDeDiaIso.format(new Date(e.inicio)) === dia) ??
    atividade.encontros?.[0]
  if (!encontro) return null
  return `${formatadorDeHora.format(new Date(encontro.inicio))} – ${formatadorDeHora.format(new Date(encontro.fim))}`
}

const BOTAO_DO_DIA =
  'inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

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
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Programação</h1>
          <p className="mt-1 text-sm text-gray-500">Palestras e minicursos de cada dia do evento.</p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/20"
          >
            <option value="">Todos</option>
            <option value="palestra">Palestra</option>
            <option value="minicurso">Minicurso</option>
          </select>
        </label>
      </div>

      <div
        role="group"
        aria-label="Navegação por dia"
        className="flex items-center justify-between gap-4 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200"
      >
        <button type="button" onClick={() => setIndiceDoDia((i) => i - 1)} disabled={indiceDoDia === 0} className={BOTAO_DO_DIA}>
          <span aria-hidden="true">‹</span>
          Dia anterior
        </button>
        <div className="text-center">
          <span className="block text-xs font-medium uppercase tracking-wider text-gray-400">
            Dia {indiceDoDia + 1} de {DIAS_DO_EVENTO.length}
          </span>
          <span className="block text-lg font-bold capitalize text-gray-900">
            {diaDaSemana(dia)}, <span className="text-primaria">{formatarDia(dia)}</span>
          </span>
          <span aria-hidden="true" className="mt-1.5 flex justify-center gap-1">
            {DIAS_DO_EVENTO.map((d, i) => (
              <span key={d} className={`h-1.5 rounded-full transition-all ${i === indiceDoDia ? 'w-5 bg-primaria' : 'w-1.5 bg-gray-300'}`} />
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIndiceDoDia((i) => i + 1)}
          disabled={indiceDoDia === DIAS_DO_EVENTO.length - 1}
          className={BOTAO_DO_DIA}
        >
          Próximo dia
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {erro && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          Não foi possível carregar a programação.
        </p>
      )}

      {!atividades && !erro && (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl bg-white ring-1 ring-gray-200" />
          ))}
        </div>
      )}

      {atividades && atividades.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
          Nenhuma atividade neste dia.
        </p>
      )}

      {atividades && atividades.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {atividades.map((atividade) => (
            <li key={atividade.id}>
              <button
                type="button"
                onClick={() => onSelecionarAtividade?.(atividade.id)}
                className="group flex h-full w-full flex-col gap-3 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primaria/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              >
                <span className="flex items-center justify-between gap-2">
                  <SeloTipo tipo={atividade.tipo} />
                  <SeloSituacao situacao={atividade.situacao} />
                </span>
                <strong className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-primaria">
                  {atividade.titulo}
                </strong>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                  {horarioNoDia(atividade, dia) && <span className="font-medium text-gray-700">{horarioNoDia(atividade, dia)}</span>}
                  <span>{atividade.salaId}</span>
                </span>
                {typeof atividade.vagas === 'number' && (
                  <span className="mt-auto block space-y-1.5 pt-2">
                    <span className="flex justify-between text-xs font-medium text-gray-500">
                      <span>
                        {atividade.ocupadas}/{atividade.vagas} vagas
                      </span>
                      {atividade.emEspera > 0 && <span className="text-amber-600">{atividade.emEspera} em espera</span>}
                    </span>
                    <BarraDeVagas vagas={atividade.vagas} ocupadas={atividade.ocupadas} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
