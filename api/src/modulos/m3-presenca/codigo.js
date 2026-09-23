import { createHmac } from 'node:crypto';

// Código do encontro (specs/M3-presenca.md, R6–R9).

// R6: maiúsculas e dígitos, sem 0, O, 1, I, L.
export const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// R9: o segredo vem de SEGREDO_CODIGO; sem ela, este valor fixo. É lido uma vez, quando o
// processo sobe, então POST /_teste/reset não o troca.
export const SEGREDO_PADRAO = 'semana-academica-2026-codigo-do-encontro';
const SEGREDO = process.env.SEGREDO_CODIGO ?? SEGREDO_PADRAO;

// R7: minutos contados a partir do epoch Unix, alinhados ao relógio (segundos 00–59).
export const indiceDoMinuto = (instanteMs) => Math.floor(instanteMs / 60000);

// R7: HMAC de encontroId + índice do minuto, convertido para o alfabeto da R6.
// Derivado a cada pedido, nunca gravado.
export function derivarCodigo(encontroId, indice, segredo = SEGREDO) {
  const hmac = createHmac('sha256', segredo).update(`${encontroId}:${indice}`).digest();
  let codigo = '';
  for (let i = 0; i < 6; i++) codigo += ALFABETO[hmac[i] % ALFABETO.length];
  return codigo;
}
