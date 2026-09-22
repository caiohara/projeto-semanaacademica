// M1 — Grade de atividades (specs/M1-grade.md). Tudo pela costura HTTP do contrato.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';

describe('M1 — grade de atividades', () => {
  let api;
  before(async () => { api = await subirApi(); });
  after(async () => { await api?.parar(); });
  beforeEach(async () => {
    const res = await fetch(`${api.url}/_teste/reset`, { method: 'POST' });
    assert.equal(res.status, 204);
  });

  const pedir = async (metodo, rota, { usuario = 'org-ana', corpo } = {}) => {
    const headers = { 'X-Usuario': usuario };
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${api.url}${rota}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await res.text();
    return { status: res.status, corpo: texto ? JSON.parse(texto) : undefined };
  };

  it('R1: GET /salas devolve as salas na ordem dos dados iniciais', async () => {
    const res = await pedir('GET', '/salas', { usuario: 'p-carla' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, [
      { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
      { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
      { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
      { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 },
    ]);
  });

  it('R5: encontros enviados fora de ordem são aceitos e saem ordenados por inicio', async () => {
    const res = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'Flutter do zero',
        tipo: 'minicurso',
        salaId: 'lab-3',
        vagas: 20,
        encontros: [
          { inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T22:00:00-03:00' },
          { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
        ],
      },
    });
    assert.equal(res.status, 201);
    assert.match(res.corpo.id, /^atv_[0-9a-f]{8}$/);
    assert.equal(res.corpo.encontros.length, 2);
    assert.equal(Date.parse(res.corpo.encontros[0].inicio), Date.parse('2026-10-19T19:00:00-03:00'));
    assert.equal(Date.parse(res.corpo.encontros[0].fim), Date.parse('2026-10-19T22:00:00-03:00'));
    assert.equal(Date.parse(res.corpo.encontros[1].inicio), Date.parse('2026-10-20T19:00:00-03:00'));
    assert.equal(Date.parse(res.corpo.encontros[1].fim), Date.parse('2026-10-20T22:00:00-03:00'));
    for (const encontro of res.corpo.encontros) assert.match(encontro.id, /^enc_[0-9a-f]{8}$/);
    assert.notEqual(res.corpo.encontros[0].id, res.corpo.encontros[1].id);
  });
});
