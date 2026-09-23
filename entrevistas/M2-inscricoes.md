# Entrevista — M2 Inscrições e lista de espera

> Skill `grilling`. O agente pergunta; o grupo responde ou marca "consultar requisitos".
> Pergunta marcada "consultar requisitos" fica **Pendente** e é respondida na consulta ao documento de requisitos.
> Numeração **P-xx** contínua. O prefixo **RN** é reservado às regras do documento de requisitos e aparece só na coluna **Fonte**.

## Fatos já resolvidos pelo repositório (não são perguntas)

- Rotas, campos e códigos do M2: `contrato-api.md` §5 e §6. Não mudam.
  - `POST /atividades/:id/inscricoes` (participante) → 201 `Inscricao`, sem corpo na entrada.
  - `GET /inscricoes` (todos) → 200 `[Inscricao]` — participante recebe só as próprias; filtro `?atividadeId=`.
  - `GET /inscricoes/:id` (todos) → 200 `Inscricao`.
  - `POST /inscricoes/:id/cancelamento` (participante) → 200 `Inscricao`.
  - `POST /inscricoes/:id/confirmacao` (participante) → 200 `Inscricao`.
- Ordem geral: 401 `USUARIO_DESCONHECIDO` → 403 `SOMENTE_PARTICIPANTE` → 404 `NAO_ENCONTRADO` (atividade/inscrição da rota) → 422 `DADOS_INVALIDOS` → regras do recurso (§1). A ordem **entre** regras do recurso é regra de negócio.
- Códigos de regra do M2 (§6): `ATIVIDADE_CANCELADA`, `INSCRICOES_ENCERRADAS`, `INSCRICAO_BLOQUEADA` (só em grupos com M5), `JA_INSCRITO`, `CONFLITO_DE_HORARIO`, `LIMITE_DE_MINICURSOS` (inscrever); `CONFLITO_DE_HORARIO`, `LIMITE_DE_MINICURSOS` (confirmar convocação, de novo); `INSCRICAO_INATIVA`, `ATIVIDADE_JA_INICIADA` (cancelar).
- `Inscricao.status`: `confirmada` | `em_espera` | `convocada` | `cancelada` | `expirada` (§5). `posicaoNaEspera` só quando `em_espera`; `convocadaAte` só quando `convocada` (§5).
- `api/src/autenticacao.js` só tem `identificar` e `somenteOrganizacao` hoje; falta `somenteParticipante` (exigido pelas três rotas de participante do M2) — nota em `api/AGENTS.md`, junto com a rota de presença do M3 que também precisa dela.
- M1 já decidiu (`entrevistas/M1-grade.md`, P-10, P-12): `ocupadas` conta inscrições `confirmada` + `convocada`; `emEspera` conta só `em_espera`; cancelar a atividade cancela todas as inscrições ativas (RN-217) — efeito que o M2 implementa.
- Id da inscrição: `ins_` + 8 hex minúsculos (§1). `atividadeId`/`participanteId` vêm do M1 e dos dados iniciais (§4).
- Tempo vem do relógio do modo de teste (`api/src/relogio.js`, contrato §3), nunca da hora do sistema. O relógio fica parado entre chamadas no modo de teste.
- Datas de entrada e saída: ISO 8601 com fuso, validado por `lerInstante` em `api/src/erros.js`.

---

