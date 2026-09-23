# Spec — M2 Inscrições e lista de espera

> Origem: `entrevistas/M2-inscricoes.md` (rodadas 1 e 2, consulta ao documento de requisitos, rodada de revisão e rodada de revisão da spec, 2026-09-22).
> Cada regra cita a pergunta que a originou (**P-xx**) e, quando houver, a regra do documento de requisitos (**RN-xxx**).
> Rotas, campos e códigos de erro vêm de `contrato-api.md` §5 e §6 e não mudam.

## 1. Objetivo

O participante se inscreve numa atividade; se não há vaga, entra numa lista de espera FIFO e é convocado automaticamente quando uma vaga se abre, com um prazo para confirmar. Cancelar uma inscrição confirmada ou convocada libera a vaga e convoca o próximo da fila; cancelar uma inscrição em espera só sai da fila. Qualquer pessoa da organização e o próprio participante consultam as inscrições.

## 2. Fora de escopo

Fonte: P-09, P-18 (RN-507, Seção 7).

- `INSCRICAO_BLOQUEADA` e qualquer bloqueio de inscrição do M5 — o grupo não implementa o M5. (P-09; RN-208, RN-507)
- Organização inscrever participante manualmente. (P-18; RN-218)
- Participante se inscrever em nome de outro. (P-18; RN-218)
- Desistir de uma convocação sem confirmar nem esperar `convocadaAte` vencer — não há rota para isso. (P-18)
- Listar a fila de espera de uma atividade diretamente — é do M5. (P-18; RN-219)
- Alterar a própria posição na fila. (P-18; RN-219)

## 3. Modelo

### Inscricao

| Campo | Tipo | Origem |
|---|---|---|
| `id` | string `ins_` + 8 hex minúsculos | gerado na criação (contrato §1) |
| `atividadeId` | string `atv_…` | rota (`:id` do POST); a atividade vem do M1 |
| `participanteId` | string | informado pelo cliente: quem chama (`X-Usuario`) |
| `status` | `"confirmada"` \| `"em_espera"` \| `"convocada"` \| `"cancelada"` \| `"expirada"` | calculado a cada leitura/ação (R2, R11; P-30) |
| `posicaoNaEspera` | inteiro (1, 2, …) \| `null` | derivado: só quando `status: "em_espera"` (P-22) |
| `convocadaAte` | instante \| `null` | gravado na convocação; só quando `status: "convocada"` |
| `criadaEm` | instante | gravado na criação (relógio) |

Campos derivados (`status`, `posicaoNaEspera`) não são gravados: são calculados a cada leitura ou ação que toca a inscrição/atividade (P-22, P-30). Instantes de saída em `-03:00` (P-23; mesmo critério do M1 P-20). `criadaEm`/`convocadaAte` guardados com a precisão do relógio, sem arredondamento (P-29).

Reinscrever depois de cancelar/expirar uma inscrição anterior cria uma linha nova de `Inscricao` (novo `id`, novo `criadaEm`), mantendo a anterior no histórico (P-28).

## 4. Endpoints

| Método | Rota | Quem | Corpo | Sucesso |
|---|---|---|---|---|
| POST | `/atividades/:id/inscricoes` | participante | ignorado | 201 `Inscricao` |
| GET | `/inscricoes` | todos | — (filtro `?atividadeId=`) | 200 `[Inscricao]` |
| GET | `/inscricoes/:id` | todos | — | 200 `Inscricao` |
| POST | `/inscricoes/:id/cancelamento` | participante | ignorado | 200 `Inscricao` |
| POST | `/inscricoes/:id/confirmacao` | participante | ignorado | 200 `Inscricao` |

Herdado do contrato (§1, §6), vale para todas as rotas acima e não é regra R: sem `X-Usuario` ou id desconhecido → 401 `USUARIO_DESCONHECIDO`; organização em rota de participante → 403 `SOMENTE_PARTICIPANTE`; `:id` inexistente (atividade no POST de inscrição, inscrição nas demais) → 404 `NAO_ENCONTRADO`; corpo que não é JSON → 422 `DADOS_INVALIDOS`. Ordem: 401 → 403 → 404 → 422 `DADOS_INVALIDOS` → regras do recurso. Tempo sempre do relógio do modo de teste; a convocação em cadeia é **lazy**: só acontece quando uma requisição toca a atividade ou a inscrição (R11; P-30).

