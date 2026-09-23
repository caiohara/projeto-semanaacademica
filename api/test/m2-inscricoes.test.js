// M2 — Inscrições e lista de espera (specs/M2-inscricoes.md). Tudo pela costura HTTP do contrato.
// Fatia 1: inscrever sem fila (R1, R2 com vaga disponível, R3, R4, R5, R6, R7, R8,
// R22 sem posicaoNaEspera, R23).
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';

describe('M2 — inscrições', () => {
  let api;
  before(async () => { api = await subirApi(); });
  after(async () => { await api?.parar(); });
  beforeEach(async () => {
    const res = await fetch(`${api.url}/_teste/reset`, { method: 'POST' });
    assert.equal(res.status, 204);
  });

  const pedir = async (metodo, rota, { usuario = 'p-carla', corpo, corpoTexto } = {}) => {
    const headers = {};
    if (usuario !== null) headers['X-Usuario'] = usuario;
    let body;
    if (corpoTexto !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = corpoTexto;
    } else if (corpo !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(corpo);
    }
    const res = await fetch(`${api.url}${rota}`, { method: metodo, headers, body });
    const texto = await res.text();
    return { status: res.status, corpo: texto ? JSON.parse(texto) : undefined };
  };

  const relogio = async (agora) => {
    const res = await fetch(`${api.url}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora }),
    });
    assert.equal(res.status, 200);
  };

  const esperarErro = (res, status, erro) => {
    assert.equal(res.status, status);
    assert.equal(res.corpo.erro, erro);
    assert.equal(typeof res.corpo.mensagem, 'string');
  };

  // Atividade M da spec, seção 6: minicurso na lab-3, vagas: 1, 1º encontro
  // de 2026-10-19T19:00:00-03:00 a 2026-10-19T21:00:00-03:00, criado por org-ana.
  // M1 (R16) exige de 2 a 5 encontros para minicurso; o 2º encontro é só para
  // satisfazer essa regra e não participa dos cenários do M2.
  const criarAtividadeM = async (overrides = {}) => {
    const res = await pedir('POST', '/atividades', {
      usuario: 'org-ana',
      corpo: {
        titulo: 'Atividade M',
        tipo: 'minicurso',
        salaId: 'lab-3',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' },
          { inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T21:00:00-03:00' },
        ],
        ...overrides,
      },
    });
    assert.equal(res.status, 201);
    return res.corpo;
  };

  describe('inscrever sem fila (fatia 1)', () => {
    it('R1: POST /atividades/:id/inscricoes com corpo {} responde 201 (corpo ignorado)', async () => {
      const m = await criarAtividadeM();
      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego', corpo: {} });
      assert.equal(res.status, 201);
    });
  });
});
