import { useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'

export function TelaLeituraPresenca({ encontroId, usuarioId }) {
  const [codigo, setCodigo] = useState('')
  const [mensagem, setMensagem] = useState(null)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setMensagem(null)
    setErro(null)
    setEnviando(true)

    try {
      await chamarApi(`/encontros/${encontroId}/presencas`, {
        metodo: 'POST',
        usuarioId,
        corpo: { codigo },
      })
      setMensagem('Presença registrada com sucesso.')
      setCodigo('')
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1>Registrar presença</h1>

      <form onSubmit={enviar}>
        <label>
          Código
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            maxLength={6}
            required
          />
        </label>
        <button type="submit" disabled={enviando}>
          Enviar
        </button>
      </form>

      {mensagem && <p role="status">{mensagem}</p>}
      {erro && (
        <p role="alert">
          {erro instanceof ErroApi ? erro.codigo : 'Não foi possível enviar a leitura.'}
        </p>
      )}
    </section>
  )
}
