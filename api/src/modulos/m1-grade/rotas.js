import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { somenteOrganizacao } from '../../autenticacao.js';
import { dadosInvalidos, ErroDaApi } from '../../erros.js';
import { validarCriacao } from './regras.js';
import { lerAlteracao, lerFiltros, lerNovaAtividade } from './validacao.js';

// M1 — Grade de atividades (specs/M1-grade.md).

const novoId = (prefixo) => `${prefixo}_${randomBytes(4).toString('hex')}`;

// R10: instantes saem no fuso de Brasília, -03:00 (sem horário de verão em 2026).
// R11: a fração de segundo volta como veio; trocar de fuso não mexe nela.
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
function emBrasilia(ms, original) {
  const fracao = original.match(/:\d{2}(\.\d+)/)?.[1] ?? '';
  return `${new Date(ms - TRES_HORAS_MS).toISOString().slice(0, 19)}${fracao}-03:00`;
}

export function rotasDaGrade({ db, relogio }) {
  const rotas = Router();

  // R1: a ordem é a dos dados iniciais, que é a ordem de inserção.
  rotas.get('/salas', (req, res) => {
    res.json(db.prepare('SELECT id, nome, capacidade FROM salas ORDER BY rowid').all());
  });

  rotas.post('/atividades', somenteOrganizacao, (req, res) => {
    const nova = lerNovaAtividade(req.body);
    const { titulo, tipo, salaId, vagas, encontros } = nova;
    // R14: sala inexistente é dado inválido do corpo, não 404.
    const sala = db.prepare('SELECT capacidade FROM salas WHERE id = ?').get(salaId);
    if (!sala) throw dadosInvalidos(`a sala ${salaId} não existe`);
    // R22: atividade cancelada não ocupa a sala.
    const ocupacaoDaSala = db.prepare(
      'SELECT e.inicio_ms AS inicioMs, e.fim_ms AS fimMs FROM encontros e JOIN atividades a ON a.id = e.atividade_id WHERE a.sala_id = ? AND a.cancelada = 0',
    ).all(salaId);
    validarCriacao(nova, sala, ocupacaoDaSala);
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
    res.status(201).json(lerAtividade(db, relogio, id));
  });

  // R2: ordem pelo inicio do 1º encontro; empate pelo id.
  rotas.get('/atividades', (req, res) => {
    const ids = db.prepare(
      'SELECT a.id FROM atividades a JOIN encontros e ON e.atividade_id = a.id GROUP BY a.id ORDER BY MIN(e.inicio_ms), a.id',
    ).all();
    // R3: ?dia= (algum encontro nesse dia) e ?tipo=, combinados em E. O dia é o do
    // calendário de Brasília: o inicio já sai em -03:00 (R10), então a data é o prefixo.
    const { dia, tipo } = lerFiltros(req.query);
    const atividades = ids.map(({ id }) => lerAtividade(db, relogio, id))
      .filter((atv) => tipo === undefined || atv.tipo === tipo)
      .filter((atv) => dia === undefined || atv.encontros.some((e) => e.inicio.slice(0, 10) === dia));
    res.json(atividades);
  });

  rotas.get('/atividades/:id', (req, res) => {
    res.json(lerAtividade(db, relogio, req.params.id));
  });

  // R24: só titulo e vagas são editáveis.
  rotas.patch('/atividades/:id', somenteOrganizacao, (req, res) => {
    lerAtividade(db, relogio, req.params.id);
    const { titulo, vagas } = lerAlteracao(req.body);
    if (titulo !== undefined) db.prepare('UPDATE atividades SET titulo = ? WHERE id = ?').run(titulo, req.params.id);
    if (vagas !== undefined) db.prepare('UPDATE atividades SET vagas = ? WHERE id = ?').run(vagas, req.params.id);
    res.json(lerAtividade(db, relogio, req.params.id));
  });

  // R32: o corpo da requisição é ignorado.
  rotas.post('/atividades/:id/cancelamento', somenteOrganizacao, (req, res) => {
    const atividade = lerAtividade(db, relogio, req.params.id);
    // R31: vem antes da R30, que também se aplicaria depois do início.
    if (atividade.situacao === 'cancelada') {
      throw new ErroDaApi(422, 'ATIVIDADE_CANCELADA', 'a atividade já está cancelada');
    }
    // R30: só antes do início do 1º encontro; no instante exato já é tarde.
    if (relogio.agora().getTime() >= Date.parse(atividade.encontros[0].inicio)) {
      throw new ErroDaApi(422, 'ATIVIDADE_JA_INICIADA', 'a atividade já começou e não pode ser cancelada');
    }
    db.prepare('UPDATE atividades SET cancelada = 1 WHERE id = ?').run(req.params.id);
    res.json(lerAtividade(db, relogio, req.params.id));
  });

  return rotas;
}

// R7: calculada a cada leitura pelo relógio; as transições valem no instante exato
// e cancelada prevalece sobre todas.
function situacaoNoInstante(cancelada, encontros, agoraMs) {
  if (cancelada) return 'cancelada';
  if (agoraMs < encontros[0].inicio_ms) return 'prevista';
  if (agoraMs < encontros[encontros.length - 1].fim_ms) return 'em_andamento';
  return 'encerrada';
}

function lerAtividade(db, relogio, id) {
  const a = db.prepare('SELECT id, titulo, tipo, sala_id, vagas, cancelada FROM atividades WHERE id = ?').get(id);
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
    situacao: situacaoNoInstante(a.cancelada, encontros, relogio.agora().getTime()),
    // Sem inscrições do M2 (R8), as contagens são zeradas.
    ocupadas: 0,
    vagasRestantes: a.vagas,
    emEspera: 0,
  };
}
