import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';

const INSTANTE_DO_RESET = Date.parse('2026-10-13T09:00:00-03:00');

describe('modo de teste (contrato, seção 3)', () => {
  let api;
  before(async () => { api = await subirApi(); });
  after(async () => { await api?.parar(); });

  const reset = () => fetch(`${api.url}/_teste/reset`, { method: 'POST' });
  const lerRelogio = () => fetch(`${api.url}/_teste/relogio`);
  const ajustarRelogio = (corpo) => fetch(`${api.url}/_teste/relogio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });

  it('POST /_teste/reset responde 204 sem corpo', async () => {
    const res = await reset();
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
  });

  it('depois do reset o relógio marca 2026-10-13T09:00:00-03:00', async () => {
    await reset();
    const res = await lerRelogio();
    assert.equal(res.status, 200);
    const corpo = await res.json();
    assert.deepEqual(Object.keys(corpo), ['agora']);
    assert.equal(Date.parse(corpo.agora), INSTANTE_DO_RESET);
  });

  it('PUT /_teste/relogio ajusta o relógio, responde o instante e ele fica parado', async () => {
    await reset();
    const res = await ajustarRelogio({ agora: '2026-10-19T19:05:00-03:00' });
    assert.equal(res.status, 200);
    const corpo = await res.json();
    assert.deepEqual(Object.keys(corpo), ['agora']);
    assert.equal(Date.parse(corpo.agora), Date.parse('2026-10-19T22:05:00Z'));

    await new Promise((resolve) => setTimeout(resolve, 20));
    const lido = await (await lerRelogio()).json();
    assert.equal(Date.parse(lido.agora), Date.parse('2026-10-19T22:05:00Z'));
  });

  it('POST /_teste/reset devolve o relógio a 2026-10-13T09:00:00-03:00 depois de um PUT', async () => {
    await reset();
    await ajustarRelogio({ agora: '2026-10-22T10:00:00-03:00' });
    await reset();
    const lido = await (await lerRelogio()).json();
    assert.equal(Date.parse(lido.agora), INSTANTE_DO_RESET);
  });

  for (const [caso, corpo] of [
    ['corpo que não é JSON', '{agora:'],
    ['sem o campo agora', {}],
    ['agora que não é texto', { agora: 1760000000000 }],
    ['agora que não é uma data', { agora: 'amanhã cedo' }],
  ]) {
    it(`PUT /_teste/relogio com ${caso} responde 422 DADOS_INVALIDOS e não mexe no relógio`, async () => {
      await reset();
      const res = await ajustarRelogio(corpo);
      assert.equal(res.status, 422);
      const erro = await res.json();
      assert.equal(erro.erro, 'DADOS_INVALIDOS');
      assert.equal(typeof erro.mensagem, 'string');

      const lido = await (await lerRelogio()).json();
      assert.equal(Date.parse(lido.agora), INSTANTE_DO_RESET);
    });
  }
});

describe('sem MODO_TESTE (contrato, seção 3)', () => {
  let api;
  before(async () => { api = await subirApi({ modoTeste: false }); });
  after(async () => { await api?.parar(); });

  for (const [metodo, rota] of [
    ['POST', '/_teste/reset'],
    ['GET', '/_teste/relogio'],
    ['PUT', '/_teste/relogio'],
  ]) {
    it(`${metodo} ${rota} responde 404 NAO_ENCONTRADO`, async () => {
      const res = await fetch(`${api.url}${rota}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: metodo === 'PUT' ? JSON.stringify({ agora: '2026-10-19T19:00:00-03:00' }) : undefined,
      });
      assert.equal(res.status, 404);
      assert.equal((await res.json()).erro, 'NAO_ENCONTRADO');
    });
  }
});
