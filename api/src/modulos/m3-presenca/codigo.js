import { createHmac } from 'node:crypto';

// Código do encontro (specs/M3-presenca.md, R6–R9).

// R6: maiúsculas e dígitos, sem 0, O, 1, I, L.
export const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const SEGREDO = 'semana-academica-2026-codigo-do-encontro';

// R7: minutos contados a partir do epoch Unix, alinhados ao relógio (segundos 00–59).
export const indiceDoMinuto = (instanteMs) => Math.floor(instanteMs / 60000);

// R7: HMAC de encontroId + índice do minuto, convertido para o alfabeto da R6.
// Derivado a cada pedido, nunca gravado.
export function derivarCodigo(encontroId, indice) {
  const hmac = createHmac('sha256', SEGREDO).update(`${encontroId}:${indice}`).digest();
  let codigo = '';
  for (let i = 0; i < 6; i++) codigo += ALFABETO[hmac[i] % ALFABETO.length];
  return codigo;
}
