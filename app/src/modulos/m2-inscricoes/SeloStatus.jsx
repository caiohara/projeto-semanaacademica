import { rotuloDoStatus } from './statusDaInscricao.js'

const CORES_DO_STATUS = {
  confirmada: { selo: 'bg-green-50 text-green-700 ring-green-600/20', ponto: 'bg-green-500' },
  em_espera: { selo: 'bg-amber-50 text-amber-700 ring-amber-600/20', ponto: 'bg-amber-500' },
  convocada: { selo: 'bg-blue-50 text-blue-700 ring-blue-600/20', ponto: 'bg-primaria animate-pulse' },
  cancelada: { selo: 'bg-gray-100 text-gray-600 ring-gray-500/20', ponto: 'bg-gray-400' },
  expirada: { selo: 'bg-red-50 text-red-700 ring-red-600/20', ponto: 'bg-red-500' },
}

export function SeloStatus({ status }) {
  const cores = CORES_DO_STATUS[status] ?? CORES_DO_STATUS.cancelada
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cores.selo}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cores.ponto}`} />
      {rotuloDoStatus(status)}
    </span>
  )
}
