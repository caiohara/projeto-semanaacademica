import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { somenteOrganizacao, somenteParticipante } from '../../autenticacao.js';
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

// R10: vale o código do minuto do instante de referência ou o do minuto anterior.
// R11: o recebido só é convertido para maiúsculas; qualquer outro desvio não casa.
const codigoAceito = (encontroId, recebido, referenciaMs) => {
  const codigo = recebido.toUpperCase();
  const indice = indiceDoMinuto(referenciaMs);
  return codigo === derivarCodigo(encontroId, indice) || codigo === derivarCodigo(encontroId, indice - 1);
};

const novoId = () => `pre_${randomBytes(4).toString('hex')}`;

const comoPresenca = (p) => ({
  id: p.id,
  encontroId: p.encontro_id,
  participanteId: p.participante_id,
  origem: p.origem,
  lidoEm: p.lido_em,
  registradaEm: p.registrada_em,
  justificativa: p.justificativa,
});

export function rotasDaPresenca({ db, relogio }) {
  const rotas = Router();

  // R13/R14: inscrição confirmada em atividade não cancelada — o cancelamento da atividade
  // (M1) cancela as inscrições, mas o status só é recalculado na leitura (M2 R25).
  const confirmado = (atividadeId, participanteId) => Boolean(db.prepare(
    "SELECT 1 FROM inscricoes i JOIN atividades a ON a.id = i.atividade_id WHERE i.atividade_id = ? AND i.participante_id = ? AND i.status = 'confirmada' AND a.cancelada = 0",
  ).get(atividadeId, participanteId));

  const gravar = (presenca, lidoEmMs) => db.prepare(
    'INSERT INTO presencas (id, encontro_id, participante_id, origem, lido_em, lido_em_ms, registrada_em, justificativa) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(presenca.id, presenca.encontro_id, presenca.participante_id, presenca.origem, presenca.lido_em,
    lidoEmMs, presenca.registrada_em, presenca.justificativa);

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

  rotas.post('/encontros/:id/presencas', somenteParticipante, (req, res) => {
    const corpo = req.body ?? {};
    // R20
    const desconhecido = Object.keys(corpo).find((campo) => !CAMPOS_DO_QR.includes(campo));
    if (desconhecido) throw dadosInvalidos(`campo desconhecido: ${desconhecido}`);
    if (typeof corpo.codigo !== 'string') throw dadosInvalidos('codigo é obrigatório e precisa ser texto');
    // R20: lidoEm é opcional, mas null não equivale a ausente.
    if ('lidoEm' in corpo) lerInstante(corpo.lidoEm, 'lidoEm');

    const encontro = db.prepare('SELECT id, atividade_id, inicio_ms, fim_ms FROM encontros WHERE id = ?').get(req.params.id);
    if (!encontro) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `encontro ${req.params.id} não existe`);

    if (!('lidoEm' in corpo)) {
      // R24: presença já gravada volta 200, sem alteração; vem antes de NAO_INSCRITO (R28).
      const existente = db.prepare(
        'SELECT id, encontro_id, participante_id, origem, lido_em, registrada_em, justificativa FROM presencas WHERE encontro_id = ? AND participante_id = ?',
      ).get(encontro.id, req.usuario.id);
      if (existente) return res.json(comoPresenca(existente));
      // R13: só inscrição confirmada na atividade dona do encontro; vem antes da janela (R28).
      if (!confirmado(encontro.atividade_id, req.usuario.id)) {
        throw new ErroDaApi(403, 'NAO_INSCRITO', 'sem inscrição confirmada na atividade');
      }
      const agoraMs = relogio.agora().getTime();
      // R4: sem lidoEm, a janela é conferida com o relógio; vem antes do código (R28).
      if (!dentroDaJanela(encontro, agoraMs)) {
        throw new ErroDaApi(422, 'FORA_DA_JANELA', 'fora da janela de presença do encontro');
      }
      // R10: sem lidoEm, o instante de referência é o relógio.
      if (!codigoAceito(encontro.id, corpo.codigo, agoraMs)) {
        throw new ErroDaApi(422, 'CODIGO_INVALIDO', 'código inválido ou expirado');
      }
      // R25: QR online grava origem qr, lidoEm = registradaEm = relógio.
      const presenca = {
        id: novoId(),
        encontro_id: encontro.id,
        participante_id: req.usuario.id,
        origem: 'qr',
        lido_em: emBrasilia(agoraMs),
        registrada_em: emBrasilia(agoraMs),
        justificativa: null,
      };
      gravar(presenca, agoraMs);
      return res.status(201).json(comoPresenca(presenca));
    }

    // R18: lidoEm no futuro é dado inválido; vem logo depois do 404 (R28), antes da repetição.
    const agoraMs = relogio.agora().getTime();
    const lidoEmMs = Date.parse(corpo.lidoEm);
    if (lidoEmMs > agoraMs) throw dadosInvalidos('lidoEm não pode ser posterior ao relógio');

    // R24: presença já gravada volta 200, sem alteração; vem antes de NAO_INSCRITO (R28).
    const existente = db.prepare(
      'SELECT id, encontro_id, participante_id, origem, lido_em, registrada_em, justificativa FROM presencas WHERE encontro_id = ? AND participante_id = ?',
    ).get(encontro.id, req.usuario.id);
    if (existente) return res.json(comoPresenca(existente));

    // R13/R14: só inscrição confirmada na atividade dona do encontro; vem antes da janela (R28).
    if (!confirmado(encontro.atividade_id, req.usuario.id)) {
      throw new ErroDaApi(403, 'NAO_INSCRITO', 'sem inscrição confirmada na atividade');
    }

    // R17: com o relógio, aceito até fim + 2 h, inclusive. Vem antes da janela (R28).
    if (agoraMs > encontro.fim_ms + 2 * 60 * MINUTO_MS) {
      throw new ErroDaApi(422, 'SINCRONIZACAO_TARDIA', 'leitura offline enviada depois de fim + 2 h');
    }

    // R16/R2: a janela de presença é conferida com lidoEm, não com o relógio.
    if (!dentroDaJanela(encontro, lidoEmMs)) {
      throw new ErroDaApi(422, 'FORA_DA_JANELA', 'lidoEm fora da janela de presença do encontro');
    }

    // R16/R10: o código é conferido com lidoEm.
    if (!codigoAceito(encontro.id, corpo.codigo, lidoEmMs)) {
      throw new ErroDaApi(422, 'CODIGO_INVALIDO', 'código inválido ou expirado');
    }

    // R16/R25: com lidoEm é sempre qr_offline; lidoEm é o enviado, registradaEm é o relógio.
    const presenca = {
      id: novoId(),
      encontro_id: encontro.id,
      participante_id: req.usuario.id,
      origem: 'qr_offline',
      lido_em: corpo.lidoEm,
      registrada_em: emBrasilia(agoraMs),
      justificativa: null,
    };
    gravar(presenca, lidoEmMs);
    res.status(201).json(comoPresenca(presenca));
  });

  rotas.post('/encontros/:id/presencas/manual', somenteOrganizacao, (req, res) => {
    const corpo = req.body ?? {};
    const encontro = db.prepare('SELECT id, atividade_id, inicio_ms, fim_ms FROM encontros WHERE id = ?').get(req.params.id);
    if (!encontro) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `encontro ${req.params.id} não existe`);

    const agoraMs = relogio.agora().getTime();
    // R25: manual grava origem manual, lidoEm = registradaEm = relógio, justificativa como veio.
    const presenca = {
      id: novoId(),
      encontro_id: encontro.id,
      participante_id: corpo.participanteId,
      origem: 'manual',
      lido_em: emBrasilia(agoraMs),
      registrada_em: emBrasilia(agoraMs),
      justificativa: corpo.justificativa,
    };
    gravar(presenca, agoraMs);
    res.status(201).json(comoPresenca(presenca));
  });

  // R26: só quem tem presença registrada no encontro.
  rotas.get('/encontros/:id/presencas', somenteOrganizacao, (req, res) => {
    const encontro = db.prepare('SELECT id FROM encontros WHERE id = ?').get(req.params.id);
    if (!encontro) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `encontro ${req.params.id} não existe`);
    const presencas = db.prepare(
      'SELECT id, encontro_id, participante_id, origem, lido_em, registrada_em, justificativa FROM presencas WHERE encontro_id = ?',
    ).all(req.params.id);
    res.json(presencas.map(comoPresenca));
  });

  return rotas;
}
