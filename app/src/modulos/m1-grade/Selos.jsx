import { rotuloDaSituacao, rotuloDoTipo } from './situacao.js'

const CORES_DA_SITUACAO = {
  prevista: { selo: 'bg-blue-50 text-blue-700 ring-blue-600/20', ponto: 'bg-blue-500' },
  em_andamento: { selo: 'bg-green-50 text-green-700 ring-green-600/20', ponto: 'bg-green-500 animate-pulse' },
  encerrada: { selo: 'bg-gray-100 text-gray-600 ring-gray-500/20', ponto: 'bg-gray-400' },
  cancelada: { selo: 'bg-red-50 text-red-700 ring-red-600/20', ponto: 'bg-red-500' },
}

const CORES_DO_TIPO = {
  palestra: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  minicurso: 'bg-teal-50 text-teal-700 ring-teal-600/20',
}

const SELO = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'

export function SeloSituacao({ situacao }) {
  const cores = CORES_DA_SITUACAO[situacao] ?? CORES_DA_SITUACAO.encerrada
  return (
    <span className={`${SELO} ${cores.selo}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cores.ponto}`} />
      {rotuloDaSituacao(situacao)}
    </span>
  )
}

export function SeloTipo({ tipo }) {
  return <span className={`${SELO} ${CORES_DO_TIPO[tipo] ?? CORES_DO_TIPO.palestra}`}>{rotuloDoTipo(tipo)}</span>
}

// Só a barra: os números ficam a cargo de quem usa, para não repetir texto na tela.
export function BarraDeVagas({ vagas, ocupadas, className = 'h-2' }) {
  const percentual = vagas > 0 ? Math.min(100, Math.round((ocupadas / vagas) * 100)) : 0
  const cor = percentual >= 100 ? 'bg-red-500' : percentual >= 80 ? 'bg-amber-500' : 'bg-primaria'
  return (
    <span aria-hidden="true" className={`block overflow-hidden rounded-full bg-gray-100 ${className}`}>
      <span className={`block h-full rounded-full transition-all ${cor}`} style={{ width: `${percentual}%` }} />
    </span>
  )
}