## 5. Regras

### Corpo

- **R1** — Corpo de `POST /atividades/:id/inscricoes`: como não há campos de entrada definidos, qualquer JSON válido (`{}`, com ou sem campos) é ignorado; corpo não-JSON → 422 `DADOS_INVALIDOS` (regra geral do contrato §1, sem exceção). Mesmo critério para o corpo de `/cancelamento` e `/confirmacao`. (P-19, P-20; contrato §1)

### Inscrever (`POST /atividades/:id/inscricoes`)

- **R2** — Sem vaga (`vagasRestantes` da atividade em 0), a inscrição nasce com `status: "em_espera"` e responde 201 — não é erro. (P-01; RN-205)
- **R3** — 409 `JA_INSCRITO` quando já existe, na mesma atividade e para o mesmo participante, uma inscrição com `status` `confirmada`, `em_espera` ou `convocada`. Uma inscrição anterior `cancelada` ou `expirada` libera nova inscrição. (P-02; RN-204)
- **R4** — Inscrição em atividade cancelada → 422 `ATIVIDADE_CANCELADA`. (contrato §6)
- **R5** — 422 `INSCRICOES_ENCERRADAS` quando o relógio está a 30 minutos ou menos do início do 1º encontro da atividade (relógio ≥ início do 1º encontro − 30 min). (P-08, P-31; RN-202)
- **R6** — 409 `CONFLITO_DE_HORARIO` quando algum encontro da atividade se sobrepõe, no horário, a um encontro de outra atividade em que o participante tem inscrição `confirmada` ou `convocada`. `em_espera` não conta. Vale entre quaisquer tipos de atividade (palestra ou minicurso). (P-07; RN-206)
- **R7** — 422 `LIMITE_DE_MINICURSOS` quando a inscrição levaria o participante a mais de 3 minicursos com inscrição `confirmada` ou `convocada` (contando esta, se fosse aceita direto como `confirmada`); `em_espera` e palestras não entram na conta. Limite: 3. (P-06; RN-207)
- **R8** — Precedência em `POST /atividades/:id/inscricoes`: 404 (atividade inexistente) → `ATIVIDADE_CANCELADA` (R4) → `INSCRICOES_ENCERRADAS` (R5) → `JA_INSCRITO` (R3) → `CONFLITO_DE_HORARIO` (R6) → `LIMITE_DE_MINICURSOS` (R7) → sem vaga → `em_espera` (R2). (P-15; RN-208)

### Cancelar (`POST /inscricoes/:id/cancelamento`)

- **R9** — 422 `ATIVIDADE_JA_INICIADA` quando o relógio está no instante exato do início do 1º encontro da atividade ou depois. Vale para inscrição em qualquer status ativo (`confirmada`, `convocada`, `em_espera`). (P-12; RN-209)
- **R10** — 422 `INSCRICAO_INATIVA` quando a inscrição já está `cancelada` ou `expirada`. (P-11; RN-210)
- **R11** — Precedência no cancelamento: `ATIVIDADE_JA_INICIADA` (R9) vence `INSCRICAO_INATIVA` (R10) quando as duas valem. (P-16, P-32; RN-209, RN-210)
- **R12** — Cancelar inscrição `confirmada` ou `convocada` muda o `status` para `cancelada`, libera a vaga e convoca o próximo da fila (R14). Cancelar `em_espera` muda o `status` para `cancelada` e só remove da fila, sem liberar vaga nem convocar ninguém. (P-10; RN-211)
- **R13** — Um participante só cancela a própria inscrição; tentar cancelar a inscrição de outro participante → 404 `NAO_ENCONTRADO`. (P-14; RN-218)

### Convocação (efeito de vaga liberada — sem rota própria)

