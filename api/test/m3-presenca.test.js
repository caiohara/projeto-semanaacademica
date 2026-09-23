// M3 — Presença por QR (specs/M3-presenca.md). Tudo pela costura HTTP do contrato.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';

describe('M3 — presença', () => {
  let api;
  before(async () => { api = await subirApi(); });
  after(async () => { await api?.parar(); });
  beforeEach(async () => {
    const res = await fetch(`${api.url}/_teste/reset`, { method: 'POST' });
    assert.equal(res.status, 204);
  });

  const pedir = async (metodo, rota, { usuario = 'org-ana', corpo } = {}) => {
    const headers = {};
    if (usuario !== null) headers['X-Usuario'] = usuario;
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${api.url}${rota}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
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

  // Cenário base da spec, seção 6 (parte do M1): A com o encontro E e B, em outra sala,
  // com o encontro F no mesmo horário.
  const montarCenario = async () => {
    const criar = async (titulo, salaId) => {
      const res = await pedir('POST', '/atividades', {
        corpo: {
          titulo,
          tipo: 'palestra',
          salaId,
          vagas: 40,
          encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
        },
      });
      assert.equal(res.status, 201);
      return res.corpo;
    };
    const A = await criar('Atividade A', 'sala-101');
    const B = await criar('Atividade B', 'sala-102');
    return { A, E: A.encontros[0].id, B, F: B.encontros[0].id };
  };

  describe('obter código', () => {
    it('R3/R2: fora da janela de presença (inicio − 15 min até fim + 30 min, inclusiva) → 422 FORA_DA_JANELA', async () => {
      const { E } = await montarCenario();

      await relogio('2026-10-19T18:44:59.999-03:00');
      let res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');

      await relogio('2026-10-19T18:45:00-03:00');
      res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 200);
      assert.equal(res.corpo.encontroId, E);

      await relogio('2026-10-19T22:30:00-03:00');
      res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 200);
      assert.equal(res.corpo.encontroId, E);

      await relogio('2026-10-19T22:30:00.001-03:00');
      res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');
    });

    it('R6: o código tem 6 caracteres, só maiúsculas e dígitos, sem 0 O 1 I L', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');
      const res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 200);
      assert.match(res.corpo.codigo, /^[A-HJKMNP-Z2-9]{6}$/);
    });

    it('R8: trocaEm = fim do minuto do código e validoAte = fim do minuto seguinte, em -03:00', async () => {
      const { E } = await montarCenario();

      await relogio('2026-10-19T19:00:30-03:00');
      let res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 200);
      assert.equal(res.corpo.trocaEm, '2026-10-19T19:01:00-03:00');
      assert.equal(res.corpo.validoAte, '2026-10-19T19:02:00-03:00');

      await relogio('2026-10-19T19:01:00-03:00');
      res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 200);
      assert.equal(res.corpo.trocaEm, '2026-10-19T19:02:00-03:00');
      assert.equal(res.corpo.validoAte, '2026-10-19T19:03:00-03:00');
    });
  });
});
