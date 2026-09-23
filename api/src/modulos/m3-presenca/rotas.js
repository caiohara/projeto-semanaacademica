import { Router } from 'express';
import { somenteOrganizacao } from '../../autenticacao.js';
import { dadosInvalidos, ErroDaApi, lerInstante } from '../../erros.js';
import { derivarCodigo, indiceDoMinuto } from './codigo.js';

// M3 — Presença por QR (specs/M3-presenca.md).

const MINUTO_MS = 60 * 1000;

// Instantes saem no fuso de Brasília, -03:00 (mesma decisão do M1 P-20). Os limites do
// código caem em minuto cheio, então não há fração de segundo a preservar.
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
const emBrasilia = (ms) => `${new Date(ms - TRES_HORAS_MS).toISOString().slice(0, 19)}-03:00`;

// R2: de inicio − 15 min até fim + 30 min, os dois limites inclusivos.
const dentroDaJanela = (encontro, agoraMs) =>
  agoraMs >= encontro.inicio_ms - 15 * MINUTO_MS && agoraMs <= encontro.fim_ms + 30 * MINUTO_MS;

const CAMPOS_DO_QR = ['codigo', 'lidoEm'];

export function rotasDaPresenca({ db, relogio }) {
  const rotas = Router();

  // R27: 401 (identificar) → 403 (somenteOrganizacao) → 404 → R12 → R3.
  rotas.get('/encontros/:id/codigo', somenteOrganizacao, (req, res) => {
    const encontro = db.prepare(
      'SELECT e.id, e.inicio_ms, e.fim_ms, a.cancelada FROM encontros e JOIN atividades a ON a.id = e.atividade_id WHERE e.id = ?',
    ).get(req.params.id);
    if (!encontro) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `encontro ${req.params.id} não existe`);
    // R12
    if (encontro.cancelada) throw new ErroDaApi(422, 'ATIVIDADE_CANCELADA', 'a atividade do encontro foi cancelada');
    const agoraMs = relogio.agora().getTime();
    // R3
    if (!dentroDaJanela(encontro, agoraMs)) {
      throw new ErroDaApi(422, 'FORA_DA_JANELA', 'fora da janela de presença do encontro');
    }
    // R8: o código é o do minuto que começa em M; troca em M + 1 min e vale até M + 2 min.
    const indice = indiceDoMinuto(agoraMs);
    const inicioDoMinuto = indice * MINUTO_MS;
    res.json({
      encontroId: encontro.id,
      codigo: derivarCodigo(encontro.id, indice),
      trocaEm: emBrasilia(inicioDoMinuto + MINUTO_MS),
      validoAte: emBrasilia(inicioDoMinuto + 2 * MINUTO_MS),
    });
  });

  rotas.post('/encontros/:id/presencas', (req, res, next) => {
    const corpo = req.body ?? {};
    // R20
    const desconhecido = Object.keys(corpo).find((campo) => !CAMPOS_DO_QR.includes(campo));
    if (desconhecido) throw dadosInvalidos(`campo desconhecido: ${desconhecido}`);
    if (typeof corpo.codigo !== 'string') throw dadosInvalidos('codigo é obrigatório e precisa ser texto');
    // R20: lidoEm é opcional, mas null não equivale a ausente.
    if ('lidoEm' in corpo) lerInstante(corpo.lidoEm, 'lidoEm');
    next();
  });

  return rotas;
}
