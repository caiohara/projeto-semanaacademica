import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'

function ContagemParaTroca({ trocaEm }) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const segundos = Math.max(0, Math.ceil((new Date(trocaEm).getTime() - agora) / 1000))
  return (
    <p className="inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 text-lg text-gray-300 ring-1 ring-white/15">
      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
      Próximo código em <span className="font-mono font-bold text-white tabular-nums">{segundos}s</span>
    </p>
  )
}

export function TelaCodigoEncontro({ encontroId, usuarioId }) {
  const [codigoDoEncontro, setCodigoDoEncontro] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false
    let temporizador

    async function buscar() {
      try {
        const dados = await chamarApi(`/encontros/${encontroId}/codigo`, { usuarioId })
        if (cancelado) return
        setCodigoDoEncontro(dados)
        setErro(null)
        const espera = Math.max(0, new Date(dados.trocaEm).getTime() - Date.now())
        temporizador = setTimeout(buscar, espera)
      } catch (e) {
        if (!cancelado) setErro(e)
      }
    }

    buscar()

    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [encontroId, usuarioId])

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-10 bg-black px-8 py-12 text-center text-white">
      <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-gray-400">Código do encontro</h1>

      {erro && (
        <p role="alert" className="rounded-2xl bg-red-500/15 px-8 py-5 font-mono text-3xl font-bold text-red-400 ring-1 ring-red-500/40">
          {erro instanceof ErroApi ? erro.codigo : 'Não foi possível carregar o código.'}
        </p>
      )}

      {codigoDoEncontro && (
        <>
          <p className="codigo-do-encontro rounded-3xl bg-white/5 px-12 py-8 font-mono text-[clamp(4rem,13vw,10rem)] font-bold leading-none tracking-[0.2em] ring-1 ring-white/10">
            {codigoDoEncontro.codigo}
          </p>
          <ContagemParaTroca key={codigoDoEncontro.trocaEm} trocaEm={codigoDoEncontro.trocaEm} />
          <p className="max-w-2xl text-xl leading-relaxed text-gray-400">
            Para registrar sua presença, abra a Semana Acadêmica no celular e digite o código acima. Ele muda
            sozinho: use sempre o que estiver na tela.
          </p>
        </>
      )}
    </section>
  )
}
