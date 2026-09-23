import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'
import { adicionarNaFila, listarFila, removerDaFila } from './filaOfflineDePresencas.js'

export function TelaLeituraPresenca({ encontroId, usuarioId }) {
  const [codigo, setCodigo] = useState('')
  const [mensagem, setMensagem] = useState(null)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    let cancelado = false

    async function atualizarPendentes() {
      const fila = await listarFila()
      if (!cancelado) setPendentes(fila.length)
    }

    async function sincronizar() {
      const fila = await listarFila()
      for (const leitura of fila) {
        try {
          await chamarApi(`/encontros/${leitura.encontroId}/presencas`, {
            metodo: 'POST',
            usuarioId,
            corpo: { codigo: leitura.codigo, lidoEm: leitura.lidoEm },
          })
          await removerDaFila(leitura.id)
        } catch {
          // continua na fila para tentar depois
        }
      }
      await atualizarPendentes()
    }

    atualizarPendentes()
    window.addEventListener('online', sincronizar)
    return () => {
      cancelado = true
      window.removeEventListener('online', sincronizar)
    }
  }, [usuarioId])

  async function enviar(evento) {
    evento.preventDefault()
    setMensagem(null)
    setErro(null)
    setEnviando(true)

    if (!navigator.onLine) {
      await adicionarNaFila({ encontroId, codigo, lidoEm: new Date().toISOString() })
      setPendentes((atual) => atual + 1)
      setMensagem('Sem internet: a leitura foi guardada e será enviada quando a conexão voltar.')
      setCodigo('')
      setEnviando(false)
      return
    }

    try {
      await chamarApi(`/encontros/${encontroId}/presencas`, {
        metodo: 'POST',
        usuarioId,
        corpo: { codigo },
      })
      setMensagem('Presença registrada com sucesso.')
      setCodigo('')
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e)
      } else {
        await adicionarNaFila({ encontroId, codigo, lidoEm: new Date().toISOString() })
        setPendentes((atual) => atual + 1)
        setMensagem('Sem internet: a leitura foi guardada e será enviada quando a conexão voltar.')
        setCodigo('')
      }
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
      {pendentes > 0 && (
        <p>{pendentes === 1 ? '1 leitura pendente de envio.' : `${pendentes} leituras pendentes de envio.`}</p>
      )}
    </section>
  )
}
