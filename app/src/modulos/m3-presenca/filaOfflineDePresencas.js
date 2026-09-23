const NOME_BANCO = 'semana-academica-presencas'
const NOME_LOJA = 'fila'

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(NOME_BANCO, 1)
    requisicao.onupgradeneeded = () => {
      requisicao.result.createObjectStore(NOME_LOJA, { keyPath: 'id', autoIncrement: true })
    }
    requisicao.onsuccess = () => resolve(requisicao.result)
    requisicao.onerror = () => reject(requisicao.error)
  })
}

export async function adicionarNaFila({ encontroId, codigo, lidoEm }) {
  const banco = await abrirBanco()
  try {
    return await new Promise((resolve, reject) => {
      const transacao = banco.transaction(NOME_LOJA, 'readwrite')
      transacao.objectStore(NOME_LOJA).add({ encontroId, codigo, lidoEm })
      transacao.oncomplete = () => resolve()
      transacao.onerror = () => reject(transacao.error)
    })
  } finally {
    banco.close()
  }
}

export async function listarFila() {
  const banco = await abrirBanco()
  try {
    return await new Promise((resolve, reject) => {
      const requisicao = banco.transaction(NOME_LOJA, 'readonly').objectStore(NOME_LOJA).getAll()
      requisicao.onsuccess = () => resolve(requisicao.result)
      requisicao.onerror = () => reject(requisicao.error)
    })
  } finally {
    banco.close()
  }
}

export async function removerDaFila(id) {
  const banco = await abrirBanco()
  try {
    return await new Promise((resolve, reject) => {
      const transacao = banco.transaction(NOME_LOJA, 'readwrite')
      transacao.objectStore(NOME_LOJA).delete(id)
      transacao.oncomplete = () => resolve()
      transacao.onerror = () => reject(transacao.error)
    })
  } finally {
    banco.close()
  }
}