## Rodada 1

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-01 | Vagas esgotadas no `POST /inscricoes`: quando `vagasRestantes` da atividade é 0, a inscrição é aceita como `em_espera` (201) ou é recusada com algum erro? O contrato não lista um código de "sem vaga". | consultar requisitos | Pendente |
| P-02 | `JA_INSCRITO`: quais status de uma inscrição anterior na mesma atividade bloqueiam uma nova (`confirmada`, `em_espera`, `convocada`)? `cancelada` e `expirada` liberam nova inscrição? | consultar requisitos | Pendente |
| P-03 | Convocação: já que não há rota para criar convocação, o que a dispara — só a liberação de uma vaga (cancelamento de quem estava `confirmada`/`convocada`), ou também o aumento de `vagas` por PATCH? Quem é convocado — sempre o primeiro da fila (ordem de `criadaEm`)? | consultar requisitos | Pendente |
| P-04 | Prazo da convocação (`convocadaAte`): quanto tempo até vencer, a partir de quando a pessoa é convocada? A expiração é um estado calculado (como a `situacao` do M1, conferido a cada leitura/ação) ou precisa de algum evento para "acontecer"? | consultar requisitos | Pendente |
| P-05 | Convocação em cadeia: quando uma convocação expira (ou é recusada na confirmação), o próximo da fila é convocado automaticamente, na mesma verificação, ou fica vago até o próximo evento (ex.: um novo cancelamento)? | consultar requisitos | Pendente |
| P-06 | `LIMITE_DE_MINICURSOS`: qual o valor do limite? Conta só minicursos com status `confirmada`, ou também `convocada`/`em_espera`? Palestras entram na conta? | consultar requisitos | Pendente |
| P-07 | `CONFLITO_DE_HORARIO`: dois encontros de atividades diferentes que se sobrepõem no horário bloqueiam a inscrição? A checagem considera inscrições em qual status (`confirmada`? `convocada`? `em_espera` também)? Vale entre dois minicursos, entre minicurso e palestra, ou só entre atividades do mesmo tipo? | consultar requisitos | Pendente |
| P-08 | `INSCRICOES_ENCERRADAS`: até quando é possível se inscrever numa atividade — até o instante exato do início (mesmo critério do M1 para "iniciada"), ou existe uma antecedência mínima? | consultar requisitos | Pendente |
| P-09 | `INSCRICAO_BLOQUEADA` (§6: "só em grupos com M5"): este grupo vai implementar o M5 (painel da organização, com bloqueios)? Se não, este código nunca é devolvido pelo M2 — confirma? | consultar requisitos | Pendente |
| P-10 | Efeito do cancelamento sobre a fila: cancelar uma inscrição `confirmada` ou `convocada` libera a vaga e dispara a convocação do próximo da fila (P-03/P-05)? Cancelar uma `em_espera` só remove da fila e reordena as posições seguintes? | consultar requisitos | Pendente |
| P-11 | `INSCRICAO_INATIVA` (cancelar): cobre cancelar uma inscrição já `cancelada` e uma já `expirada`? Cobre alguma outra situação? | consultar requisitos | Pendente |
| P-12 | `ATIVIDADE_JA_INICIADA` (cancelar): mesmo critério do M1 (instante exato do início do 1º encontro, sem antecedência mínima)? Vale para cancelar inscrição em qualquer status (`confirmada`, `convocada`, `em_espera`), ou só `confirmada`? | consultar requisitos | Pendente |
| P-13 | Confirmação de convocação (`POST /confirmacao`): reconfere `CONFLITO_DE_HORARIO` e `LIMITE_DE_MINICURSOS` no momento da confirmação (§6 lista os dois códigos aqui de novo)? Se a confirmação falhar por um desses, o que acontece com a convocação — continua `convocada` até `convocadaAte` vencer, ou é cancelada/expirada na hora? | consultar requisitos | Pendente |
| P-14 | Dono da inscrição: um participante só pode cancelar/confirmar a própria inscrição. Tentar agir na inscrição de outro participante — qual erro, já que o contrato não lista um código específico para isso (mesma lacuna do M1 P-29, mas ali era "qualquer organizador pode"; aqui parece o oposto: seria `NAO_ENCONTRADO` como se a inscrição não existisse para essa pessoa, ou algum outro tratamento)? | consultar requisitos | Pendente |
| P-15 | Precedência no `POST /inscricoes`: quando mais de uma regra recusa a mesma inscrição (`ATIVIDADE_CANCELADA`, `INSCRICOES_ENCERRADAS`, `JA_INSCRITO`, `CONFLITO_DE_HORARIO`, `LIMITE_DE_MINICURSOS`, e "sem vaga" se a P-01 confirmar que isso é um estado e não erro), em que ordem são verificadas? | consultar requisitos | Pendente |
| P-16 | Precedência no cancelamento: `ATIVIDADE_JA_INICIADA` × `INSCRICAO_INATIVA` — qual vence quando os dois valem? | consultar requisitos | Pendente |
| P-17 | Precedência na confirmação: `SEM_CONVOCACAO` × `CONVOCACAO_EXPIRADA` × `CONFLITO_DE_HORARIO` × `LIMITE_DE_MINICURSOS` — em que ordem? | consultar requisitos | Pendente |
| P-18 | Fora do escopo: o M2 faz algum destes? Organização inscrever participante manualmente; participante se inscrever em nome de outro; desistir de uma convocação sem confirmar nem esperar expirar; listar a fila de espera de uma atividade (isso seria do M5?); alterar a própria posição na fila. | consultar requisitos | Pendente |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-19 | Corpo do `POST /atividades/:id/inscricoes`: o contrato diz "sem corpo na entrada". Um corpo `{}` ou com campos é ignorado, ou só é ignorado se for JSON válido (corpo não-JSON continua sendo `DADOS_INVALIDOS`, regra geral do §1)? | Corpo não-JSON → `DADOS_INVALIDOS` (regra geral, sem exceção); qualquer JSON válido (com ou sem campos) é ignorado, pois não há campos definidos para essa entrada. | Decisão do grupo; contrato §1 |
| P-20 | Corpo de `POST /inscricoes/:id/cancelamento` e `.../confirmacao` (o contrato não define entrada): mesma regra do M1 P-31 — corpo é ignorado? | Sim, mesmo critério. | Decisão do grupo; mesmo critério do M1 P-31 |
| P-21 | Ordem de `GET /inscricoes`: por `criadaEm`? Empate pelo `id`? O filtro `?atividadeId=` de valor inexistente devolve lista vazia ou `DADOS_INVALIDOS`? | Ordem por `criadaEm`, empate por `id`. `atividadeId` inexistente → lista vazia (é só um filtro). | Decisão do grupo; mesmo padrão do M1 P-17 |
| P-22 | `posicaoNaEspera`: é recalculada a cada leitura (como a `situacao` do M1), 1-indexada, considerando só quem ainda está `em_espera` na mesma atividade? | Sim. | Decisão do grupo; mesmo raciocínio do M1 P-27 |
| P-23 | Fuso dos instantes na saída (`criadaEm`, `convocadaAte`): mesma decisão do M1 P-20 (`-03:00`)? | Sim. | Decisão do grupo; mesmo critério do M1 P-20 |
| P-24 | Inscrição cujo `atividadeId` foi cancelado (efeito automático do M1 P-12: vira `cancelada`): `GET /inscricoes/:id` continua respondendo 200 normalmente com `status: "cancelada"`? | Sim. | Decisão do grupo; mesmo critério do M1 P-13 |

