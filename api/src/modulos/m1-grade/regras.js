import { EVENTO } from '../../dados-iniciais.js';
import { ErroDaApi } from '../../erros.js';

// Regras de criação do POST /atividades (R16–R23), depois da forma do corpo (R12–R14).

// R16: palestra tem exatamente 1 encontro; minicurso, de 2 a 5.
const QUANTIDADE = { palestra: [1, 1], minicurso: [2, 5] };
const MINUTO_MS = 60 * 1000;
// R17: duração de 60 a 240 minutos, inclusive; fim ≤ inicio fica abaixo do mínimo.
const DURACAO_MIN_MS = 60 * MINUTO_MS;
const DURACAO_MAX_MS = 240 * MINUTO_MS;

// R18: o dia conta pelo calendário de Brasília (-03:00, sem horário de verão em 2026),
// qualquer que seja o fuso em que o instante chegou.
const TRES_HORAS_MS = 3 * 60 * MINUTO_MS;
const diaEmBrasilia = (ms) => new Date(ms - TRES_HORAS_MS).toISOString().slice(0, 10);

const encontroInvalido = (mensagem) => new ErroDaApi(422, 'ENCONTRO_INVALIDO', mensagem);

export function validarCriacao({ tipo, encontros }) {
  const [minimo, maximo] = QUANTIDADE[tipo];
  if (encontros.length < minimo || encontros.length > maximo) {
    throw new ErroDaApi(422, 'QUANTIDADE_DE_ENCONTROS', `${tipo} precisa de ${minimo} a ${maximo} encontro(s)`);
  }
  for (const { inicioMs, fimMs } of encontros) {
    const duracao = fimMs - inicioMs;
    if (duracao < DURACAO_MIN_MS || duracao > DURACAO_MAX_MS) {
      throw encontroInvalido('cada encontro dura de 60 a 240 minutos');
    }
    if (diaEmBrasilia(inicioMs) !== diaEmBrasilia(fimMs)) {
      throw encontroInvalido('cada encontro começa e termina no mesmo dia (horário de Brasília)');
    }
    // R19: só dentro da semana do evento; as datas AAAA-MM-DD comparam como texto.
    const dia = diaEmBrasilia(inicioMs);
    if (dia < EVENTO.inicio || dia > EVENTO.fim) {
      throw encontroInvalido(`os encontros ficam entre ${EVENTO.inicio} e ${EVENTO.fim}`);
    }
  }
  // R20: intervalo aberto — fim de um igual ao inicio do outro não sobrepõe.
  const emOrdem = [...encontros].sort((a, b) => a.inicioMs - b.inicioMs);
  for (let i = 1; i < emOrdem.length; i++) {
    if (emOrdem[i].inicioMs < emOrdem[i - 1].fimMs) {
      throw encontroInvalido('dois encontros da mesma atividade se sobrepõem');
    }
  }
}
