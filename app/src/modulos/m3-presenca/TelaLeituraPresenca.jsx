import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'
import { adicionarNaFila, listarFila, removerDaFila } from './filaOfflineDePresencas.js'

const SEM_INTERNET = 'Sem internet: a leitura foi guardada e será enviada quando a conexão voltar.'

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
      setMensagem(SEM_INTERNET)
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
        setMensagem(SEM_INTERNET)
        setCodigo('')
      }
    } finally {
      setEnviando(false)
    }
  }

  const guardadaSemInternet = mensagem === SEM_INTERNET

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Registrar presença</h1>
        <p className="mt-2 text-sm text-gray-500">Digite o código de 6 caracteres que aparece na tela da sala.</p>
      </div>

      <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <label className="block">
          <span className="mb-2 block text-center text-sm font-medium text-gray-700">Código</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            maxLength={6}
            required
            autoComplete="off"
            spellCheck={false}
            className="block w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-5 text-center font-mono text-4xl font-bold tracking-[0.4em] text-gray-900 transition placeholder:text-gray-300 focus:border-primaria focus:bg-white focus:outline-none focus:ring-4 focus:ring-primaria/15"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-primaria px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-primaria/30 transition hover:bg-primaria-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:cursor-wait disabled:opacity-60"
        >
          Enviar
        </button>
      </form>

      {mensagem && (
        <p
          role="status"
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${
            guardadaSemInternet ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-green-50 text-green-800 ring-green-200'
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
              guardadaSemInternet ? 'bg-orange-500' : 'bg-green-600'
            }`}
          >
            {guardadaSemInternet ? '↻' : '✓'}
          </span>
          {mensagem}
        </p>
      )}
      {erro && (
        <p role="alert" className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
            ✕
          </span>
          <span className="font-mono font-bold">
            {erro instanceof ErroApi ? erro.codigo : 'Não foi possível enviar a leitura.'}
          </span>
        </p>
      )}
      {pendentes > 0 && (
        <p className="fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-white" />
          {pendentes === 1 ? '1 leitura pendente de envio.' : `${pendentes} leituras pendentes de envio.`}
        </p>
      )}
    </section>
  )
}
