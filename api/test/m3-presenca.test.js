// M3 — Presença por QR (specs/M3-presenca.md). Tudo pela costura HTTP do contrato.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subirApi } from './apoio/api.js';
// Único ponto de teste fora do HTTP (spec, seção 7, critério 7): o segredo não é observável de fora.
import { derivarCodigo, SEGREDO_PADRAO } from '../src/modulos/m3-presenca/codigo.js';

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

    it('R7: o código depende do encontro e do minuto do relógio (alinhado ao epoch), não do instante dentro do minuto', async () => {
      const { E, F } = await montarCenario();
      const codigo = async (encontro, agora) => {
        await relogio(agora);
        const res = await pedir('GET', `/encontros/${encontro}/codigo`);
        assert.equal(res.status, 200);
        return res.corpo.codigo;
      };

      const deE = await codigo(E, '2026-10-19T19:00:30-03:00');
      const deF = await codigo(F, '2026-10-19T19:00:30-03:00');
      assert.notEqual(deE, deF);

      assert.equal(await codigo(E, '2026-10-19T19:00:59-03:00'), deE);
      assert.equal(await codigo(E, '2026-10-19T19:00:00-03:00'), deE);
      assert.notEqual(await codigo(E, '2026-10-19T19:01:00-03:00'), deE);
    });

    it('R27: 401 USUARIO_DESCONHECIDO → 403 SOMENTE_ORGANIZACAO → 404 NAO_ENCONTRADO', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');

      let res = await pedir('GET', '/encontros/enc_00000000/codigo', { usuario: null });
      assert.equal(res.status, 401);
      assert.equal(res.corpo.erro, 'USUARIO_DESCONHECIDO');

      res = await pedir('GET', '/encontros/enc_00000000/codigo', { usuario: 'p-carla' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'SOMENTE_ORGANIZACAO');

      res = await pedir('GET', `/encontros/${E}/codigo`, { usuario: 'p-carla' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'SOMENTE_ORGANIZACAO');

      res = await pedir('GET', '/encontros/enc_00000000/codigo');
      assert.equal(res.status, 404);
      assert.equal(res.corpo.erro, 'NAO_ENCONTRADO');
    });

    it('R12/R27: atividade cancelada → 422 ATIVIDADE_CANCELADA, antes de FORA_DA_JANELA', async () => {
      const { A, E } = await montarCenario();
      const cancelada = await pedir('POST', `/atividades/${A.id}/cancelamento`);
      assert.equal(cancelada.status, 200);

      await relogio('2026-10-19T19:00:30-03:00');
      let res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'ATIVIDADE_CANCELADA');

      await relogio('2026-10-19T23:00:00-03:00');
      res = await pedir('GET', `/encontros/${E}/codigo`);
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'ATIVIDADE_CANCELADA');
    });

    it('R1: qualquer pessoa da organização obtém o código, não só quem criou a atividade', async () => {
      const { E } = await montarCenario(); // criado por org-ana
      await relogio('2026-10-19T19:00:30-03:00');
      const res = await pedir('GET', `/encontros/${E}/codigo`, { usuario: 'org-bruno' });
      assert.equal(res.status, 200);
      assert.equal(res.corpo.encontroId, E);
      assert.match(res.corpo.codigo, /^[A-HJKMNP-Z2-9]{6}$/);
    });
  });

  describe('corpo do QR (R20)', () => {
    // DADOS_INVALIDOS vem antes da inscrição (R28), então o corpo é conferido sem montar inscrições.
    const enviar = (E, corpo) => pedir('POST', `/encontros/${E}/presencas`, { usuario: 'p-carla', corpo });

    it('R20: codigo ausente ou não-string → 422 DADOS_INVALIDOS', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');

      let res = await enviar(E, {});
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');

      res = await enviar(E, { codigo: 123 });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');
    });

    it('R20: lidoEm null ou sem fuso → 422 DADOS_INVALIDOS (null não equivale a ausente)', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');

      let res = await enviar(E, { codigo: 'ZZZZZZ', lidoEm: null });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');

      res = await enviar(E, { codigo: 'ZZZZZZ', lidoEm: '2026-10-19T19:00:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');
    });

    it('R20: campo desconhecido no corpo → 422 DADOS_INVALIDOS', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');

      const res = await enviar(E, { codigo: 'ZZZZZZ', extra: 1 });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');
    });
  });
});

