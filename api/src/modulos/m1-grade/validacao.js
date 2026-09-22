import { dadosInvalidos, lerInstante } from '../../erros.js';

const TIPOS = ['palestra', 'minicurso'];

const ehObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);

// R12: forma do corpo do POST /atividades. Qualquer falha aqui é DADOS_INVALIDOS
// e vem antes das regras do recurso (contrato §1).
export function lerNovaAtividade(corpo) {
  if (!ehObjeto(corpo)) throw dadosInvalidos('o corpo precisa ser um objeto');
  const { titulo, tipo, salaId, vagas, encontros } = corpo;

  if (typeof titulo !== 'string' || titulo.trim() === '') {
    throw dadosInvalidos('titulo precisa ser um texto não vazio');
  }
  if (!TIPOS.includes(tipo)) throw dadosInvalidos('tipo precisa ser palestra ou minicurso');
  if (typeof salaId !== 'string') throw dadosInvalidos('salaId precisa ser um texto');
  if (!Number.isInteger(vagas) || vagas < 1) throw dadosInvalidos('vagas precisa ser um inteiro maior ou igual a 1');
  if (!Array.isArray(encontros)) throw dadosInvalidos('encontros precisa ser uma lista');

  return {
    titulo,
    tipo,
    salaId,
    vagas,
    encontros: encontros.map((encontro, i) => {
      if (!ehObjeto(encontro)) throw dadosInvalidos(`encontros[${i}] precisa ser um objeto`);
      return {
        inicio: encontro.inicio,
        fim: encontro.fim,
        inicioMs: lerInstante(encontro.inicio, `encontros[${i}].inicio`).getTime(),
        fimMs: lerInstante(encontro.fim, `encontros[${i}].fim`).getTime(),
      };
    }),
  };
}
