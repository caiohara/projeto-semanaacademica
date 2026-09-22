// Identificação por X-Usuario (contrato-api.md §1 e §6). Vale para toda rota, menos /_teste/*.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';

const palestraValida = () => ({
  titulo: 'IA hoje',
  tipo: 'palestra',
  salaId: 'sala-101',
  vagas: 40,
  encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
});

// Rotas identificadas que já existem; o :id não precisa existir, porque 401 vem antes de 404.
const ROTAS = [
  ['GET', '/salas', undefined],
  ['POST', '/atividades', palestraValida()],
  ['GET', '/atividades/atv_00000000', undefined],
];

describe('autenticação por X-Usuario (contrato §1)', () => {
  let api;
  before(async () => { api = await subirApi(); });
  after(async () => { await api?.parar(); });
  beforeEach(async () => {
    const res = await fetch(`${api.url}/_teste/reset`, { method: 'POST' });
    assert.equal(res.status, 204);
  });

  const pedir = async (metodo, rota, { usuario, corpo } = {}) => {
    const headers = {};
    if (usuario !== undefined) headers['X-Usuario'] = usuario;
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${api.url}${rota}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return { status: res.status, corpo: await res.json() };
  };

  const esperarErro = (res, status, erro) => {
    assert.equal(res.status, status);
    assert.equal(res.corpo.erro, erro);
    assert.equal(typeof res.corpo.mensagem, 'string');
  };

  for (const [metodo, rota, corpo] of ROTAS) {
    it(`recusa ${metodo} ${rota} sem X-Usuario com 401 USUARIO_DESCONHECIDO`, async () => {
      esperarErro(await pedir(metodo, rota, { corpo }), 401, 'USUARIO_DESCONHECIDO');
    });
  }

  for (const [metodo, rota, corpo] of ROTAS) {
    it(`recusa ${metodo} ${rota} com X-Usuario desconhecido com 401 USUARIO_DESCONHECIDO`, async () => {
      esperarErro(await pedir(metodo, rota, { usuario: 'p-zeca', corpo }), 401, 'USUARIO_DESCONHECIDO');
    });
  }

  for (const [caso, corpo] of [
    ['corpo válido', palestraValida()],
    ['corpo inválido (403 vem antes de 422)', { ...palestraValida(), vagas: 0 }],
  ]) {
    it(`recusa POST /atividades de participante com ${caso} com 403 SOMENTE_ORGANIZACAO`, async () => {
      esperarErro(await pedir('POST', '/atividades', { usuario: 'p-carla', corpo }), 403, 'SOMENTE_ORGANIZACAO');
    });
  }
});