describe('M3 — segredo do código (R9)', () => {
  // Minuto de 19:00 do dia 19, contado a partir do epoch Unix (R7).
  const MINUTO_DAS_19H = Date.parse('2026-10-19T19:00:00-03:00') / 60000;

  const pedir = async (api, metodo, rota, corpo) => {
    const res = await fetch(`${api.url}${rota}`, {
      method: metodo,
      headers: { 'X-Usuario': 'org-ana', 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await res.text();
    return { status: res.status, corpo: texto ? JSON.parse(texto) : undefined };
  };

  // Reset, cria um encontro às 19:00 e devolve { encontroId, codigo } com o relógio às 19:00:30.
  const codigoDeUmEncontroNovo = async (api) => {
    assert.equal((await pedir(api, 'POST', '/_teste/reset')).status, 204);
    const atividade = await pedir(api, 'POST', '/atividades', {
      titulo: 'Atividade A',
      tipo: 'palestra',
      salaId: 'sala-101',
      vagas: 40,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
    });
    assert.equal(atividade.status, 201);
    assert.equal((await pedir(api, 'PUT', '/_teste/relogio', { agora: '2026-10-19T19:00:30-03:00' })).status, 200);
    const res = await pedir(api, 'GET', `/encontros/${atividade.corpo.encontros[0].id}/codigo`);
    assert.equal(res.status, 200);
    return res.corpo;
  };

  it('R9: mesmo encontroId, índice e segredo dão o mesmo código; segredos diferentes, códigos diferentes', () => {
    const um = derivarCodigo('enc_1a2b3c4d', MINUTO_DAS_19H, 'segredo-um');
    assert.match(um, /^[A-HJKMNP-Z2-9]{6}$/);
    assert.equal(derivarCodigo('enc_1a2b3c4d', MINUTO_DAS_19H, 'segredo-um'), um);
    assert.notEqual(derivarCodigo('enc_1a2b3c4d', MINUTO_DAS_19H, 'segredo-dois'), um);
  });

  it('R9: sem SEGREDO_CODIGO a API usa o valor fixo', async () => {
    const api = await subirApi({ ambiente: { SEGREDO_CODIGO: undefined } });
    try {
      const { encontroId, codigo } = await codigoDeUmEncontroNovo(api);
      assert.equal(codigo, derivarCodigo(encontroId, MINUTO_DAS_19H, SEGREDO_PADRAO));
    } finally {
      await api.parar();
    }
  });

  it('R9: com SEGREDO_CODIGO a API usa esse segredo, e POST /_teste/reset não o troca', async () => {
    const segredo = 'segredo-do-teste-m3';
    assert.notEqual(segredo, SEGREDO_PADRAO);
    const api = await subirApi({ ambiente: { SEGREDO_CODIGO: segredo } });
    try {
      const antes = await codigoDeUmEncontroNovo(api);
      assert.equal(antes.codigo, derivarCodigo(antes.encontroId, MINUTO_DAS_19H, segredo));
      assert.notEqual(antes.codigo, derivarCodigo(antes.encontroId, MINUTO_DAS_19H, SEGREDO_PADRAO));

      const depois = await codigoDeUmEncontroNovo(api); // faz outro reset
      assert.equal(depois.codigo, derivarCodigo(depois.encontroId, MINUTO_DAS_19H, segredo));
    } finally {
      await api.parar();
    }
  });
});
