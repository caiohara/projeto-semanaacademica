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

  // Cenário base com as inscrições do M2 (R31): p-carla, p-diego e p-elisa confirmadas em A.
  // Inscreve antes de mexer no relógio (reset em 13/10), longe do encerramento do M2.
  const montarComInscritos = async () => {
    const cenario = await montarCenario();
    for (const participante of ['p-carla', 'p-diego', 'p-elisa']) {
      const res = await pedir('POST', `/atividades/${cenario.A.id}/inscricoes`, { usuario: participante });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.status, 'confirmada');
    }
    return cenario;
  };

  // "Código de E às hh:mm" (spec, seção 6): o que GET /encontros/E/codigo devolve nesse minuto.
  const codigoAs = async (encontro, agora) => {
    await relogio(agora);
    const res = await pedir('GET', `/encontros/${encontro}/codigo`);
    assert.equal(res.status, 200);
    return res.corpo.codigo;
  };

  const enviar = (E, usuario, corpo) => pedir('POST', `/encontros/${E}/presencas`, { usuario, corpo });

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

  describe('perfil na presença por QR (contrato §1)', () => {
    it('organização enviando presença por QR → 403 SOMENTE_PARTICIPANTE', async () => {
      const { E } = await montarCenario();
      await relogio('2026-10-19T19:00:30-03:00');
      const res = await pedir('POST', `/encontros/${E}/presencas`, { usuario: 'org-ana', corpo: { codigo: 'ZZZZZZ' } });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'SOMENTE_PARTICIPANTE');
    });
  });

  describe('presença por QR online (R4, R10, R11, R13, R14, R24, R25, R28)', () => {
    it('R10/R25: código do minuto atual → 201 origem qr, lidoEm = registradaEm = relógio, justificativa null', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');

      const res = await enviar(E, 'p-carla', { codigo });
      assert.equal(res.status, 201);
      assert.match(res.corpo.id, /^pre_[0-9a-f]{8}$/);
      assert.equal(res.corpo.encontroId, E);
      assert.equal(res.corpo.participanteId, 'p-carla');
      assert.equal(res.corpo.origem, 'qr');
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:00:30-03:00');
      assert.equal(res.corpo.registradaEm, '2026-10-19T19:00:30-03:00');
      assert.equal(res.corpo.justificativa, null);
    });

    it('R10/R8: código do minuto anterior ainda vale; em validoAte deixa de valer → 422 CODIGO_INVALIDO', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:00-03:00');

      await relogio('2026-10-19T19:01:59.999-03:00');
      let res = await enviar(E, 'p-diego', { codigo });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr');

      await relogio('2026-10-19T19:02:00-03:00');
      res = await enviar(E, 'p-elisa', { codigo });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'CODIGO_INVALIDO');
    });

    it('R10: código de outro encontro ou inexistente → 422 CODIGO_INVALIDO', async () => {
      const { E, F } = await montarComInscritos();
      const deE = await codigoAs(E, '2026-10-19T18:59:00-03:00');
      const deF = await codigoAs(F, '2026-10-19T19:00:00-03:00');
      const deEAs19 = await codigoAs(E, '2026-10-19T19:00:00-03:00');
      assert.notEqual('ZZZZZZ', deE);
      assert.notEqual('ZZZZZZ', deEAs19);

      await relogio('2026-10-19T19:00:30-03:00');
      let res = await enviar(E, 'p-carla', { codigo: deF });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'CODIGO_INVALIDO');

      res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'CODIGO_INVALIDO');
    });

    it('R11: código só é convertido para maiúsculas; espaço, hífen, tamanho ≠ 6 ou letra fora do alfabeto → 422 CODIGO_INVALIDO', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');

      for (const desviado of [` ${codigo} `, 'K7M-2QX', codigo.slice(0, 5), `${codigo}A`, `O${codigo.slice(1)}`]) {
        const res = await enviar(E, 'p-carla', { codigo: desviado });
        assert.equal(res.status, 422, `codigo ${JSON.stringify(desviado)}`);
        assert.equal(res.corpo.erro, 'CODIGO_INVALIDO', `codigo ${JSON.stringify(desviado)}`);
      }

      const res = await enviar(E, 'p-carla', { codigo: codigo.toLowerCase() });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr');
    });

    it('R4/R2: sem lidoEm, relógio fora da janela de presença (inclusiva) → 422 FORA_DA_JANELA', async () => {
      const { E } = await montarComInscritos();
      // O código de 18:44 não pode ser obtido (R3); o de 18:45 é o primeiro. Às 18:44:59 ele
      // seria de minuto futuro, mas FORA_DA_JANELA vem antes de CODIGO_INVALIDO (R28).
      const primeiro = await codigoAs(E, '2026-10-19T18:45:00-03:00');
      await relogio('2026-10-19T18:44:59-03:00');
      let res = await enviar(E, 'p-carla', { codigo: primeiro });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');

      const ultimo = await codigoAs(E, '2026-10-19T22:30:00-03:00');
      res = await enviar(E, 'p-carla', { codigo: ultimo });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr');

      await relogio('2026-10-19T22:30:00.001-03:00');
      res = await enviar(E, 'p-diego', { codigo: ultimo });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');
    });

    it('R13: só inscrição confirmada registra presença; convocada, em_espera, cancelada ou nenhuma → 403 NAO_INSCRITO', async () => {
      const { A, E } = await montarComInscritos();
      const inscrever = async (atividadeId, participante, status) => {
        const res = await pedir('POST', `/atividades/${atividadeId}/inscricoes`, { usuario: participante });
        assert.equal(res.status, 201);
        assert.equal(res.corpo.status, status);
        return res.corpo;
      };
      const cancelar = async (inscricao, participante) => {
        const res = await pedir('POST', `/inscricoes/${inscricao.id}/cancelamento`, { usuario: participante });
        assert.equal(res.status, 200);
      };

      // p-fabio: inscrição em A com status diferente de confirmada (cancelada).
      await cancelar(await inscrever(A.id, 'p-fabio', 'confirmada'), 'p-fabio');

      // Atividade C com 1 vaga, para ter convocada e em_espera pelo M2.
      const C = await pedir('POST', '/atividades', {
        corpo: {
          titulo: 'Atividade C',
          tipo: 'palestra',
          salaId: 'lab-3',
          vagas: 1,
          encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
        },
      });
      assert.equal(C.status, 201);
      const G = C.corpo.encontros[0].id;
      const deHeitor = await inscrever(C.corpo.id, 'p-heitor', 'confirmada');
      // Relógio avança entre as duas para a fila FIFO (M2 R14) não depender do desempate por id.
      await relogio('2026-10-15T10:00:00-03:00');
      await inscrever(C.corpo.id, 'p-isadora', 'em_espera');
      await relogio('2026-10-15T10:01:00-03:00');
      await inscrever(C.corpo.id, 'p-joao', 'em_espera');
      await cancelar(deHeitor, 'p-heitor'); // p-isadora é convocada (M2 R14)
      const isadora = await pedir('GET', '/inscricoes', { usuario: 'p-isadora' });
      assert.equal(isadora.corpo[0].status, 'convocada');

      const deE = await codigoAs(E, '2026-10-19T19:00:30-03:00');
      const deG = await codigoAs(G, '2026-10-19T19:00:30-03:00');
      for (const [encontro, codigo, participante] of [
        [E, deE, 'p-fabio'], [E, deE, 'p-gabriela'],
        [G, deG, 'p-heitor'], [G, deG, 'p-isadora'], [G, deG, 'p-joao'],
      ]) {
        const res = await enviar(encontro, participante, { codigo });
        assert.equal(res.status, 403, participante);
        assert.equal(res.corpo.erro, 'NAO_INSCRITO', participante);
      }
    });

    it('R14: encontro de atividade cancelada → 403 NAO_INSCRITO (o cancelamento cancela as inscrições)', async () => {
      const { A, E } = await montarComInscritos();
      const cancelada = await pedir('POST', `/atividades/${A.id}/cancelamento`);
      assert.equal(cancelada.status, 200);

      await relogio('2026-10-19T19:00:30-03:00');
      const res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });

    it('R24: presença repetida → 200 com a presença já gravada, sem alteração', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');
      const primeira = await enviar(E, 'p-carla', { codigo });
      assert.equal(primeira.status, 201);

      const outro = await codigoAs(E, '2026-10-19T19:10:00-03:00');
      const res = await enviar(E, 'p-carla', { codigo: outro });
      assert.equal(res.status, 200);
      assert.deepEqual(res.corpo, primeira.corpo);
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:00:30-03:00');
      assert.equal(res.corpo.registradaEm, '2026-10-19T19:00:30-03:00');
      assert.equal(res.corpo.origem, 'qr');
    });

    it('R24/R28: repetição vem antes de FORA_DA_JANELA e de CODIGO_INVALIDO → 200 com a presença gravada', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');
      const primeira = await enviar(E, 'p-carla', { codigo });
      assert.equal(primeira.status, 201);

      await relogio('2026-10-19T23:00:00-03:00');
      const res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 200);
      assert.deepEqual(res.corpo, primeira.corpo);
    });

    it('R28: NAO_INSCRITO vem antes de FORA_DA_JANELA, que vem antes de CODIGO_INVALIDO', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T23:00:00-03:00');

      let res = await enviar(E, 'p-gabriela', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');

      res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');
    });

    it('R28/contrato §1: 401 USUARIO_DESCONHECIDO → 403 SOMENTE_PARTICIPANTE → 404 NAO_ENCONTRADO', async () => {
      await montarComInscritos();
      await relogio('2026-10-19T19:00:30-03:00');

      let res = await enviar('enc_00000000', null, { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 401);
      assert.equal(res.corpo.erro, 'USUARIO_DESCONHECIDO');

      res = await enviar('enc_00000000', 'org-ana', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'SOMENTE_PARTICIPANTE');

      res = await enviar('enc_00000000', 'p-carla', { codigo: 'ZZZZZZ' });
      assert.equal(res.status, 404);
      assert.equal(res.corpo.erro, 'NAO_ENCONTRADO');
    });
  });

  describe('presença por QR offline (R16–R19, R28)', () => {
    it('R16/R25: envio com lidoEm → 201 origem qr_offline, lidoEm = o enviado, registradaEm = relógio', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:00-03:00');

      await relogio('2026-10-19T21:00:00-03:00');
      const res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:45-03:00' });
      assert.equal(res.status, 201);
      assert.match(res.corpo.id, /^pre_[0-9a-f]{8}$/);
      assert.equal(res.corpo.encontroId, E);
      assert.equal(res.corpo.participanteId, 'p-carla');
      assert.equal(res.corpo.origem, 'qr_offline');
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:00:45-03:00');
      assert.equal(res.corpo.registradaEm, '2026-10-19T21:00:00-03:00');
      assert.equal(res.corpo.justificativa, null);
    });

    it('R16: lidoEm igual ao relógio também grava origem qr_offline', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');

      const res = await enviar(E, 'p-diego', { codigo, lidoEm: '2026-10-19T19:00:30-03:00' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr_offline');
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:00:30-03:00');
    });

    it('R16/R10: o código é conferido com lidoEm — código de minuto futuro em relação a lidoEm → 422 CODIGO_INVALIDO', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:05:00-03:00');

      await relogio('2026-10-19T19:05:30-03:00');
      const res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:03:10-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'CODIGO_INVALIDO');
    });

    it('R16/R2: a janela de presença é conferida com lidoEm — lidoEm após fim + 30 min → 422 FORA_DA_JANELA', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T22:30:00-03:00');

      await relogio('2026-10-19T22:40:00-03:00');
      let res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T22:30:00-03:00' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr_offline');

      res = await enviar(E, 'p-diego', { codigo, lidoEm: '2026-10-19T22:30:00.001-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');
    });

    it('R17: envio com lidoEm aceito com o relógio até fim + 2 h, inclusive; depois → 422 SINCRONIZACAO_TARDIA', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:00-03:00');

      await relogio('2026-10-20T00:00:00-03:00');
      let res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:45-03:00' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.origem, 'qr_offline');

      await relogio('2026-10-20T00:00:00.001-03:00');
      res = await enviar(E, 'p-diego', { codigo, lidoEm: '2026-10-19T19:00:45-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'SINCRONIZACAO_TARDIA');
    });

    it('R17/R28: SINCRONIZACAO_TARDIA vem antes de FORA_DA_JANELA e de CODIGO_INVALIDO', async () => {
      const { E } = await montarComInscritos();

      await relogio('2026-10-20T01:00:00-03:00');
      const res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ', lidoEm: '2026-10-19T23:00:00-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'SINCRONIZACAO_TARDIA');
    });

    it('R18/R28: lidoEm posterior ao relógio → 422 DADOS_INVALIDOS, mesmo com presença já gravada (não 200)', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');

      let res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:31-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');

      res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:30-03:00' });
      assert.equal(res.status, 201);

      res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:31-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'DADOS_INVALIDOS');
    });

    it('R19: lidoEm é guardado com os milissegundos enviados; o prazo usa o instante completo', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:00-03:00');

      await relogio('2026-10-20T00:00:00.000-03:00');
      let res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T19:00:45.123-03:00' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:00:45.123-03:00');

      const lista = await pedir('GET', `/encontros/${E}/presencas`);
      assert.equal(lista.status, 200);
      assert.equal(lista.corpo.length, 1);
      assert.equal(lista.corpo[0].lidoEm, '2026-10-19T19:00:45.123-03:00');

      await relogio('2026-10-20T00:00:00.001-03:00');
      res = await enviar(E, 'p-diego', { codigo, lidoEm: '2026-10-19T19:00:45.123-03:00' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'SINCRONIZACAO_TARDIA');
    });

    it('R24: presença repetida no QR offline → 200 com a presença já gravada, sem alteração', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');
      const primeira = await enviar(E, 'p-carla', { codigo });
      assert.equal(primeira.status, 201);

      // Repetição via QR offline: código inválido e fora da janela, mas repetição vem antes (R28).
      const res = await enviar(E, 'p-carla', { codigo: 'ZZZZZZ', lidoEm: '2026-10-19T19:00:30-03:00' });
      assert.equal(res.status, 200);
      assert.deepEqual(res.corpo, primeira.corpo);
    });

    it('R13: QR offline com participante sem inscrição confirmada → 403 NAO_INSCRITO', async () => {
      const { E } = await montarComInscritos();
      const codigo = await codigoAs(E, '2026-10-19T19:00:30-03:00');
      const res = await enviar(E, 'p-gabriela', { codigo, lidoEm: '2026-10-19T19:00:30-03:00' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });

    it('R14: QR offline em encontro de atividade cancelada → 403 NAO_INSCRITO', async () => {
      const { A, E } = await montarComInscritos();
      // Código obtido e atividade cancelada antes do início (M1 R30), para ainda poder cancelar.
      const codigo = await codigoAs(E, '2026-10-19T18:50:00-03:00');
      const cancelada = await pedir('POST', `/atividades/${A.id}/cancelamento`);
      assert.equal(cancelada.status, 200);

      const res = await enviar(E, 'p-carla', { codigo, lidoEm: '2026-10-19T18:50:00-03:00' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });
  });

  describe('presença manual (R5, R15, R21–R23, R25, R29)', () => {
    const enviarManual = (E, usuario, corpo) => pedir('POST', `/encontros/${E}/presencas/manual`, { usuario, corpo });

    it('R5/R25/R1: dentro da janela manual → 201 origem manual, lidoEm = registradaEm = relógio, justificativa enviada', async () => {
      const { E } = await montarComInscritos(); // criado por org-ana
      await relogio('2026-10-19T19:30:00-03:00');

      const res = await enviarManual(E, 'org-bruno', { participanteId: 'p-carla', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 201);
      assert.match(res.corpo.id, /^pre_[0-9a-f]{8}$/);
      assert.equal(res.corpo.encontroId, E);
      assert.equal(res.corpo.participanteId, 'p-carla');
      assert.equal(res.corpo.origem, 'manual');
      assert.equal(res.corpo.lidoEm, '2026-10-19T19:30:00-03:00');
      assert.equal(res.corpo.registradaEm, '2026-10-19T19:30:00-03:00');
      assert.equal(res.corpo.justificativa, 'Celular sem bateria');
    });

    it('R5: janela manual de inicio − 15 min até fim + 2 h, inclusiva → 422 FORA_DA_JANELA fora dela', async () => {
      const { E } = await montarComInscritos();

      await relogio('2026-10-19T18:44:59.999-03:00');
      let res = await enviarManual(E, 'org-ana', { participanteId: 'p-carla', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');

      await relogio('2026-10-20T00:00:00-03:00');
      res = await enviarManual(E, 'org-ana', { participanteId: 'p-carla', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 201);

      await relogio('2026-10-20T00:00:00.001-03:00');
      res = await enviarManual(E, 'org-ana', { participanteId: 'p-diego', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 422);
      assert.equal(res.corpo.erro, 'FORA_DA_JANELA');
    });

    it('R22: justificativa precisa de 10 caracteres após trim → 422 JUSTIFICATIVA_OBRIGATORIA', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T19:30:00-03:00');

      for (const justificativa of [undefined, '', '          ', '  curta  ']) {
        const corpo = justificativa === undefined
          ? { participanteId: 'p-carla' }
          : { participanteId: 'p-carla', justificativa };
        const res = await enviarManual(E, 'org-ana', corpo);
        assert.equal(res.status, 422, JSON.stringify(justificativa));
        assert.equal(res.corpo.erro, 'JUSTIFICATIVA_OBRIGATORIA', JSON.stringify(justificativa));
      }

      const res = await enviarManual(E, 'org-ana', { participanteId: 'p-carla', justificativa: '  0123456789  ' });
      assert.equal(res.status, 201);
    });

    it('R25/R22: a justificativa é gravada exatamente como enviada, sem trim (critério 30a)', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T19:30:00-03:00');

      const res = await enviarManual(E, 'org-ana', { participanteId: 'p-carla', justificativa: '  0123456789  ' });
      assert.equal(res.status, 201);
      assert.equal(res.corpo.justificativa, '  0123456789  ');

      const lista = await pedir('GET', `/encontros/${E}/presencas`);
      assert.equal(lista.status, 200);
      assert.equal(lista.corpo[0].justificativa, '  0123456789  ');
    });

    it('R21: participanteId ausente, não-string, inexistente, justificativa não-string ou campo desconhecido → 422 DADOS_INVALIDOS', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T19:30:00-03:00');
      const justificativa = 'Celular sem bateria';

      for (const corpo of [
        { justificativa },
        { participanteId: 42, justificativa },
        { participanteId: 'p-naoexiste', justificativa },
        { participanteId: 'p-carla', justificativa: 5 },
        { participanteId: 'p-carla', justificativa, extra: 1 },
      ]) {
        const res = await enviarManual(E, 'org-ana', corpo);
        assert.equal(res.status, 422, JSON.stringify(corpo));
        assert.equal(res.corpo.erro, 'DADOS_INVALIDOS', JSON.stringify(corpo));
      }
    });

    it('R15: participanteId de alguém da organização → 403 NAO_INSCRITO', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T19:30:00-03:00');

      const res = await enviarManual(E, 'org-ana', { participanteId: 'org-bruno', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });

    it('R13: participante sem inscrição confirmada → 403 NAO_INSCRITO', async () => {
      const { E } = await montarComInscritos();
      await relogio('2026-10-19T19:30:00-03:00');

      const res = await enviarManual(E, 'org-ana', { participanteId: 'p-fabio', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });

    it('R14: presença manual em encontro de atividade cancelada → 403 NAO_INSCRITO', async () => {
      const { A, E } = await montarComInscritos();
      // Cancela antes do início (M1 R30); a janela manual (R5) segue aberta depois.
      const cancelada = await pedir('POST', `/atividades/${A.id}/cancelamento`);
      assert.equal(cancelada.status, 200);

      await relogio('2026-10-19T19:30:00-03:00');
      const res = await enviarManual(E, 'org-ana', { participanteId: 'p-carla', justificativa: 'Celular sem bateria' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'NAO_INSCRITO');
    });
  });

  describe('listagem (R26)', () => {
    it('R26: encontro existente sem presenças → 200 []', async () => {
      const { E } = await montarCenario();
      const res = await pedir('GET', `/encontros/${E}/presencas`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.corpo, []);
    });

    it('R26/R1: qualquer pessoa da organização lista; participante → 403 SOMENTE_ORGANIZACAO; encontro inexistente → 404', async () => {
      const { E } = await montarCenario(); // criado por org-ana

      let res = await pedir('GET', `/encontros/${E}/presencas`, { usuario: 'org-bruno' });
      assert.equal(res.status, 200);
      assert.deepEqual(res.corpo, []);

      res = await pedir('GET', `/encontros/${E}/presencas`, { usuario: 'p-carla' });
      assert.equal(res.status, 403);
      assert.equal(res.corpo.erro, 'SOMENTE_ORGANIZACAO');

      res = await pedir('GET', '/encontros/enc_00000000/presencas');
      assert.equal(res.status, 404);
      assert.equal(res.corpo.erro, 'NAO_ENCONTRADO');
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
