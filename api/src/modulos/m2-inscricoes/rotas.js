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
    const atividade = db.prepare('SELECT id, cancelada, tipo, vagas FROM atividades WHERE id = ?').get(req.params.id);
    if (!atividade) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `atividade ${req.params.id} não existe`);

    // R8: ATIVIDADE_CANCELADA (R4) vem antes de JA_INSCRITO (R3).
    if (atividade.cancelada) throw new ErroDaApi(422, 'ATIVIDADE_CANCELADA', 'a atividade está cancelada');

    // R5: a 30 minutos ou menos do início do 1º encontro, as inscrições encerram.
    const primeiroEncontro = db.prepare(
      'SELECT inicio_ms FROM encontros WHERE atividade_id = ? ORDER BY inicio_ms, id LIMIT 1',
    ).get(req.params.id);
    if (relogio.agora().getTime() >= primeiroEncontro.inicio_ms - 30 * 60 * 1000) {
      throw new ErroDaApi(422, 'INSCRICOES_ENCERRADAS', 'as inscrições para esta atividade já encerraram');
    }

    // R3: uma inscrição ativa (confirmada, em_espera ou convocada) bloqueia nova inscrição.
    const jaInscrito = db.prepare(
      "SELECT id FROM inscricoes WHERE atividade_id = ? AND participante_id = ? AND status IN ('confirmada', 'em_espera', 'convocada')",
    ).get(req.params.id, req.usuario.id);
    if (jaInscrito) throw new ErroDaApi(409, 'JA_INSCRITO', 'já existe uma inscrição ativa nesta atividade');

    // R6: sobreposição de horário com um encontro de outra atividade em que o participante
    // tem inscrição confirmada ou convocada (em_espera não conta).
    const encontrosDaAtividade = db.prepare(
      'SELECT inicio_ms, fim_ms FROM encontros WHERE atividade_id = ?',
    ).all(req.params.id);
    const encontrosConflitantes = db.prepare(
      `SELECT e.inicio_ms AS inicioMs, e.fim_ms AS fimMs
       FROM inscricoes i
       JOIN encontros e ON e.atividade_id = i.atividade_id
       WHERE i.participante_id = ? AND i.atividade_id != ? AND i.status IN ('confirmada', 'convocada')`,
    ).all(req.usuario.id, req.params.id);
    const sobrepoe = (a, b) => a.inicio_ms < b.fimMs && b.inicioMs < a.fim_ms;
    if (encontrosDaAtividade.some((novo) => encontrosConflitantes.some((outro) => sobrepoe(novo, outro)))) {
      throw new ErroDaApi(409, 'CONFLITO_DE_HORARIO', 'conflito de horário com outra inscrição ativa');
    }

    // R7: contando esta como confirmada, no máximo 3 minicursos confirmados/convocados.
    if (atividade.tipo === 'minicurso') {
      const { total } = db.prepare(
        `SELECT COUNT(*) AS total
         FROM inscricoes i
         JOIN atividades a ON a.id = i.atividade_id
         WHERE i.participante_id = ? AND a.tipo = 'minicurso' AND i.status IN ('confirmada', 'convocada')`,
      ).get(req.usuario.id);
      if (total + 1 > 3) {
        throw new ErroDaApi(422, 'LIMITE_DE_MINICURSOS', 'limite de 3 minicursos confirmados atingido');
      }
    }

    // R2: sem vaga, a inscrição nasce em_espera (posicaoNaEspera fica para a fatia da fila).
    const { ocupadas } = db.prepare(
      "SELECT COUNT(*) AS ocupadas FROM inscricoes WHERE atividade_id = ? AND status IN ('confirmada', 'convocada')",
    ).get(req.params.id);
    const status = ocupadas < atividade.vagas ? 'confirmada' : 'em_espera';

    const agora = relogio.agora();
    const id = novoId();
    db.prepare(
      'INSERT INTO inscricoes (id, atividade_id, participante_id, status, criada_em, criada_em_ms) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, req.params.id, req.usuario.id, status, agora.toISOString(), agora.getTime());

    res.status(201).json(lerInscricao(db, id));
  });

  // R22: organização vê todas; participante só as próprias. Ordem: criadaEm, empate por id.
  rotas.get('/inscricoes', (req, res) => {
    const { atividadeId } = req.query;
    const linhas = req.usuario.papel === 'organizacao'
      ? (atividadeId === undefined
        ? db.prepare('SELECT id FROM inscricoes ORDER BY criada_em_ms, id').all()
        : db.prepare('SELECT id FROM inscricoes WHERE atividade_id = ? ORDER BY criada_em_ms, id').all(atividadeId))
      : (atividadeId === undefined
        ? db.prepare('SELECT id FROM inscricoes WHERE participante_id = ? ORDER BY criada_em_ms, id').all(req.usuario.id)
        : db.prepare(
          'SELECT id FROM inscricoes WHERE participante_id = ? AND atividade_id = ? ORDER BY criada_em_ms, id',
        ).all(req.usuario.id, atividadeId));
    res.json(linhas.map(({ id }) => lerInscricao(db, id)));
  });

  // R23: organização vê qualquer inscrição; participante só a própria.
  rotas.get('/inscricoes/:id', (req, res) => {
    const inscricao = db.prepare('SELECT id, participante_id FROM inscricoes WHERE id = ?').get(req.params.id);
    const visivel = inscricao
      && (req.usuario.papel === 'organizacao' || inscricao.participante_id === req.usuario.id);
    if (!visivel) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `inscrição ${req.params.id} não existe`);
    res.json(lerInscricao(db, req.params.id));
  });

  // R12 (parcial nesta fatia; convocação R14 fica para a próxima fatia):
  // cancelar muda o status para cancelada.
  rotas.post('/inscricoes/:id/cancelamento', somenteParticipante, (req, res) => {
    const inscricao = db.prepare('SELECT id, participante_id, atividade_id, status FROM inscricoes WHERE id = ?').get(req.params.id);
    if (!inscricao || inscricao.participante_id !== req.usuario.id) {
      throw new ErroDaApi(404, 'NAO_ENCONTRADO', `inscrição ${req.params.id} não existe`);
    }

    // R11: ATIVIDADE_JA_INICIADA (R9) vence INSCRICAO_INATIVA (R10) quando as duas valem.
    // R9: a atividade já iniciada (relógio no início do 1º encontro ou depois) impede o cancelamento.
    const primeiroEncontro = db.prepare(
      'SELECT inicio_ms FROM encontros WHERE atividade_id = ? ORDER BY inicio_ms, id LIMIT 1',
    ).get(inscricao.atividade_id);
    if (relogio.agora().getTime() >= primeiroEncontro.inicio_ms) {
      throw new ErroDaApi(422, 'ATIVIDADE_JA_INICIADA', 'a atividade já começou');
    }

    // R10: uma inscrição já cancelada ou expirada não pode ser cancelada de novo.
    if (inscricao.status === 'cancelada' || inscricao.status === 'expirada') {
      throw new ErroDaApi(422, 'INSCRICAO_INATIVA', 'a inscrição já não está ativa');
    }

    db.prepare("UPDATE inscricoes SET status = 'cancelada' WHERE id = ?").run(req.params.id);
    res.json(lerInscricao(db, req.params.id));
  });

  return rotas;
}

// R24: posicaoNaEspera é recalculada a cada leitura, 1-indexada, só entre em_espera
// da mesma atividade, ordenadas por criadaEm (empate por id).
function posicaoNaEspera(db, i) {
  if (i.status !== 'em_espera') return null;
  const fila = db.prepare(
    "SELECT id FROM inscricoes WHERE atividade_id = ? AND status = 'em_espera' ORDER BY criada_em_ms, id",
  ).all(i.atividade_id);
  return fila.findIndex((linha) => linha.id === i.id) + 1;
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
    posicaoNaEspera: posicaoNaEspera(db, i),
    convocadaAte: i.convocada_ate,
    criadaEm: emBrasilia(i.criada_em_ms),
  };
}