---

## Rodada 2

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-25 | Autoria de leitura: qualquer pessoa da organização pode ver `GET /inscricoes` (todas) e `GET /inscricoes/:id` de qualquer participante — mesmo critério do M1 P-29/M3 P-18? | Sim, mesmo critério, sem restrição por quem criou o quê. | Decisão do grupo; mesmo critério do M1 P-29 e M3 P-18 |
| P-26 | Convocação em lote: quando mais de uma vaga se abre de uma vez (vários cancelamentos juntos, ou `PATCH` aumentando `vagas` em mais de 1), convoca mais de uma pessoa da fila na mesma verificação, respeitando a ordem, ou só uma por vez (a próxima só é convocada depois que a anterior confirmar, cancelar ou expirar)? | Convoca quantas vagas estiverem livres na mesma verificação, respeitando a ordem da fila. | Decisão do grupo |
| P-27 | Confirmação depois que a atividade já começou: o contrato não lista `ATIVIDADE_JA_INICIADA` para `/confirmacao`. Se `convocadaAte` ainda não venceu mas a atividade já começou, a confirmação ainda é aceita normalmente? | Sim, aceita normalmente; `convocadaAte` é o único prazo que vale para a confirmação. | Decisão do grupo; contrato não lista `ATIVIDADE_JA_INICIADA` para `/confirmacao` |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-28 | Nova inscrição depois de cancelar/expirar uma anterior (liberada pela P-02): cria uma linha nova de `Inscricao` (novo `ins_…`, novo `criadaEm`, indo para o fim da fila se `em_espera`), mantendo o histórico da anterior, ou reaproveita a mesma linha? | Linha nova; mantém o histórico da anterior. | Decisão do grupo |
| P-29 | Precisão de `criadaEm`/`convocadaAte` com segundos e milissegundos: guardados como o relógio fornece, sem arredondamento — mesmo critério do M1 P-30/M3 P-21? | Sim. | Decisão do grupo; mesmo critério do M1 P-30 e M3 P-21 |

---

## Pendentes (consultar requisitos)

