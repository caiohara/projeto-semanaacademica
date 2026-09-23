import { useEffect, useState } from 'react'
import { chamarApi, ErroApi } from '../../api/cliente.js'

function paraInstanteDeBrasilia(datetimeLocal) {
  return datetimeLocal ? `${datetimeLocal}:00-03:00` : ''
}

const ENCONTRO_VAZIO = { inicio: '', fim: '' }

const ROTULO = 'mb-1.5 block text-sm font-medium text-gray-700'
const OBRIGATORIO = "after:ml-0.5 after:text-red-500 after:content-['*']"
const CAMPO =
  'block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-primaria focus:outline-none focus:ring-4 focus:ring-primaria/15 user-invalid:border-red-500 user-invalid:bg-red-50/40 user-invalid:focus:ring-red-500/15'

export function FormularioAtividade({ usuarioId, onCriada }) {
  const [salas, setSalas] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('palestra')
  const [salaId, setSalaId] = useState('')
  const [vagas, setVagas] = useState('')
  const [encontros, setEncontros] = useState([ENCONTRO_VAZIO])
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    chamarApi('/salas', { usuarioId }).then(setSalas)
  }, [usuarioId])

  useEffect(() => {
    if (salas && !salaId) setSalaId(salas[0]?.id ?? '')
  }, [salas, salaId])

  function alterarEncontro(indice, campo, valor) {
    setEncontros((atual) => atual.map((e, i) => (i === indice ? { ...e, [campo]: valor } : e)))
  }

  function adicionarEncontro() {
    setEncontros((atual) => [...atual, ENCONTRO_VAZIO])
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      const atividade = await chamarApi('/atividades', {
        metodo: 'POST',
        usuarioId,
        corpo: {
          titulo,
          tipo,
          salaId,
          vagas: Number(vagas),
          encontros: encontros.map((e) => ({
            inicio: paraInstanteDeBrasilia(e.inicio),
            fim: paraInstanteDeBrasilia(e.fim),
          })),
        },
      })
      onCriada?.(atividade)
      setTitulo('')
      setVagas('')
      setEncontros([ENCONTRO_VAZIO])
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nova atividade</h1>
        <p className="mt-1 text-sm text-gray-500">Cadastre uma palestra ou minicurso na programação do evento.</p>
      </div>

      <label className="block">
        <span className={`${ROTULO} ${OBRIGATORIO}`}>Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required className={CAMPO} />
      </label>

      <div className="grid gap-6 sm:grid-cols-3">
        <label className="block">
          <span className={ROTULO}>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={CAMPO}>
            <option value="palestra">Palestra</option>
            <option value="minicurso">Minicurso</option>
          </select>
        </label>

        <label className="block">
          <span className={ROTULO}>Sala</span>
          <select value={salaId} onChange={(e) => setSalaId(e.target.value)} className={CAMPO}>
            {salas?.map((sala) => (
              <option key={sala.id} value={sala.id}>
                {sala.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={`${ROTULO} ${OBRIGATORIO}`}>Vagas</span>
          <input type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} required className={CAMPO} />
        </label>
      </div>

      <fieldset className="rounded-xl border border-gray-200 bg-gray-50/60 p-5">
        <legend className="px-1 text-sm font-semibold text-gray-900">Encontros</legend>
        <div className="space-y-4">
          {encontros.map((encontro, indice) => (
            <div key={indice} className="grid gap-4 rounded-lg bg-white p-4 ring-1 ring-gray-200 sm:grid-cols-2">
              <label className="block">
                <span className={`${ROTULO} ${OBRIGATORIO}`}>{`Início do encontro ${indice + 1}`}</span>
                <input
                  type="datetime-local"
                  value={encontro.inicio}
                  onChange={(e) => alterarEncontro(indice, 'inicio', e.target.value)}
                  required
                  className={CAMPO}
                />
              </label>
              <label className="block">
                <span className={`${ROTULO} ${OBRIGATORIO}`}>{`Fim do encontro ${indice + 1}`}</span>
                <input
                  type="datetime-local"
                  value={encontro.fim}
                  onChange={(e) => alterarEncontro(indice, 'fim', e.target.value)}
                  required
                  className={CAMPO}
                />
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={adicionarEncontro}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-primaria hover:bg-primaria-clara hover:text-primaria"
        >
          <span aria-hidden="true">+ </span>
          Adicionar encontro
        </button>
      </fieldset>

      {erro && (
        <p role="alert" className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
            !
          </span>
          <span>
            {erro instanceof ErroApi ? (
              <>
                <span className="font-mono font-bold">{erro.codigo}</span>: {erro.mensagem}
              </>
            ) : (
              'Não foi possível criar a atividade.'
            )}
          </span>
        </p>
      )}

      <div className="flex justify-end border-t border-gray-100 pt-6">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-primaria px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primaria/30 transition hover:bg-primaria-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:cursor-wait disabled:opacity-60"
        >
          Criar atividade
        </button>
      </div>
    </form>
  )
}