- **R14** — Toda vaga que se abre — por cancelamento de inscrição `confirmada`/`convocada` (R12), por convocação vencida (R16) ou por aumento de `vagas` via `PATCH /atividades/:id` do M1 — convoca o próximo da fila, FIFO por ordem de `criadaEm` (empate pelo `id`, mesmo critério de ordenação da R21). A convocação grava `status: "convocada"` e `convocadaAte`. (P-03; RN-211, RN-216)
- **R15** — Se mais de uma vaga se abre de uma vez (vários cancelamentos juntos, ou `PATCH` aumentando `vagas` em mais de 1), convoca quantas pessoas couberem nas vagas livres, na mesma verificação, respeitando a ordem da fila. (P-26)
- **R16** — `convocadaAte` é o instante da convocação mais 2 horas, sem limite pelo fechamento das inscrições (o encerramento das inscrições, R5, não bloqueia confirmação nem convocação já em curso). A expiração é **lazy**: uma requisição que toca a atividade ou a inscrição, ao detectar que o relógio já passou de `convocadaAte`, muda o `status` para `expirada`, libera a vaga e convoca o próximo — repetindo até esgotar a fila ou as vagas disponíveis. (P-04, P-05, P-30; RN-211, RN-212, RN-213)

### Confirmar convocação (`POST /inscricoes/:id/confirmacao`)

- **R17** — 422 `SEM_CONVOCACAO` quando a inscrição não está com `status: "convocada"` no momento da confirmação (nunca foi convocada, já confirmou, foi cancelada, ou já expirou — R16 roda antes e pode mudar o status para `expirada`). (P-13, P-17; RN-214, RN-215)
- **R18** — 422 `CONVOCACAO_EXPIRADA` quando `convocadaAte` já venceu no momento da confirmação (a expiração lazy da R16 já teria mudado o status para `expirada`, então este código cobre o caso em que a checagem de tempo da confirmação roda antes de gravar a expiração). (P-17; RN-214, RN-215)
- **R19** — A confirmação reconfere `CONFLITO_DE_HORARIO` (R6) e `LIMITE_DE_MINICURSOS` (R7) no momento da confirmação. Se falhar por um dos dois, a convocação **continua** `convocada` até `convocadaAte` vencer — não é cancelada nem expirada na hora. (P-13; RN-214)
- **R20** — A confirmação é aceita mesmo depois que a atividade já começou; `ATIVIDADE_JA_INICIADA` não se aplica a `/confirmacao` (não está no contrato para esta rota) — só `convocadaAte` limita o prazo. (P-27)
- **R20a** — Sucesso muda `status` para `confirmada`; `convocadaAte` volta a `null`. (P-33; contrato §5)
- **R21** — Precedência na confirmação: `SEM_CONVOCACAO` (R17) → `CONVOCACAO_EXPIRADA` (R18) → `CONFLITO_DE_HORARIO` (R6) → `LIMITE_DE_MINICURSOS` (R7). (P-17; RN-214, RN-215)
- **R21a** — Um participante só confirma a própria inscrição; tentar confirmar a inscrição de outro participante → 404 `NAO_ENCONTRADO`, mesmo critério do cancelamento (R13). (P-34; RN-218)

### Leitura

- **R22** — `GET /inscricoes` (organização): devolve todas as inscrições, de qualquer participante, sem restrição de autoria. `GET /inscricoes` (participante): devolve só as próprias. Ordem: `criadaEm` crescente, empate pelo `id`. Filtro `?atividadeId=` com valor que não corresponde a nenhuma inscrição → lista vazia (não é erro). (P-21, P-25; mesmo padrão do M1 P-17, M1 P-29, M3 P-18)
- **R23** — `GET /inscricoes/:id`: qualquer pessoa da organização vê qualquer inscrição; um participante só vê a própria — inscrição de outro participante → 404 `NAO_ENCONTRADO` (mesmo critério de "não encontrado para essa pessoa" da R13). (P-14, P-25; RN-218)
- **R24** — `posicaoNaEspera` é recalculada a cada leitura: 1-indexada, considerando só as inscrições `em_espera` da mesma atividade, ordenadas por `criadaEm` (empate pelo `id`). (P-22)
- **R25** — Inscrição de uma atividade cancelada (efeito automático do M1) continua respondendo 200 normalmente, com `status: "cancelada"`. (P-24; mesmo critério do M1 P-13)

## 6. Critérios de aceite

