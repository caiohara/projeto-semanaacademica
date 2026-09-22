// Formato de erro do contrato, seção 1: {"erro": "CODIGO", "mensagem": "texto livre"}.

export class ErroDaApi extends Error {
  constructor(status, erro, mensagem) {
    super(mensagem);
    this.status = status;
    this.erro = erro;
  }
}

export const dadosInvalidos = (mensagem) => new ErroDaApi(422, 'DADOS_INVALIDOS', mensagem);

const ISO_COM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// Datas chegam em ISO 8601 com fuso (seção 1); qualquer outra coisa é DADOS_INVALIDOS.
export function lerInstante(valor, campo) {
  if (typeof valor !== 'string' || !ISO_COM_FUSO.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw dadosInvalidos(`${campo} precisa ser uma data ISO 8601 com fuso`);
  }
  return new Date(valor);
}

export function rotaInexistente(req, res) {
  res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: `${req.method} ${req.path} não existe` });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroDaApi) {
    return res.status(erro.status).json({ erro: erro.erro, mensagem: erro.message });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'o corpo não é um JSON válido' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: 'erro inesperado no servidor' });
}
