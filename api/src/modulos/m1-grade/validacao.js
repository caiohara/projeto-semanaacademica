import { dadosInvalidos, ErroDaApi, lerInstante } from '../../erros.js';

const TIPOS = ['palestra', 'minicurso'];
const CAMPOS_DO_ENCONTRO = ['inicio', 'fim'];
const CAMPOS_DA_ATIVIDADE = ['titulo', 'tipo', 'salaId', 'vagas', 'encontros'];

const ehObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);

// R3: filtros de GET /atividades. ?dia= é AAAA-MM-DD de um dia que existe; ?tipo= é
// palestra ou minicurso. Qualquer outro valor (inclusive o parâmetro repetido) é DADOS_INVALIDOS.
export function lerFiltros({ dia, tipo }) {
  if (dia !== undefined) {
    const valido = typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia)
      && !Number.isNaN(Date.parse(dia)) && new Date(dia).toISOString().startsWith(dia);
    if (!valido) throw dadosInvalidos('dia precisa estar no formato AAAA-MM-DD');
  }
  if (tipo !== undefined && !TIPOS.includes(tipo)) throw dadosInvalidos('tipo precisa ser palestra ou minicurso');
  return { dia, tipo };
}

// R12: forma do corpo do POST /atividades. Qualquer falha aqui é DADOS_INVALIDOS
// e vem antes das regras do recurso (contrato §1).
export function lerNovaAtividade(corpo) {
  if (!ehObjeto(corpo)) throw dadosInvalidos('o corpo precisa ser um objeto');
  // R34: id é ignorado em silêncio; qualquer outro campo fora da entrada do contrato,
  // inclusive os calculados, é recusado.
  const extra = Object.keys(corpo).find((campo) => campo !== 'id' && !CAMPOS_DA_ATIVIDADE.includes(campo));
  if (extra) throw dadosInvalidos(`${extra} não é aceito`);
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
      // R13: o encontro só tem inicio e fim; o id é gerado pelo servidor.
      const extra = Object.keys(encontro).find((campo) => !CAMPOS_DO_ENCONTRO.includes(campo));
      if (extra) throw dadosInvalidos(`encontros[${i}].${extra} não é aceito`);
      return {
        inicio: encontro.inicio,
        fim: encontro.fim,
        inicioMs: lerInstante(encontro.inicio, `encontros[${i}].inicio`).getTime(),
        fimMs: lerInstante(encontro.fim, `encontros[${i}].fim`).getTime(),
      };
    }),
  };
}

// R24: fora de titulo e vagas, nada da Atividade é editável, nem com o valor atual.
const CAMPOS_NAO_EDITAVEIS = [
  'id', 'tipo', 'salaId', 'encontros',
  'cargaHorariaMinutos', 'situacao', 'ocupadas', 'vagasRestantes', 'emEspera',
];

export function lerAlteracao(corpo) {
  const naoEditavel = Object.keys(corpo).find((campo) => CAMPOS_NAO_EDITAVEIS.includes(campo));
  if (naoEditavel) throw new ErroDaApi(422, 'CAMPO_NAO_EDITAVEL', `${naoEditavel} não pode ser alterado`);
  const { titulo, vagas } = corpo;
  return { titulo, vagas };
}