| # | Assunto | Código(s) afetado(s) |
|---|---|---|
| P-01 | Vagas esgotadas cria `em_espera` ou recusa? | (nenhum código listado no contrato) |
| P-02 | Status anteriores que bloqueiam nova inscrição | `JA_INSCRITO` |
| P-03 | Gatilho e critério da convocação | — |
| P-04 | Prazo e cálculo da expiração da convocação | `convocadaAte` |
| P-05 | Convocação em cadeia após expiração/recusa | — |
| P-06 | Valor e base de contagem do limite de minicursos | `LIMITE_DE_MINICURSOS` |
| P-07 | Base do conflito de horário (status e tipos) | `CONFLITO_DE_HORARIO` |
| P-08 | Prazo de encerramento das inscrições | `INSCRICOES_ENCERRADAS` |
| P-10 | Efeito do cancelamento sobre vaga e fila | — |
| P-11 | Situações cobertas por inscrição inativa | `INSCRICAO_INATIVA` |
| P-12 | Critério de atividade já iniciada no cancelamento | `ATIVIDADE_JA_INICIADA` |
| P-13 | Reconferência de regras na confirmação | `CONFLITO_DE_HORARIO`, `LIMITE_DE_MINICURSOS` |
| P-14 | Erro ao agir na inscrição de outra pessoa | — |
| P-15 | Precedência no `POST /inscricoes` | todos os do M2 |
| P-16 | Precedência no cancelamento | `ATIVIDADE_JA_INICIADA`, `INSCRICAO_INATIVA` |
| P-17 | Precedência na confirmação | `SEM_CONVOCACAO`, `CONVOCACAO_EXPIRADA`, `CONFLITO_DE_HORARIO`, `LIMITE_DE_MINICURSOS` |
| P-09 | Grupo implementa M5? (`INSCRICAO_BLOQUEADA` fica sem uso se não) | `INSCRICAO_BLOQUEADA` |
| P-18 | Limites de escopo do M2 | — |

---

## Encerramento

Entrevista encerrada em 2026-09-22, depois da rodada 2. Todas as perguntas de regra de negócio ficaram marcadas "consultar requisitos" (P-01 a P-18); as de técnica/contrato (P-19 a P-29) foram decididas pelo grupo, com base nos critérios já fixados nas entrevistas do M1 e do M3. Não há decisão técnica em aberto. Próximo passo: consultar o documento de requisitos para resolver as pendentes de regra de negócio; depois disso, a spec (`to-spec`).

### Decisões tomadas (técnica / contrato)

| # | Decisão | Fonte |
|---|---|---|
| P-19 | Corpo não-JSON em `POST /inscricoes` → `DADOS_INVALIDOS`; JSON válido é ignorado (não há campos de entrada) | Decisão do grupo; contrato §1 |
| P-20 | Corpo de cancelamento/confirmação é ignorado | Decisão do grupo; mesmo critério do M1 P-31 |
| P-21 | `GET /inscricoes` ordenado por `criadaEm`, empate por `id`; `atividadeId` inexistente → lista vazia | Decisão do grupo; mesmo padrão do M1 P-17 |
| P-22 | `posicaoNaEspera` recalculada a cada leitura, 1-indexada, só entre quem está `em_espera` na mesma atividade | Decisão do grupo; mesmo raciocínio do M1 P-27 |
| P-23 | Instantes de saída em `-03:00` | Decisão do grupo; mesmo critério do M1 P-20 |
| P-24 | Inscrição de atividade cancelada continua visível, com `status: "cancelada"` | Decisão do grupo; mesmo critério do M1 P-13 |
| P-25 | Qualquer pessoa da organização lê qualquer inscrição, sem restrição de autoria | Decisão do grupo; mesmo critério do M1 P-29 e M3 P-18 |
| P-26 | Convocação em lote: convoca quantas vagas estiverem livres na mesma verificação | Decisão do grupo |
| P-27 | Confirmação aceita mesmo depois do início da atividade; só `convocadaAte` limita o prazo | Decisão do grupo |
| P-28 | Reinscrição depois de cancelar/expirar cria linha nova de `Inscricao` | Decisão do grupo |
| P-29 | `criadaEm`/`convocadaAte` guardados com a precisão do relógio, sem arredondamento | Decisão do grupo; mesmo critério do M1 P-30 e M3 P-21 |
