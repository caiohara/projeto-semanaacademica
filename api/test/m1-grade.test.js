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

  it('R5: GET /atividades/:id devolve a atividade criada, encontros em ordem, contagens zeradas e prevista', async () => {
    const criada = await pedir('POST', '/atividades', {
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
    assert.equal(criada.status, 201);

    const res = await pedir('GET', `/atividades/${criada.corpo.id}`, { usuario: 'p-carla' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, criada.corpo);
    assert.equal(res.corpo.titulo, 'Flutter do zero');
    assert.equal(res.corpo.tipo, 'minicurso');
    assert.equal(res.corpo.salaId, 'lab-3');
    assert.equal(res.corpo.vagas, 20);
    assert.equal(Date.parse(res.corpo.encontros[0].inicio), Date.parse('2026-10-19T19:00:00-03:00'));
    assert.equal(Date.parse(res.corpo.encontros[1].inicio), Date.parse('2026-10-20T19:00:00-03:00'));
    assert.equal(res.corpo.situacao, 'prevista');
    assert.equal(res.corpo.ocupadas, 0);
    assert.equal(res.corpo.emEspera, 0);
    assert.equal(res.corpo.vagasRestantes, 20);
  });

  it('R6: cargaHorariaMinutos é a soma exata das durações dos encontros, sem arredondar', async () => {
    const minicurso = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'Flutter do zero',
        tipo: 'minicurso',
        salaId: 'lab-3',
        vagas: 20,
        encontros: [
          { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
          { inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T21:30:00-03:00' },
        ],
      },
    });
    assert.equal(minicurso.status, 201);
    assert.equal(minicurso.corpo.cargaHorariaMinutos, 330);

    const palestra = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'IA hoje',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 40,
        encontros: [{ inicio: '2026-10-19T19:00:30-03:00', fim: '2026-10-19T20:30:00-03:00' }],
      },
    });
    assert.equal(palestra.status, 201);
    assert.equal(palestra.corpo.cargaHorariaMinutos, 89.5);

    const lida = await pedir('GET', `/atividades/${palestra.corpo.id}`);
    assert.equal(lida.corpo.cargaHorariaMinutos, 89.5);
  });

  it('R10: instantes na resposta usam o fuso -03:00', async () => {
    const res = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'IA hoje',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 40,
        encontros: [{ inicio: '2026-10-19T22:00:00Z', fim: '2026-10-20T00:00:00Z' }],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.corpo.encontros[0].inicio, '2026-10-19T19:00:00-03:00');
    assert.equal(res.corpo.encontros[0].fim, '2026-10-19T21:00:00-03:00');

    const lida = await pedir('GET', `/atividades/${res.corpo.id}`);
    assert.equal(lida.corpo.encontros[0].inicio, '2026-10-19T19:00:00-03:00');
    assert.equal(lida.corpo.encontros[0].fim, '2026-10-19T21:00:00-03:00');
  });

  it('R11: instantes com segundos ou milissegundos são aceitos e devolvidos com a mesma precisão', async () => {
    const comSegundos = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'IA hoje',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 40,
        encontros: [{ inicio: '2026-10-19T19:00:30-03:00', fim: '2026-10-19T20:30:00-03:00' }],
      },
    });
    assert.equal(comSegundos.status, 201);
    assert.equal(comSegundos.corpo.encontros[0].inicio, '2026-10-19T19:00:30-03:00');

    const comMilissegundos = await pedir('POST', '/atividades', {
      corpo: {
        titulo: 'IA amanhã',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 40,
        encontros: [{ inicio: '2026-10-19T22:00:15.250Z', fim: '2026-10-20T00:00:00.5Z' }],
      },
    });
    assert.equal(comMilissegundos.status, 201);
    assert.equal(comMilissegundos.corpo.encontros[0].inicio, '2026-10-19T19:00:15.250-03:00');
    assert.equal(comMilissegundos.corpo.encontros[0].fim, '2026-10-19T21:00:00.5-03:00');

    const lida = await pedir('GET', `/atividades/${comMilissegundos.corpo.id}`);
    assert.equal(lida.corpo.encontros[0].inicio, '2026-10-19T19:00:15.250-03:00');
    assert.equal(lida.corpo.encontros[0].fim, '2026-10-19T21:00:00.5-03:00');
  });

  const palestraValida = () => ({
    titulo: 'IA hoje',
    tipo: 'palestra',
    salaId: 'sala-101',
    vagas: 40,
    encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
  });
  const semCampo = (campo) => {
    const corpo = palestraValida();
    delete corpo[campo];
    return corpo;
  };

  const esperarDadosInvalidos = (res) => {
    assert.equal(res.status, 422);
    assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');
    assert.equal(typeof res.corpo.mensagem, 'string');
  };

  for (const [caso, corpo] of [
    ['titulo só com espaços', { ...palestraValida(), titulo: '   ' }],
    ['titulo vazio', { ...palestraValida(), titulo: '' }],
    ['titulo null', { ...palestraValida(), titulo: null }],
    ['titulo que não é texto', { ...palestraValida(), titulo: 123 }],
    ['sem titulo', semCampo('titulo')],
    ['tipo oficina', { ...palestraValida(), tipo: 'oficina' }],
    ['sem tipo', semCampo('tipo')],
    ['vagas 0', { ...palestraValida(), vagas: 0 }],
    ['vagas -1', { ...palestraValida(), vagas: -1 }],
    ['vagas 2.5', { ...palestraValida(), vagas: 2.5 }],
    ['vagas "20"', { ...palestraValida(), vagas: '20' }],
    ['sem vagas', semCampo('vagas')],
    ['sem salaId', semCampo('salaId')],
    ['salaId que não é texto', { ...palestraValida(), salaId: 101 }],
    ['sem encontros', semCampo('encontros')],
    ['encontros que não é lista', { ...palestraValida(), encontros: { inicio: '2026-10-19T19:00:00-03:00' } }],
    ['encontro que não é objeto', { ...palestraValida(), encontros: ['2026-10-19T19:00:00-03:00'] }],
    ['encontro sem fuso e sem fim', { ...palestraValida(), encontros: [{ inicio: '2026-10-19T19:00:00' }] }],
    ['encontro com fim sem fuso', {
      ...palestraValida(),
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00' }],
    }],
    ['encontro com inicio que não é data', {
      ...palestraValida(),
      encontros: [{ inicio: 'amanhã', fim: '2026-10-19T21:00:00-03:00' }],
    }],
    ['vagas 0 e encontros vazio (corpo vence regra)', { ...palestraValida(), vagas: 0, encontros: [] }],
  ]) {
    it(`R12: POST /atividades com ${caso} responde 422 DADOS_INVALIDOS`, async () => {
      esperarDadosInvalidos(await pedir('POST', '/atividades', { corpo }));
    });
  }

  it('R12: POST /atividades com corpo que não é JSON responde 422 DADOS_INVALIDOS', async () => {
    const res = await fetch(`${api.url}/atividades`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana', 'Content-Type': 'application/json' },
      body: '{titulo:',
    });
    esperarDadosInvalidos({ status: res.status, corpo: await res.json() });
  });

  it('R13: POST /atividades com campo extra dentro de um encontro responde 422 DADOS_INVALIDOS', async () => {
    const corpo = {
      ...palestraValida(),
      encontros: [{ id: 'enc_00000000', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
    };
    esperarDadosInvalidos(await pedir('POST', '/atividades', { corpo }));
  });

  it('R14: POST /atividades com salaId que não existe responde 422 DADOS_INVALIDOS, não 404', async () => {
    esperarDadosInvalidos(await pedir('POST', '/atividades', { corpo: { ...palestraValida(), salaId: 'sala-999' } }));
  });

  it('R15: títulos repetidos são aceitos e o título não tem tamanho máximo', async () => {
    const primeira = await pedir('POST', '/atividades', { corpo: palestraValida() });
    assert.equal(primeira.status, 201);
    const repetida = await pedir('POST', '/atividades', {
      corpo: {
        ...palestraValida(),
        encontros: [{ inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T21:00:00-03:00' }],
      },
    });
    assert.equal(repetida.status, 201);
    assert.equal(repetida.corpo.titulo, 'IA hoje');
    assert.notEqual(repetida.corpo.id, primeira.corpo.id);

    const tituloLongo = 'a'.repeat(1000);
    const longa = await pedir('POST', '/atividades', {
      corpo: {
        ...palestraValida(),
        titulo: tituloLongo,
        encontros: [{ inicio: '2026-10-21T19:00:00-03:00', fim: '2026-10-21T21:00:00-03:00' }],
      },
    });
    assert.equal(longa.status, 201);
    assert.equal(longa.corpo.titulo, tituloLongo);
  });

  for (const [campo, valor] of [
    ['descricao', 'x'],
    ['situacao', 'prevista'],
    ['ocupadas', 0],
    ['emEspera', 0],
    ['vagasRestantes', 40],
    ['cargaHorariaMinutos', 120],
  ]) {
    it(`R34: POST /atividades com o campo ${campo} responde 422 DADOS_INVALIDOS`, async () => {
      esperarDadosInvalidos(await pedir('POST', '/atividades', { corpo: { ...palestraValida(), [campo]: valor } }));
    });
  }

  it('R34: POST /atividades ignora o id do corpo e usa o id gerado pelo servidor', async () => {
    const res = await pedir('POST', '/atividades', { corpo: { ...palestraValida(), id: 'atv_00000000' } });
    assert.equal(res.status, 201);
    assert.notEqual(res.corpo.id, 'atv_00000000');
    assert.match(res.corpo.id, /^atv_[0-9a-f]{8}$/);
    assert.equal((await pedir('GET', '/atividades/atv_00000000')).status, 404);
    assert.equal((await pedir('GET', `/atividades/${res.corpo.id}`)).status, 200);
  });

  // Fatia 2 — regras de criação.
  const encontroEm = (dia, das, ate) => ({
    inicio: `2026-10-${dia}T${das}:00-03:00`,
    fim: `2026-10-${dia}T${ate}:00-03:00`,
  });
  const esperarErro = (res, status, erro) => {
    assert.equal(res.status, status, JSON.stringify(res.corpo));
    assert.equal(res.corpo.erro, erro);
    assert.equal(typeof res.corpo.mensagem, 'string');
  };

  it('R16: palestra exige exatamente 1 encontro e minicurso de 2 a 5, senão 422 QUANTIDADE_DE_ENCONTROS', async () => {
    const minicurso = (encontros) => ({ titulo: 'Flutter do zero', tipo: 'minicurso', salaId: 'lab-3', vagas: 20, encontros });
    const cincoDias = ['19', '20', '21', '22', '23'].map((dia) => encontroEm(dia, '19:00', '21:00'));

    esperarErro(await pedir('POST', '/atividades', {
      corpo: { ...palestraValida(), encontros: [encontroEm('19', '19:00', '21:00'), encontroEm('20', '19:00', '21:00')] },
    }), 422, 'QUANTIDADE_DE_ENCONTROS');
    esperarErro(await pedir('POST', '/atividades', { corpo: { ...palestraValida(), encontros: [] } }),
      422, 'QUANTIDADE_DE_ENCONTROS');
    esperarErro(await pedir('POST', '/atividades', { corpo: minicurso([encontroEm('19', '19:00', '21:00')]) }),
      422, 'QUANTIDADE_DE_ENCONTROS');
    esperarErro(await pedir('POST', '/atividades', {
      corpo: minicurso([...cincoDias, encontroEm('19', '08:00', '10:00')]),
    }), 422, 'QUANTIDADE_DE_ENCONTROS');

    const comCinco = await pedir('POST', '/atividades', { corpo: minicurso(cincoDias) });
    assert.equal(comCinco.status, 201);
    assert.equal(comCinco.corpo.encontros.length, 5);
  });
});
