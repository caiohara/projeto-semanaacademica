export class ErroApi extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem || codigo)
    this.status = status
    this.codigo = codigo
  }
}

export async function chamarApi(caminho, { metodo = 'GET', usuarioId, corpo } = {}) {
  const cabecalhos = { 'Content-Type': 'application/json' }
  if (usuarioId) cabecalhos['X-Usuario'] = usuarioId

  const resposta = await fetch(caminho, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

  const dados = resposta.status === 204 ? null : await resposta.json()

  if (!resposta.ok) {
    throw new ErroApi(resposta.status, dados?.erro, dados?.mensagem)
  }

  return dados
}
