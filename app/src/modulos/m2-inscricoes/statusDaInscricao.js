export const STATUS_ATIVOS = ['confirmada', 'em_espera', 'convocada']

const ROTULOS = {
  confirmada: 'Confirmada',
  em_espera: 'Em espera',
  convocada: 'Convocada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
}

export function rotuloDoStatus(status) {
  return ROTULOS[status] ?? status
}

export function estaAtiva(inscricao) {
  return STATUS_ATIVOS.includes(inscricao.status)
}
