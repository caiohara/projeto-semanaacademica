# Sessões — João Pedro Burgos

Cada execução de teste é lida pelo que mudou desde a anterior:

- **Ciclo** — vermelho logo depois de mexer só em teste, e depois verde logo depois de mexer só em código. É o TDD.
- **Nasceu verde** — verde logo depois de mexer só em teste. Ou o comportamento já existia, ou o teste não testa o que diz.
- **Juntos** — teste e código mudaram antes da mesma execução. Não houve vermelho para ver.

**Alertas:** *colou* = prompt com 10 palavras seguidas ou mais iguais às do documento de requisitos (só aparece quando o resumo é gerado com `--requisitos`); *leu* = o agente acessou um arquivo de requisitos; *anexou* = o documento foi anexado à conversa.

Requisições são chamadas ao modelo: cada passo do agente é uma. Skills contam tanto a ferramenta `skill` quanto o comando `/nome`.

| Início | Sessão | Requisições | Skills | Subagentes | Vermelhas / verdes | Ciclos | Nasceu verde | Juntos | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| 22/09 21:38 | [skill invocation logging](ses_claude_58945f3a-de1f-4204-9793-9b64fa988192.md) | 15 | grilling | — | 0 / 0 | 0 | 0 | 0 | — |
| 22/09 21:59 | [Entrevistas M2-inscricoes perguntas pendentes](ses_claude_4b98ee20-eb68-40f7-90d5-76ad84756a6e.md) | 4 | — | — | 0 / 0 | 0 | 0 | 0 | — |
| 22/09 22:03 | [Perguntas pendentes entrevistas/M2-inscricoes.md](ses_claude_12d7ff61-3bc3-4ff0-a0ed-c706d08a0b08.md) | 5 | — | — | 0 / 0 | 0 | 0 | 0 | — |
| 22/09 22:05 | [Conflitos rodada 2 revisão](ses_claude_87237d0c-6635-416c-8775-f3f149322ac4.md) | 5 | — | — | 0 / 0 | 0 | 0 | 0 | — |
| 22/09 22:07 | [M2-inscricoes skill spec](ses_claude_41c9e429-6a33-4dd7-88e0-7db2daca41cf.md) | 11 | to-spec | — | 0 / 0 | 0 | 0 | 0 | — |
| 23/09 11:49 | [M2 auditar contra specs](ses_claude_c6ad31c5-b194-45f8-81ba-2f1f0dd47deb.md) | 6 | — | auditor | 0 / 0 | 0 | 0 | 0 | — |
| 23/09 11:49 | [Audite o módulo M2 (api/src/modulos/m2-inscricoes e qualque…](ses_claude_c6ad31c5-b194-45f8-81ba-2f1f0dd47deb_ab282d20dd803017a.md) (subagente) | 15 | — | — | 0 / 5 | 0 | 0 | 0 | — |
| 23/09 11:55 | [M2 telas de inscrições app](ses_claude_878f2a51-ec78-4e54-a707-39b63e95589a.md) | 29 | — | — | 1 / 15 | 0 | 0 | 0 | — |
| | **Total: 8 sessões** | 90 | grilling, to-spec | auditor | 1 / 20 | 0 | 0 | 0 | — |
