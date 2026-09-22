import { Router } from 'express';

// M1 — Grade de atividades (specs/M1-grade.md).
export function rotasDaGrade({ db }) {
  const rotas = Router();

  // R1: a ordem é a dos dados iniciais, que é a ordem de inserção.
  rotas.get('/salas', (req, res) => {
    res.json(db.prepare('SELECT id, nome, capacidade FROM salas ORDER BY rowid').all());
  });

  return rotas;
}
