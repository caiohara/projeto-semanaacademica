import { useState } from 'react'
import { chamarApi } from '../../api/cliente.js'

const STATUS_ATIVOS = ['confirmada', 'em_espera', 'convocada']

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
      {STATUS_ATIVOS.includes(inscricao.status) && (
        <button type="button" disabled={enviando} onClick={() => chamar('cancelamento')}>
          Cancelar inscrição
        </button>
      )}
      {erro && <p role="alert">{erro.message}</p>}
    </div>
  )
}
