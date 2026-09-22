import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { dadosInvalidos, ErroDaApi } from '../../erros.js';
import { lerNovaAtividade } from './validacao.js';

// M1 — Grade de atividades (specs/M1-grade.md).

const novoId = (prefixo) => `${prefixo}_${randomBytes(4).toString('hex')}`;

// R10: instantes saem no fuso de Brasília, -03:00 (sem horário de verão em 2026).
// R11: a fração de segundo volta como veio; trocar de fuso não mexe nela.
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
function emBrasilia(ms, original) {
  const fracao = original.match(/:\d{2}(\.\d+)/)?.[1] ?? '';
  return `${new Date(ms - TRES_HORAS_MS).toISOString().slice(0, 19)}${fracao}-03:00`;
}

export function rotasDaGrade({ db }) {
  const rotas = Router();

  // R1: a ordem é a dos dados iniciais, que é a ordem de inserção.
  rotas.get('/salas', (req, res) => {
    res.json(db.prepare('SELECT id, nome, capacidade FROM salas ORDER BY rowid').all());
  });

  rotas.post('/atividades', (req, res) => {
    const { titulo, tipo, salaId, vagas, encontros } = lerNovaAtividade(req.body);
    // R14: sala inexistente é dado inválido do corpo, não 404.
    if (!db.prepare('SELECT 1 FROM salas WHERE id = ?').get(salaId)) {
      throw dadosInvalidos(`a sala ${salaId} não existe`);
    }
    const id = novoId('atv');
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO atividades (id, titulo, tipo, sala_id, vagas) VALUES (?, ?, ?, ?, ?)')
        .run(id, titulo, tipo, salaId, vagas);
      const encontro = db.prepare(
        'INSERT INTO encontros (id, atividade_id, inicio, fim, inicio_ms, fim_ms) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const e of encontros) {
        encontro.run(novoId('enc'), id, e.inicio, e.fim, e.inicioMs, e.fimMs);
      }
      db.exec('COMMIT');
    } catch (erro) {
      db.exec('ROLLBACK');
      throw erro;
    }
    res.status(201).json(lerAtividade(db, id));
  });

  rotas.get('/atividades/:id', (req, res) => {
    res.json(lerAtividade(db, req.params.id));
  });

  return rotas;
}

function lerAtividade(db, id) {
  const a = db.prepare('SELECT id, titulo, tipo, sala_id, vagas FROM atividades WHERE id = ?').get(id);
  if (!a) throw new ErroDaApi(404, 'NAO_ENCONTRADO', `atividade ${id} não existe`);
  // R5: encontros sempre em ordem de inicio.
  const encontros = db.prepare(
    'SELECT id, inicio, fim, inicio_ms, fim_ms FROM encontros WHERE atividade_id = ? ORDER BY inicio_ms, id',
  ).all(id);
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo,
    salaId: a.sala_id,
    vagas: a.vagas,
    encontros: encontros.map((e) => ({
      id: e.id,
      inicio: emBrasilia(e.inicio_ms, e.inicio),
      fim: emBrasilia(e.fim_ms, e.fim),
    })),
    // R6: soma exata em minutos; pode ter fração quando os instantes têm segundos.
    cargaHorariaMinutos: encontros.reduce((soma, e) => soma + (e.fim_ms - e.inicio_ms), 0) / 60000,
    // Fatia 1: sem relógio (R7) nem inscrições do M2 (R8), a atividade nasce prevista e vazia.
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: a.vagas,
    emEspera: 0,
  };
}
