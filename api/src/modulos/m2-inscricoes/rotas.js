import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { somenteParticipante } from '../../autenticacao.js';
import { ErroDaApi } from '../../erros.js';

// M2 — Inscrições e lista de espera (specs/M2-inscricoes.md).

const novoId = () => `ins_${randomBytes(4).toString('hex')}`;

// Instantes saem no fuso de Brasília, -03:00 (mesmo critério do M1 P-20 e M3).
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
const emBrasilia = (ms) => `${new Date(ms - TRES_HORAS_MS).toISOString().slice(0, 23)}-03:00`;

export function rotasDeInscricoes({ db, relogio }) {
  const rotas = Router();

  // R1: o corpo é ignorado — não há campos de entrada definidos para esta rota.
  rotas.post('/atividades/:id/inscricoes', somenteParticipante, (req, res) => {
    const atividade = db.prepare('SELECT id FROM atividades WHERE id = ?').get(req.params.id);
    if (!atividade) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `atividade ${req.params.id} não existe`);

    const agora = relogio.agora();
    const id = novoId();
    // R2: só o caso "há vaga" nesta fatia — a inscrição nasce sempre confirmada.
    db.prepare(
      'INSERT INTO inscricoes (id, atividade_id, participante_id, status, criada_em, criada_em_ms) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, req.params.id, req.usuario.id, 'confirmada', agora.toISOString(), agora.getTime());

    res.status(201).json(lerInscricao(db, id));
  });

  return rotas;
}

function lerInscricao(db, id) {
  const i = db.prepare(
    'SELECT id, atividade_id, participante_id, status, convocada_ate, criada_em_ms FROM inscricoes WHERE id = ?',
  ).get(id);
  return {
    id: i.id,
    atividadeId: i.atividade_id,
    participanteId: i.participante_id,
    status: i.status,
    // R24 (posicaoNaEspera) fica para a fatia da fila.
    posicaoNaEspera: null,
    convocadaAte: i.convocada_ate,
    criadaEm: emBrasilia(i.criada_em_ms),
  };
}
