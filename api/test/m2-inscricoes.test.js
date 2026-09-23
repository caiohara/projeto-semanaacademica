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

    it('R2: com vaga disponível, a inscrição nasce confirmada', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(res.status, 201);
      assert.match(res.corpo.id, /^ins_[0-9a-f]{8}$/);
      assert.equal(res.corpo.atividadeId, m.id);
      assert.equal(res.corpo.participanteId, 'p-diego');
      assert.equal(res.corpo.status, 'confirmada');
      assert.equal(res.corpo.posicaoNaEspera, null);
      assert.equal(res.corpo.convocadaAte, null);
      assert.equal(typeof res.corpo.criadaEm, 'string');
      assert.equal(Date.parse(res.corpo.criadaEm), Date.parse('2026-10-13T09:00:00-03:00'));
    });

    it('R3: 409 JA_INSCRITO ao tentar se inscrever de novo com uma inscrição confirmada ativa', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const primeira = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(primeira.status, 201);
      const segunda = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      esperarErro(segunda, 409, 'JA_INSCRITO');
    });

    it('R3: cancelar a inscrição anterior libera nova inscrição', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const primeira = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(primeira.status, 201);
      const cancelamento = await pedir('POST', `/inscricoes/${primeira.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(cancelamento.status, 200);
      const segunda = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(segunda.status, 201);
    });

    it('R4: 422 ATIVIDADE_CANCELADA ao se inscrever numa atividade cancelada', async () => {
      const m = await criarAtividadeM();
      const cancelamento = await pedir('POST', `/atividades/${m.id}/cancelamento`, { usuario: 'org-ana' });
      assert.equal(cancelamento.status, 200);
      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      esperarErro(res, 422, 'ATIVIDADE_CANCELADA');
    });

    it('R5: 422 INSCRICOES_ENCERRADAS a 30 minutos ou menos do início do 1º encontro', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      await relogio('2026-10-19T18:29:59-03:00');
      const antes = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(antes.status, 201);
      await relogio('2026-10-19T18:30:00-03:00');
      const depois = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      esperarErro(depois, 422, 'INSCRICOES_ENCERRADAS');
    });

    it('R6: 409 CONFLITO_DE_HORARIO com um encontro confirmado em outra atividade no mesmo horário', async () => {
      const outra = await pedir('POST', '/atividades', {
        usuario: 'org-ana',
        corpo: {
          titulo: 'Outra atividade',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 40,
          encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T21:00:00-03:00' }],
        },
      });
      assert.equal(outra.status, 201);
      const confirmada = await pedir('POST', `/atividades/${outra.corpo.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(confirmada.status, 201);

      const m = await criarAtividadeM({ vagas: 2 });
      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      esperarErro(res, 409, 'CONFLITO_DE_HORARIO');
    });

    it('R7: 422 LIMITE_DE_MINICURSOS ao ultrapassar 3 minicursos confirmados; uma palestra passa', async () => {
      const criarMinicurso = async (titulo, encontros) => {
        const res = await pedir('POST', '/atividades', {
          usuario: 'org-ana',
          corpo: { titulo, tipo: 'minicurso', salaId: 'sala-101', vagas: 40, encontros },
        });
        assert.equal(res.status, 201);
        return res.corpo;
      };
      const inscrever = async (atividadeId) => {
        const res = await pedir('POST', `/atividades/${atividadeId}/inscricoes`, { usuario: 'p-carla' });
        assert.equal(res.status, 201);
      };

      const mc1 = await criarMinicurso('MC1', [
        { inicio: '2026-10-21T09:00:00-03:00', fim: '2026-10-21T11:00:00-03:00' },
        { inicio: '2026-10-21T12:00:00-03:00', fim: '2026-10-21T14:00:00-03:00' },
      ]);
      const mc2 = await criarMinicurso('MC2', [
        { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' },
        { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' },
      ]);
      const mc3 = await criarMinicurso('MC3', [
        { inicio: '2026-10-22T12:00:00-03:00', fim: '2026-10-22T14:00:00-03:00' },
        { inicio: '2026-10-22T15:00:00-03:00', fim: '2026-10-22T17:00:00-03:00' },
      ]);
      const mc4 = await criarMinicurso('MC4', [
        { inicio: '2026-10-23T09:00:00-03:00', fim: '2026-10-23T11:00:00-03:00' },
        { inicio: '2026-10-23T12:00:00-03:00', fim: '2026-10-23T14:00:00-03:00' },
      ]);
      await inscrever(mc1.id);
      await inscrever(mc2.id);
      await inscrever(mc3.id);

      const quarto = await pedir('POST', `/atividades/${mc4.id}/inscricoes`, { usuario: 'p-carla' });
      esperarErro(quarto, 422, 'LIMITE_DE_MINICURSOS');

      const palestra = await pedir('POST', '/atividades', {
        usuario: 'org-ana',
        corpo: {
          titulo: 'Palestra extra',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 40,
          encontros: [{ inicio: '2026-10-23T15:00:00-03:00', fim: '2026-10-23T16:00:00-03:00' }],
        },
      });
      assert.equal(palestra.status, 201);
      const inscricaoPalestra = await pedir('POST', `/atividades/${palestra.corpo.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(inscricaoPalestra.status, 201);
    });

    it('R8: com ATIVIDADE_CANCELADA, INSCRICOES_ENCERRADAS e JA_INSCRITO aplicáveis, a mais externa vence', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const primeira = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(primeira.status, 201);
      const cancelamento = await pedir('POST', `/atividades/${m.id}/cancelamento`, { usuario: 'org-ana' });
      assert.equal(cancelamento.status, 200);
      await relogio('2026-10-19T18:30:00-03:00');

      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      esperarErro(res, 422, 'ATIVIDADE_CANCELADA');
    });
  });

  describe('cancelar sem convocação (fatia 2)', () => {
    it('R9: 422 ATIVIDADE_JA_INICIADA no cancelamento no instante exato do início; um segundo antes, 200', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const antes = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(antes.status, 201);
      const depois = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(depois.status, 201);

      await relogio('2026-10-19T18:59:59-03:00');
      const umSegundoAntes = await pedir('POST', `/inscricoes/${antes.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(umSegundoAntes.status, 200);

      await relogio('2026-10-19T19:00:00-03:00');
      const noInicio = await pedir('POST', `/inscricoes/${depois.corpo.id}/cancelamento`, { usuario: 'p-diego' });
      esperarErro(noInicio, 422, 'ATIVIDADE_JA_INICIADA');
    });

    it('R10: 422 INSCRICAO_INATIVA ao cancelar a mesma inscrição pela 2ª vez', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const inscricao = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(inscricao.status, 201);

      const primeiro = await pedir('POST', `/inscricoes/${inscricao.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(primeiro.status, 200);

      const segundo = await pedir('POST', `/inscricoes/${inscricao.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      esperarErro(segundo, 422, 'INSCRICAO_INATIVA');
    });

    it('R11: ATIVIDADE_JA_INICIADA vence INSCRICAO_INATIVA quando as duas valem', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const inscricao = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(inscricao.status, 201);

      const primeiro = await pedir('POST', `/inscricoes/${inscricao.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(primeiro.status, 200);

      await relogio('2026-10-19T19:00:00-03:00');
      const segundo = await pedir('POST', `/inscricoes/${inscricao.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      esperarErro(segundo, 422, 'ATIVIDADE_JA_INICIADA');
    });

    it('R13: 404 NAO_ENCONTRADO ao tentar cancelar a inscrição de outro participante', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.status, 201);

      const res = await pedir('POST', `/inscricoes/${diego.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      esperarErro(res, 404, 'NAO_ENCONTRADO');
    });

    it('R12: cancelar inscrição em_espera (única na fila) só muda o status para cancelada, sem convocar', async () => {
      const m = await criarAtividadeM({ vagas: 1 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.status, 201);
      assert.equal(carla.corpo.status, 'confirmada');

      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.status, 201);
      assert.equal(diego.corpo.status, 'em_espera');

      const cancelamento = await pedir('POST', `/inscricoes/${diego.corpo.id}/cancelamento`, { usuario: 'p-diego' });
      assert.equal(cancelamento.status, 200);
      assert.equal(cancelamento.corpo.status, 'cancelada');

      const carlaDepois = await pedir('GET', `/inscricoes/${carla.corpo.id}`, { usuario: 'p-carla' });
      assert.equal(carlaDepois.status, 200);
      assert.equal(carlaDepois.corpo.status, 'confirmada');
    });
  });

  describe('fila e convocação (fatia 3)', () => {
    it('R2: sem vaga, a inscrição nasce em_espera com posicaoNaEspera 1', async () => {
      const m = await criarAtividadeM({ vagas: 1 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.status, 201);
      assert.equal(carla.corpo.status, 'confirmada');

      const res = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.status, 'em_espera');
      assert.equal(res.corpo.posicaoNaEspera, 1);
      assert.equal(res.corpo.convocadaAte, null);
    });

    it('R12/R14: cancelar inscrição confirmada libera vaga e convoca o próximo da fila', async () => {
      const m = await criarAtividadeM({ vagas: 1 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.corpo.status, 'em_espera');

      const cancelamento = await pedir('POST', `/inscricoes/${carla.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(cancelamento.status, 200);
      assert.equal(cancelamento.corpo.status, 'cancelada');

      const diegoDepois = await pedir('GET', `/inscricoes/${diego.corpo.id}`, { usuario: 'p-diego' });
      assert.equal(diegoDepois.status, 200);
      assert.equal(diegoDepois.corpo.status, 'convocada');
      assert.equal(diegoDepois.corpo.posicaoNaEspera, null);
      assert.equal(
        Date.parse(diegoDepois.corpo.convocadaAte),
        Date.parse('2026-10-13T09:00:00-03:00') + 2 * 60 * 60 * 1000,
      );
    });

    it('R14/R15: PATCH aumentando vagas em mais de 1 convoca quantos couberem, em ordem de fila', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.corpo.status, 'confirmada');
      const elisa = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-elisa' });
      assert.equal(elisa.corpo.status, 'em_espera');
      const fabio = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-fabio' });
      assert.equal(fabio.corpo.status, 'em_espera');

      const patch = await pedir('PATCH', `/atividades/${m.id}`, { usuario: 'org-ana', corpo: { vagas: 4 } });
      assert.equal(patch.status, 200);

      // A convocação é efeito imediato do PATCH (R14), não de uma leitura seguinte:
      // usar GET /inscricoes (lista), que não toca a fila, para confirmar sem mascarar isso.
      const lista = await pedir('GET', '/inscricoes', { usuario: 'org-ana' });
      assert.equal(lista.status, 200);
      const porId = Object.fromEntries(lista.corpo.map((i) => [i.id, i]));
      assert.equal(porId[elisa.corpo.id].status, 'convocada');
      assert.equal(porId[fabio.corpo.id].status, 'convocada');
    });

    it('R16: convocação vencida expira e convoca o próximo na mesma leitura (lazy)', async () => {
      const m = await criarAtividadeM({ vagas: 1 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.corpo.status, 'em_espera');
      // Relógio parado dá o mesmo criadaEm a diego e elisa; avançar 1ms garante a ordem
      // FIFO por criadaEm (R14) sem depender do desempate por id (aleatório).
      await relogio('2026-10-13T09:00:00.001-03:00');
      const elisa = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-elisa' });
      assert.equal(elisa.corpo.status, 'em_espera');

      const cancelamento = await pedir('POST', `/inscricoes/${carla.corpo.id}/cancelamento`, { usuario: 'p-carla' });
      assert.equal(cancelamento.status, 200);
      const diegoConvocado = await pedir('GET', `/inscricoes/${diego.corpo.id}`, { usuario: 'p-diego' });
      assert.equal(diegoConvocado.corpo.status, 'convocada');
      const convocadaAte = Date.parse(diegoConvocado.corpo.convocadaAte);

      await relogio(new Date(convocadaAte + 1000).toISOString());
      const diegoDepois = await pedir('GET', `/inscricoes/${diego.corpo.id}`, { usuario: 'p-diego' });
      assert.equal(diegoDepois.status, 200);
      assert.equal(diegoDepois.corpo.status, 'expirada');
      assert.equal(diegoDepois.corpo.convocadaAte, null);

      const elisaDepois = await pedir('GET', `/inscricoes/${elisa.corpo.id}`, { usuario: 'p-elisa' });
      assert.equal(elisaDepois.corpo.status, 'convocada');
    });

    it('R24: posicaoNaEspera é recalculada quando a primeira da fila cancela', async () => {
      const m = await criarAtividadeM({ vagas: 1 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');

      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      await relogio('2026-10-13T09:00:00.001-03:00');
      const elisa = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-elisa' });
      await relogio('2026-10-13T09:00:00.002-03:00');
      const fabio = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-fabio' });
      assert.equal(diego.corpo.posicaoNaEspera, 1);
      assert.equal(elisa.corpo.posicaoNaEspera, 2);
      assert.equal(fabio.corpo.posicaoNaEspera, 3);

      const cancelamento = await pedir('POST', `/inscricoes/${diego.corpo.id}/cancelamento`, { usuario: 'p-diego' });
      assert.equal(cancelamento.status, 200);

      const elisaDepois = await pedir('GET', `/inscricoes/${elisa.corpo.id}`, { usuario: 'p-elisa' });
      assert.equal(elisaDepois.corpo.posicaoNaEspera, 1);
      const fabioDepois = await pedir('GET', `/inscricoes/${fabio.corpo.id}`, { usuario: 'p-fabio' });
      assert.equal(fabioDepois.corpo.posicaoNaEspera, 2);
    });

    it('R25: inscrição de atividade cancelada continua respondendo 200 com status cancelada', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');

      const cancelamento = await pedir('POST', `/atividades/${m.id}/cancelamento`, { usuario: 'org-ana' });
      assert.equal(cancelamento.status, 200);

      const res = await pedir('GET', `/inscricoes/${carla.corpo.id}`, { usuario: 'p-carla' });
      assert.equal(res.status, 200);
      assert.equal(res.corpo.status, 'cancelada');
    });
  });

  describe('leitura (fatia 1)', () => {
    it('R22: organização vê as inscrições de todos; participante só as próprias; empate por id; filtro sem match é []', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(carla.status, 201);
      assert.equal(diego.status, 201);
      // Mesmo relógio parado: as duas nasceram no mesmo instante, então o empate é pelo id.
      assert.equal(carla.corpo.criadaEm, diego.corpo.criadaEm);
      const [primeiroId, segundoId] = [carla.corpo.id, diego.corpo.id].sort();

      const daOrganizacao = await pedir('GET', '/inscricoes', { usuario: 'org-ana' });
      assert.equal(daOrganizacao.status, 200);
      assert.deepEqual(daOrganizacao.corpo.map((i) => i.id), [primeiroId, segundoId]);

      const daCarla = await pedir('GET', '/inscricoes', { usuario: 'p-carla' });
      assert.equal(daCarla.status, 200);
      assert.deepEqual(daCarla.corpo.map((i) => i.id), [carla.corpo.id]);

      const semMatch = await pedir('GET', '/inscricoes?atividadeId=atv_inexistente', { usuario: 'org-ana' });
      assert.equal(semMatch.status, 200);
      assert.deepEqual(semMatch.corpo, []);
    });

    it('R23: participante só vê a própria inscrição por GET /inscricoes/:id; organização vê qualquer uma', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const diego = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-diego' });
      assert.equal(diego.status, 201);

      const deOutroParticipante = await pedir('GET', `/inscricoes/${diego.corpo.id}`, { usuario: 'p-carla' });
      esperarErro(deOutroParticipante, 404, 'NAO_ENCONTRADO');

      const daOrganizacao = await pedir('GET', `/inscricoes/${diego.corpo.id}`, { usuario: 'org-bruno' });
      assert.equal(daOrganizacao.status, 200);
      assert.deepEqual(daOrganizacao.corpo, diego.corpo);
    });
  });

  describe('confirmar convocação (fatia 4)', () => {
    it('R17: 422 SEM_CONVOCACAO ao confirmar uma inscrição confirmada que nunca foi convocada', async () => {
      const m = await criarAtividadeM({ vagas: 2 });
      const carla = await pedir('POST', `/atividades/${m.id}/inscricoes`, { usuario: 'p-carla' });
      assert.equal(carla.corpo.status, 'confirmada');

      const res = await pedir('POST', `/inscricoes/${carla.corpo.id}/confirmacao`, { usuario: 'p-carla' });
      esperarErro(res, 422, 'SEM_CONVOCACAO');
    });
  });
});
