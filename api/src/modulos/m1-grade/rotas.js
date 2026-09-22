import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { ErroDaApi } from '../../erros.js';

// M1 — Grade de atividades (specs/M1-grade.md).

const novoId = (prefixo) => `${prefixo}_${randomBytes(4).toString('hex')}`;

export function rotasDaGrade({ db }) {
  const rotas = Router();

  // R1: a ordem é a dos dados iniciais, que é a ordem de inserção.
  rotas.get('/salas', (req, res) => {
    res.json(db.prepare('SELECT id, nome, capacidade FROM salas ORDER BY rowid').all());
  });

  rotas.post('/atividades', (req, res) => {
    const { titulo, tipo, salaId, vagas, encontros } = req.body;
    const id = novoId('atv');
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO atividades (id, titulo, tipo, sala_id, vagas) VALUES (?, ?, ?, ?, ?)')
        .run(id, titulo, tipo, salaId, vagas);
      const encontro = db.prepare(
        'INSERT INTO encontros (id, atividade_id, inicio, fim, inicio_ms, fim_ms) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const e of encontros) {
        encontro.run(novoId('enc'), id, e.inicio, e.fim, Date.parse(e.inicio), Date.parse(e.fim));
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
    'SELECT id, inicio, fim FROM encontros WHERE atividade_id = ? ORDER BY inicio_ms, id',
  ).all(id);
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo,
    salaId: a.sala_id,
    vagas: a.vagas,
    encontros: encontros.map((e) => ({ id: e.id, inicio: e.inicio, fim: e.fim })),
    // Fatia 1: sem relógio (R7) nem inscrições do M2 (R8), a atividade nasce prevista e vazia.
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: a.vagas,
    emEspera: 0,
  };
}