Todos partem de `POST /_teste/reset` (relógio em `2026-10-13T09:00:00-03:00`) e usam as atividades e o relógio do M1. "Atividade M" = minicurso na `lab-3` com `vagas: 1` e um encontro de `2026-10-19T19:00:00-03:00` a `2026-10-19T21:00:00-03:00`, criado por `org-ana`.

1. (R2) Atividade M com `vagasRestantes: 0`; `p-diego` se inscreve → 201, `status: "em_espera"`, `posicaoNaEspera: 1`.
2. (R3) `p-carla` inscrita `confirmada` em M; nova tentativa de `p-carla` → 409 `JA_INSCRITO`. Cancelar a inscrição e tentar de novo → 201 (libera).
3. (R4) M cancelada (pelo M1); `p-carla` tenta se inscrever → 422 `ATIVIDADE_CANCELADA`.
4. (R5) Relógio em `2026-10-19T18:29:59-03:00` → 201; relógio em `2026-10-19T18:30:00-03:00` → 422 `INSCRICOES_ENCERRADAS`.
5. (R6) `p-carla` `confirmada` numa atividade com encontro 19/10 19–21h; tenta se inscrever em M (mesmo horário, sala diferente) → 409 `CONFLITO_DE_HORARIO`. Se a inscrição anterior fosse `em_espera`, a nova inscrição em M → 201.
6. (R7) `p-carla` `confirmada` em 3 minicursos sem conflito de horário; tenta um 4º → 422 `LIMITE_DE_MINICURSOS`. Uma 4ª palestra → 201.
7. (R8) M cancelada + fora do prazo de inscrição + `JA_INSCRITO` aplicável → `ATIVIDADE_CANCELADA` (a mais externa vence).
8. (R9) Inscrição `confirmada` em M; relógio em `2026-10-19T19:00:00-03:00` (início exato) → cancelar → 422 `ATIVIDADE_JA_INICIADA`; relógio um segundo antes → cancelar → 200.
9. (R10) Cancelar a mesma inscrição duas vezes → a 2ª é 422 `INSCRICAO_INATIVA`.
10. (R11) Inscrição `em_espera` numa atividade já iniciada (relógio no instante exato do início) e sem cancelamento anterior → cancelar → 422 `ATIVIDADE_JA_INICIADA` (vence `INSCRICAO_INATIVA`, que não se aplicaria aqui de qualquer forma — usar um cenário onde a inscrição já está `cancelada` e a atividade já iniciou: cancelar de novo → 422 `ATIVIDADE_JA_INICIADA`).
11. (R12) Atividade M com `vagas: 1`; `p-carla` `confirmada`, `p-diego` `em_espera` (posição 1); `p-carla` cancela → `status: "cancelada"`, `p-diego` passa a `convocada` com `convocadaAte` = relógio + 2h.
12. (R12) `p-diego` `em_espera` (único na fila) cancela → `status: "cancelada"`; nenhuma convocação acontece, vaga permanece livre.
13. (R13) `p-carla` tenta cancelar a inscrição de `p-diego` → 404 `NAO_ENCONTRADO`.
14. (R14, R15) Atividade M com `vagas: 2`, `p-carla` e `p-diego` `confirmada`, `p-elisa` e `p-fabio` `em_espera` nessa ordem; `PATCH /atividades/M {"vagas": 4}` (M1) → `p-elisa` e `p-fabio` passam a `convocada`.
15. (R16) `p-diego` convocado às 19/10 10:00 (`convocadaAte` = 12:00); relógio avança para 12:00:01 e uma requisição toca a inscrição (`GET /inscricoes/:id`) → `status: "expirada"`, próximo da fila convocado nessa mesma leitura.
16. (R17) Inscrição `confirmada` (nunca convocada); confirmar → 422 `SEM_CONVOCACAO`. Inscrição já `confirmada` por uma convocação anterior; confirmar de novo → 422 `SEM_CONVOCACAO`.
17. (R18) `convocadaAte` vencido no exato instante da checagem de confirmação → 422 `CONVOCACAO_EXPIRADA`.
18. (R19) `p-diego` convocado numa atividade que agora conflita de horário com outra `confirmada` dele; confirmar → 422 `CONFLITO_DE_HORARIO`; `status` continua `convocada`, `convocadaAte` inalterado.
19. (R20) `p-diego` convocado numa atividade com relógio já depois do início; `convocadaAte` ainda não venceu; confirmar → 200, `status: "confirmada"`.
20. (R20a) Confirmação bem-sucedida → `status: "confirmada"`, `convocadaAte: null`.
21. (R21) Convocação vencida e com conflito de horário → `CONVOCACAO_EXPIRADA` (vence `CONFLITO_DE_HORARIO`).
22. (R21a) `p-carla` tenta confirmar a convocação de `p-diego` → 404 `NAO_ENCONTRADO`.
23. (R22) `org-ana` lista `GET /inscricoes` → vê inscrições de `p-carla` e `p-diego`; `p-carla` lista `GET /inscricoes` → só as próprias. Duas inscrições com o mesmo `criadaEm` → ordem por `id`. `?atividadeId=atv_inexistente` → `[]`.
24. (R23) `p-carla` faz `GET /inscricoes/:id` da inscrição de `p-diego` → 404 `NAO_ENCONTRADO`; `org-bruno` faz o mesmo `GET` → 200.
25. (R24) M com `vagas: 1`, três inscrições `em_espera` em ordem de chegada → `posicaoNaEspera` 1, 2, 3; a primeira cancela → as outras duas passam a 1 e 2 na leitura seguinte.
26. (R25) Atividade M cancelada (efeito do M1); `GET /inscricoes/:id` de uma inscrição que estava `confirmada` nela → 200, `status: "cancelada"`.
27. (R1) `POST /atividades/M/inscricoes` com corpo `"não é json"` → 422 `DADOS_INVALIDOS`; com `{}` ou `{"qualquer":1}` → 201 (corpo ignorado). Mesmo padrão em `/cancelamento` e `/confirmacao`.
28. (contrato §1) Organização chamando `POST /atividades/:id/inscricoes`, `/cancelamento` ou `/confirmacao` → 403 `SOMENTE_PARTICIPANTE`; atividade inexistente → 404 `NAO_ENCONTRADO`; inscrição inexistente em `/cancelamento`, `/confirmacao` ou `GET /inscricoes/:id` → 404 `NAO_ENCONTRADO`.

