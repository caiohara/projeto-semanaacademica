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
    <div className="flex flex-col gap-2">
      {inscricao.status === 'convocada' && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => chamar('confirmacao')}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-green-600/30 transition hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-wait disabled:opacity-60"
        >
          Confirmar convocação
        </button>
      )}
      {estaAtiva(inscricao) && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => chamar('cancelamento')}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 hover:ring-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-60"
        >
          Cancelar inscrição
        </button>
      )}
      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {erro.message}
        </p>
      )}
    </div>
  )
}
