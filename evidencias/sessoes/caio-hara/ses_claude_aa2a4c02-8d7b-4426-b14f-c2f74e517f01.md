# M1-grade skill specification

| | |
|---|---|
| Sessão | `ses_claude_aa2a4c02-8d7b-4426-b14f-c2f74e517f01` |
| Pasta | Atividade Final IA/projeto-semanaacademica |
| Período | 22/09 20:34 → 22/09 20:40 |
| Modelo | anthropic/claude-opus-5-5 |
| Requisições ao modelo | 13 |
| Tokens de entrada / saída | 26 / 24.004 |
| Skills | to-spec |
| Subagentes | — |
| Execuções de teste | 0 vermelhas, 0 verdes |
| TDD | 0 ciclo(s) vermelho → verde · 0 teste(s) que já nasceram verdes · 0 vez(es) teste e código juntos |
| Arquivos editados | 0 de teste, 0 de código, 0 de entrevista, 1 de spec, 0 de contexto, 0 de auditoria |
| Alertas | — |

## Linha do tempo

- `22/09 20:34` **prompt** — <pasted_content id="3198"> Use a skill to-spec. Escreva specs/M1-grade.md a partir de entrevistas/M1-grade.md. Cada regra cita a pergunta que a originou (P-xx) e, se houver, a regra do documento (RN-xxx). Siga as oito seções do modelo da skill. As regras são numeradas R1..Rn. Não invente nada que não esteja na entrevista. </pasted_content id="3198">
- `22/09 20:34` carrega a skill **to-spec**
- `22/09 20:36` edita spec `specs/M1-grade.md`
- `22/09 20:38` **prompt** — <pasted_content id="3198"> Respostas aos quatro pontos em aberto: 1. Campo desconhecido ou id no corpo do POST: mesmo comportamento do PATCH (P-19). Campo desconhecido → DADOS_INVALIDOS. Campo id no corpo → ignorado, porque o id é gerado pelo servidor e não faz parte da entrada. Acrescente uma regra nova para cobrir o POST. Fonte: decisão do grupo, mesma regra do PATCH (P-19). 2. Encontros da mes…
- `22/09 20:40` **prompt** — <pasted_content id="3198"> Correto. No POST: id no corpo é ignorado silenciosamente; qualquer outro campo fora de {titulo, tipo, salaId, vagas, encontros} → DADOS_INVALIDOS, incluindo campos calculados como situacao, ocupadas, emEspera, vagasRestantes, cargaHorariaMinutos. Atualize R34 com essa distinção se ainda não estiver explícita. Confirme quando terminar. </pasted_content id="3198">