## 7. Como isto será verificado

Pela costura HTTP, a mesma dos demais módulos: `api/test/apoio/api.js` (`subirApi`) sobe a API com `MODO_TESTE=1` e banco temporário. Os testes ficam em `api/test/m2-inscricoes.test.js`, usam `fetch`, `POST /_teste/reset` antes de cada cenário e `PUT /_teste/relogio` para mover o tempo e expor a convocação/expiração lazy (R14, R16). Nenhum ponto de teste novo: convocação e expiração não têm rota própria, mas são observáveis tocando a atividade (`GET /atividades/:id`, do M1) ou a inscrição (`GET /inscricoes/:id`) depois de mover o relógio.

Cenários montam a atividade pelas rotas do M1 (`POST /atividades`, `PATCH /atividades/:id`, `POST /atividades/:id/cancelamento`), nunca por escrita direta no banco — mesmo critério do M3 (P-24 do M1, R31 do M3). A implementação do M2 depende do M1 existir (atividade, `vagasRestantes`) e é pré-requisito do M3 (inscrição `confirmada`).

## 8. Fatias de entrega

1. **Inscrever sem fila** — R1, R2 (só o 201 direto quando há vaga), R3, R4, R5, R6, R7, R8, R22 (sem `posicaoNaEspera`), R23. Critérios 2–7, 23 (parcial), 24, 27, 28.
2. **Cancelar sem convocação** — R9, R10, R11, R13, R12 (só o caso `em_espera`, sem convocar). Critérios 8–10, 12, 13.
3. **Fila e convocação** — R2 (com `em_espera`), R12 (caso `confirmada`/`convocada`), R14, R15, R16, R24, R25. Critérios 1, 11, 14, 15, 25, 26.
4. **Confirmar convocação** — R17, R18, R19, R20, R20a, R21, R21a. Critérios 16–22.
5. **Autoria e leitura completas** — R22 (autoria plena). Critério 23 (completo).
