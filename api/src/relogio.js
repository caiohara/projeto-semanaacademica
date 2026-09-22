// Toda regra que depende de tempo pergunta a hora aqui, nunca ao Date direto.
// No modo de teste o relógio fica parado e só muda por PUT /_teste/relogio (contrato, seção 3).

export const INSTANTE_DO_RESET = new Date('2026-10-13T09:00:00-03:00');

export function criarRelogio({ modoTeste }) {
  let parado = modoTeste ? new Date(INSTANTE_DO_RESET) : null;

  return {
    agora: () => (parado ? new Date(parado) : new Date()),
    ajustar(instante) {
      parado = new Date(instante);
    },
  };
}
