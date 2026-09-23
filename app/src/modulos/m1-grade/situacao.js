const RÓTULOS = {
  prevista: 'Prevista',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
}

export function rotuloDaSituacao(situacao) {
  return RÓTULOS[situacao] ?? situacao
}

const RÓTULOS_TIPO = {
  palestra: 'Palestra',
  minicurso: 'Minicurso',
}

export function rotuloDoTipo(tipo) {
  return RÓTULOS_TIPO[tipo] ?? tipo
}
