import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'

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
    <section>
      <h1>Código do encontro</h1>

      {erro && (
        <p role="alert">
          {erro instanceof ErroApi ? erro.codigo : 'Não foi possível carregar o código.'}
        </p>
      )}

      {codigoDoEncontro && <p className="codigo-do-encontro">{codigoDoEncontro.codigo}</p>}
    </section>
  )
}
