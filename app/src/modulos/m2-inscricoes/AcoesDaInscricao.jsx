import { useState } from 'react'
import { chamarApi } from '../../api/cliente.js'
import { estaAtiva } from './statusDaInscricao.js'

export function AcoesDaInscricao({ inscricao, usuarioId, aoAtualizar }) {
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function chamar(acao) {
    setErro(null)
    setEnviando(true)
    try {
      const atualizada = await chamarApi(`/inscricoes/${inscricao.id}/${acao}`, {
        metodo: 'POST',
        usuarioId,
      })
      aoAtualizar?.(atualizada)
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      {inscricao.status === 'convocada' && (
        <button type="button" disabled={enviando} onClick={() => chamar('confirmacao')}>
          Confirmar convocação
        </button>
      )}
      {estaAtiva(inscricao) && (
        <button type="button" disabled={enviando} onClick={() => chamar('cancelamento')}>
          Cancelar inscrição
        </button>
      )}
      {erro && <p role="alert">{erro.message}</p>}
    </div>
  )
}
