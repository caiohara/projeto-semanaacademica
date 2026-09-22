import { ErroDaApi } from '../../erros.js';

// Regras de criação do POST /atividades (R16–R23), depois da forma do corpo (R12–R14).

// R16: palestra tem exatamente 1 encontro; minicurso, de 2 a 5.
const QUANTIDADE = { palestra: [1, 1], minicurso: [2, 5] };

export function validarCriacao({ tipo, encontros }) {
  const [minimo, maximo] = QUANTIDADE[tipo];
  if (encontros.length < minimo || encontros.length > maximo) {
    throw new ErroDaApi(422, 'QUANTIDADE_DE_ENCONTROS', `${tipo} precisa de ${minimo} a ${maximo} encontro(s)`);
  }
}
