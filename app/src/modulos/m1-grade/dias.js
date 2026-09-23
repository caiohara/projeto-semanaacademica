// Semana Acadêmica: 19 a 23/10/2026 (spec M1 §1).
export const DIAS_DO_EVENTO = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']

export function formatarDia(dia) {
  const [ano, mes, diaDoMes] = dia.split('-')
  return `${diaDoMes}/${mes}/${ano}`
}
