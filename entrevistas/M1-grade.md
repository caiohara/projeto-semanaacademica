# Entrevista — M1 Grade de atividades

> Skill `grilling`. O agente pergunta; o grupo responde ou marca "consultar requisitos".
> Pergunta marcada "consultar requisitos" fica **Pendente** e é respondida na consulta ao documento de requisitos.
> Numeração **P-xx** contínua. O prefixo **RN** é reservado às regras do documento de requisitos e aparece só na coluna **Fonte**.

## Fatos já resolvidos pelo repositório (não são perguntas)

- Rotas, campos e códigos do M1: `contrato-api.md` §5 e §6. Não mudam.
- Ordem geral: 401 → 403 `SOMENTE_ORGANIZACAO` → 404 `NAO_ENCONTRADO` → 422 `DADOS_INVALIDOS` → regras do recurso (§1). Logo, um erro de corpo (`DADOS_INVALIDOS`) sempre vence qualquer erro de regra. A ordem **entre** regras do recurso é regra de negócio.
- Códigos de regra do M1 (§6): `QUANTIDADE_DE_ENCONTROS`, `ENCONTRO_INVALIDO`, `VAGAS_ACIMA_DA_CAPACIDADE`, `CONFLITO_DE_SALA` (criar); `CAMPO_NAO_EDITAVEL`, `VAGAS_ABAIXO_DOS_INSCRITOS`, `VAGAS_ACIMA_DA_CAPACIDADE`, `ATIVIDADE_CANCELADA` (alterar); `ATIVIDADE_JA_INICIADA`, `ATIVIDADE_CANCELADA` (cancelar).
- `encontros` na saída vêm em ordem de início (§5).
- Campo com `null` ou tipo errado (ex.: `"vagas": "20"`, `"titulo": null`) → 422 `DADOS_INVALIDOS` (§1).
- Tempo vem do relógio do modo de teste (`api/src/relogio.js`, contrato §3), nunca da hora do sistema.
- Datas de entrada: ISO 8601 com fuso (§1), validado por `lerInstante` em `api/src/erros.js`.
- Ids: prefixo + 8 hex minúsculos, `atv_` e `enc_` (§1).
- Evento: 19/10/2026 (seg) a 23/10/2026 (sex), horário de Brasília. Salas e capacidades: §4.

---

## Rodada 1

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-01 | Quantidade de encontros por tipo (`QUANTIDADE_DE_ENCONTROS`): quantos encontros uma palestra aceita? E um minicurso — qual o mínimo e o máximo? | Palestra: exatamente 1 encontro. Minicurso: mínimo 2 e máximo 5 encontros. | RN-102, RN-103. |
| P-02 | O que torna um encontro inválido (`ENCONTRO_INVALIDO`)? Quais destas condições valem: (a) `fim` depois de `inicio`; (b) dentro do período do evento, 19–23/10 em Brasília; (c) começa e termina no mesmo dia; (d) duração mínima e/ou máxima — quais valores; (e) encontros da mesma atividade não podem se sobrepor; (f) `inicio` no futuro em relação ao relógio; (g) faixa de horário permitida no dia — qual; (h) alguma outra? | Encontro inválido quando: duração inferior a 1 hora ou superior a 4 horas; não inicia e termina no mesmo dia; fora do período 19–23/10/2026; sobrepõe outro encontro da mesma atividade. As condições (f) início no futuro e (g) faixa de horário não constam no documento. | RN-104, RN-105, RN-106. |
| P-03 | Vagas × capacidade (`VAGAS_ACIMA_DA_CAPACIDADE`): `vagas` pode ser igual à capacidade da sala, ou precisa ser menor? | `vagas` pode ser igual à capacidade da sala. `VAGAS_ACIMA_DA_CAPACIDADE` só quando o valor ultrapassa a capacidade. | RN-107. |
| P-04 | Conflito de sala (`CONFLITO_DE_SALA`): o que conta como conflito? Encostar (`fim` de um encontro = `inicio` de outro na mesma sala) conflita? Existe intervalo mínimo entre atividades na mesma sala — qual? Atividade cancelada continua ocupando a sala? | Intervalo mínimo de 15 minutos entre o fim de um encontro e o início do seguinte na mesma sala; atividades que apenas se encostam geram `CONFLITO_DE_SALA`. Atividade cancelada não ocupa a sala. | RN-108. |
| P-05 | Precedência no POST: quando mais de uma regra recusa a mesma criação (`QUANTIDADE_DE_ENCONTROS`, `ENCONTRO_INVALIDO`, `VAGAS_ACIMA_DA_CAPACIDADE`, `CONFLITO_DE_SALA`), em que ordem são verificadas? | Ordem: `QUANTIDADE_DE_ENCONTROS` → `ENCONTRO_INVALIDO` → `VAGAS_ACIMA_DA_CAPACIDADE` → `CONFLITO_DE_SALA`. | Decisão do grupo (documento consultado, seção não especifica). |
| P-06 | Campos editáveis no PATCH (`CAMPO_NAO_EDITAVEL`): quais dos campos `titulo`, `tipo`, `salaId`, `vagas`, `encontros` podem ser alterados? A editabilidade muda com o tempo ou o estado (ex.: depois da primeira inscrição, depois do início)? | Após a criação, só `titulo` e `vagas` são editáveis. `salaId`, `tipo` e `encontros` não podem ser alterados em nenhuma circunstância. | RN-110. |
| P-07 | Redução de vagas (`VAGAS_ABAIXO_DOS_INSCRITOS`): o novo `vagas` é comparado com qual número (ocupadas? ocupadas + em espera?) e pode ser igual a ele, ou precisa ser maior? | O novo `vagas` é comparado com `ocupadas` e pode ser igual. Lista de espera não entra na conta. | RN-111. |
| P-08 | Alterar e cancelar depois do início: PATCH é permitido em atividade em andamento ou encerrada? A partir de que instante a atividade conta como "já iniciada" para `ATIVIDADE_JA_INICIADA`? Cancelar exige alguma antecedência mínima — qual? | Cancelamento só antes do início da atividade, sem antecedência mínima. A atividade conta como iniciada no instante exato do início do 1º encontro. O documento não menciona bloqueio de PATCH em atividade em andamento ou encerrada. | RN-110, RN-112, Regras Gerais Seção 5. |
| P-09 | Situação calculada (`prevista` / `em_andamento` / `encerrada` / `cancelada`): quando cada uma começa e termina? Entre dois encontros em dias diferentes a atividade está `em_andamento` ou `prevista`? No instante exato de `inicio` e de `fim`, qual é a situação? `cancelada` prevalece sobre as demais? | `prevista` → `em_andamento` no instante exato do início do 1º encontro; `em_andamento` → `encerrada` no instante exato do fim do último encontro. `cancelada` prevalece sobre todas. | RN-114. |
| P-10 | Contagens da Atividade: (a) `ocupadas` — quais status de inscrição do M2 contam (`confirmada`? `convocada`?); (b) `emEspera` — quais status contam (só `em_espera`? `convocada` também?); (c) `vagasRestantes` — é `vagas − ocupadas`? Pode ficar negativo ou tem piso 0? (d) em atividade cancelada, o que as três contagens mostram? | (a) `confirmada` e `convocada` contam em `ocupadas`. (b) `emEspera` conta só `em_espera`; `convocada` não entra. (c) `vagasRestantes = vagas − ocupadas`; não fica negativo porque o PATCH impede reduzir `vagas` abaixo de `ocupadas`. (d) Numa atividade cancelada, todas as inscrições foram canceladas (RN-217), então `ocupadas: 0`, `emEspera: 0`, `vagasRestantes: vagas`. | RN-111, RN-205, Seção 5.2. `vagasRestantes`: decisão do grupo, apoiada em RN-111. Atividade cancelada: RN-217 e P-27 (contagens calculadas na leitura). |
| P-11 | Carga horária (`cargaHorariaMinutos`): é a soma das durações dos encontros? Há arredondamento, desconto (intervalo) ou teto? | Soma exata das durações dos encontros em minutos, sem arredondamento. | RN-109. |
| P-12 | Efeitos do cancelamento: cancelar a atividade faz algo com as inscrições e com a lista de espera? Isso é responsabilidade do M1 ou do M2? | Cancelar a atividade cancela todas as inscrições ativas. Tratado no M2. | RN-217. |
| P-13 | Visibilidade: atividades canceladas aparecem em `GET /atividades` e em `GET /atividades/:id`? Para todos os perfis? | Canceladas aparecem em `GET /atividades` e em `GET /atividades/:id`, para todos os perfis. | RN-115. |
| P-14 | Fora do escopo: o M1 faz algum destes? Excluir atividade, reativar atividade cancelada, criar sala, cadastrar palestrante/descrição, limitar quantas atividades um organizador cria. | Excluir atividade e reativar atividade cancelada: impossível / fora do escopo. Criar sala, cadastrar palestrante e limitar atividades por organizador: fora do escopo. | RN-113, Seção 7. |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-15 | Validação de corpo no POST/PATCH: o que é `422 DADOS_INVALIDOS`? | `titulo` precisa ser string não vazia após trim; `tipo` fora de `palestra`/`minicurso`; `vagas` precisa ser inteiro ≥ 1 (0, negativo ou decimal → `DADOS_INVALIDOS`); `encontros` precisa ser array de objetos com `inicio` e `fim` ISO 8601 com fuso; campo obrigatório ausente ou de tipo errado. Array `encontros` vazio → `QUANTIDADE_DE_ENCONTROS`, não `DADOS_INVALIDOS`. | Ausente / tipo errado → 422: contrato §1. Valores de `tipo`: contrato §5 (Atividade). Datas ISO com fuso: contrato §1. Título não vazio, `vagas` ≥ 1 e array vazio: decisão do grupo (rodada 1), o contrato não fixa. |
| P-16 | `salaId` inexistente no corpo: 404 `NAO_ENCONTRADO` ou 422 `DADOS_INVALIDOS`? | 422 `DADOS_INVALIDOS`. | Decisão do grupo (rodada 1). O contrato não trata id inexistente dentro do corpo: §1 põe a existência (404) antes da validação do corpo e §6 descreve 404 como "recurso inexistente", o que se refere ao recurso da rota. |
| P-17 | Ordem de `GET /atividades`. | Pelo `inicio` do primeiro encontro; empate pelo `id`. | Decisão do grupo (rodada 1). O contrato só fixa a ordem dos encontros dentro da atividade (§5). |
| P-18 | Filtros de `GET /atividades`: `?dia=` casa a atividade que tem algum encontro naquele dia no fuso de Brasília? `dia` ou `tipo` com valor inválido → 422 `DADOS_INVALIDOS` ou lista vazia? Os dois filtros combinam (E)? | `?dia=` casa atividades com encontro naquele dia pelo calendário de Brasília. `?tipo=` filtra por `palestra` ou `minicurso`. Os dois filtros combinam (E). Valor inválido em qualquer filtro → 422 `DADOS_INVALIDOS`. | RN-116. Código de erro e combinação dos filtros: decisão do grupo. |
| P-19 | PATCH com corpo `{}` ou com campos fora da entrada (`id`, `situacao`, `ocupadas`, campo desconhecido). | `{}` → 200 sem mudança. `id` e campos calculados → `CAMPO_NAO_EDITAVEL`. Campo desconhecido → `DADOS_INVALIDOS`. | Decisão do grupo (rodada 1). |
| P-20 | Fuso dos instantes na resposta. | `-03:00`. | Contrato §1 aceita qualquer fuso ("o juiz compara o instante, não o texto"), então não fixa; os exemplos do contrato usam `-03:00` (§1, §3 reset, §5 entrada do POST). Decisão do grupo: `-03:00`. Observação: `/_teste/relogio` já responde em UTC (`toISOString`), o que o §1 permite. |

---

## Rodada 2

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-21 | Precedência no PATCH: quando mais de uma regra recusa a mesma alteração (`ATIVIDADE_CANCELADA`, `CAMPO_NAO_EDITAVEL`, `VAGAS_ACIMA_DA_CAPACIDADE`, `VAGAS_ABAIXO_DOS_INSCRITOS`), em que ordem são verificadas? | Ordem: `ATIVIDADE_CANCELADA` → `CAMPO_NAO_EDITAVEL` → `VAGAS_ACIMA_DA_CAPACIDADE` → `VAGAS_ABAIXO_DOS_INSCRITOS`. | Decisão do grupo (documento consultado, seção não especifica). |
| P-22 | Precedência no cancelamento: atividade já cancelada **e** já iniciada — `ATIVIDADE_CANCELADA` ou `ATIVIDADE_JA_INICIADA`? | `ATIVIDADE_CANCELADA`: `cancelada` prevalece sobre as situações temporais, e atividade cancelada não pode ser cancelada de novo. | RN-113, RN-114. |
| P-23 | Título: há tamanho máximo? Duas atividades podem ter o mesmo título? | Sem tamanho máximo para o título; títulos repetidos são permitidos. | Decisão do grupo (documento consultado, seção não especifica). |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-24 | PATCH que envia um campo não editável com o **mesmo valor** atual: `CAMPO_NAO_EDITAVEL` ou aceita? | `CAMPO_NAO_EDITAVEL` sempre que o campo não editável vier no corpo, mesmo com o valor atual. | Decisão do grupo (rodada 2). |
| P-25 | `encontros` na entrada fora de ordem: aceita e ordena na saída, ou recusa? | Aceita e devolve ordenado por `inicio`. | Decisão do grupo (rodada 2). O contrato exige a ordem só na saída: §5 (Atividade, `encontros` "em ordem de início"). O §1 não trata ordem de encontros. |
| P-26 | Campos extras dentro de cada encontro na entrada (ex.: `id`): ignora ou `DADOS_INVALIDOS`? | `DADOS_INVALIDOS`. | Decisão do grupo (rodada 2); mesma regra da P-19. |
| P-27 | `situacao` e contagens são calculadas na leitura, a partir do relógio e das inscrições, sem nada gravado? | Sim: calculadas a cada leitura; só o cancelamento é gravado. A situação muda com o avanço do relógio sem que ninguém acesse o sistema. | Decisão do grupo (rodada 2). |
| P-28 | Ordem de `GET /salas`. | Ordem da tabela de salas dos dados iniciais: `auditorio`, `sala-101`, `sala-102`, `lab-3`. | Contrato §4. |

---

## Rodada 3

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-29 | Autoria: qualquer pessoa da organização pode alterar e cancelar qualquer atividade, ou só quem a criou? Se só quem criou, qual erro recebe a outra (o contrato não tem código para isso)? | Qualquer pessoa da organização altera e cancela qualquer atividade. | Decisão do grupo (rodada 3); o contrato não tem código de erro para recusar outro organizador. |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-30 | Instantes dos encontros com segundos ou milissegundos (ex.: `19:00:30-03:00`): aceita como vieram ou `DADOS_INVALIDOS`? | Aceita instantes com segundos e milissegundos e guarda como veio. | Decisão do grupo (consulta aos requisitos). |
| P-31 | Corpo enviado em `POST /atividades/:id/cancelamento` (o contrato não define entrada): ignora ou `DADOS_INVALIDOS`? | Ignora o corpo. | Decisão do grupo (rodada 3). |

---

## Rodada 4 (fechamento dos pontos abertos pela spec)

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-32 | Campo desconhecido ou `id` no corpo do `POST /atividades`: o que acontece? | Mesmo comportamento do PATCH (P-19): campo desconhecido → `DADOS_INVALIDOS`. `id` no corpo → ignorado em silêncio, porque o id é gerado pelo servidor e não faz parte da entrada. Qualquer outro campo fora de `{titulo, tipo, salaId, vagas, encontros}` → `DADOS_INVALIDOS`, inclusive os calculados (`situacao`, `ocupadas`, `emEspera`, `vagasRestantes`, `cargaHorariaMinutos`). | Decisão do grupo (rodada 4), mesma regra do PATCH (P-19). |
| P-33 | Encontros da mesma atividade que se encostam (`fim` de um = `inicio` do outro) contam como sobreposição para `ENCONTRO_INVALIDO`? | Não. A sobreposição é de intervalo aberto: dois encontros que só se tocam num instante são aceitos. O intervalo de 15 min (P-04) é só para a mesma sala, não para encontros da mesma atividade. | Decisão do grupo (rodada 4). |
| P-34 | "Começa e termina no mesmo dia" (P-02) usa qual calendário? | Calendário de Brasília (`-03:00`). | Decisão do grupo (rodada 4), coerente com P-20. |
| P-35 | `cargaHorariaMinutos` pode ter fração (encontros com segundos, P-30)? | Sim. O contrato mostra inteiros nos exemplos mas não proíbe fração, e a P-11 diz soma exata. | P-11, P-30; decisão do grupo (rodada 4). |

---

## Encerramento

Entrevista encerrada em 2026-09-22, depois da rodada 3. O que ainda falta decidir depende do documento de requisitos. Quando as pendentes forem respondidas, a coluna Fonte recebe o RN correspondente. Depois disso vem a spec (`to-spec`).

Consulta ao documento de requisitos feita em 2026-09-22: todas as pendentes foram respondidas. Não há pergunta em aberto; o próximo passo é a spec (`to-spec`).

### Decisões tomadas

| # | Decisão | Fonte |
|---|---|---|
| P-15 | Validação de corpo → 422 `DADOS_INVALIDOS`; `encontros` vazio → `QUANTIDADE_DE_ENCONTROS` | Contrato §1, §5; decisão do grupo |
| P-16 | `salaId` inexistente → 422 `DADOS_INVALIDOS` | Decisão do grupo |
| P-17 | `GET /atividades` ordenado pelo início do 1º encontro, empate por `id` | Decisão do grupo |
| P-19 | PATCH `{}` → 200; `id`/calculados → `CAMPO_NAO_EDITAVEL`; campo desconhecido → `DADOS_INVALIDOS` | Decisão do grupo |
| P-20 | Instantes na resposta em `-03:00` | Contrato §1; decisão do grupo |
| P-24 | Campo não editável no corpo → `CAMPO_NAO_EDITAVEL`, mesmo com o valor atual | Decisão do grupo |
| P-25 | Encontros fora de ordem aceitos; saída ordenada por `inicio` | Contrato §5; decisão do grupo |
| P-26 | Campo extra dentro de encontro → `DADOS_INVALIDOS` | Decisão do grupo (regra da P-19) |
| P-27 | `situacao` e contagens calculadas na leitura; só o cancelamento é gravado | Decisão do grupo |
| P-28 | `GET /salas` na ordem da tabela de dados iniciais | Contrato §4 |
| P-29 | Qualquer pessoa da organização altera e cancela qualquer atividade | Decisão do grupo; sem código no contrato |
| P-31 | Corpo do `POST /atividades/:id/cancelamento` é ignorado | Decisão do grupo |
| P-32 | POST: `id` no corpo é ignorado; qualquer outro campo fora da entrada (inclusive calculados) → `DADOS_INVALIDOS` | Decisão do grupo (regra da P-19) |
| P-33 | Encontros da mesma atividade que só se encostam não se sobrepõem | Decisão do grupo |
| P-34 | "Mesmo dia" pelo calendário de Brasília | Decisão do grupo; coerente com P-20 |
| P-35 | `cargaHorariaMinutos` pode ter fração | P-11, P-30; decisão do grupo |

## Respondidas (consulta aos requisitos)

| # | Decisão | Fonte |
|---|---|---|
| P-01 | Palestra: 1 encontro; minicurso: 2 a 5 | RN-102, RN-103 |
| P-02 | Encontro inválido: duração < 1 h ou > 4 h; não começa e termina no mesmo dia; fora de 19–23/10/2026; sobreposição na mesma atividade. Sem regra de início no futuro nem faixa de horário | RN-104, RN-105, RN-106 |
| P-03 | `vagas` igual à capacidade é permitido; só acima dela recusa | RN-107 |
| P-04 | Intervalo mínimo de 15 min na mesma sala; encostar conflita; cancelada não ocupa a sala | RN-108 |
| P-05 | POST: `QUANTIDADE_DE_ENCONTROS` → `ENCONTRO_INVALIDO` → `VAGAS_ACIMA_DA_CAPACIDADE` → `CONFLITO_DE_SALA` | Decisão do grupo (documento não especifica) |
| P-06 | Editáveis só `titulo` e `vagas`, sempre; `salaId`, `tipo`, `encontros` nunca | RN-110 |
| P-07 | Novo `vagas` ≥ `ocupadas` (igual permitido); espera não conta | RN-111 |
| P-08 | Cancelar só antes do início, sem antecedência; iniciada no instante do início do 1º encontro; PATCH não é bloqueado pelo tempo | RN-110, RN-112, Seção 5 |
| P-09 | `em_andamento` do início do 1º encontro ao fim do último; `encerrada` a partir do fim; `cancelada` prevalece | RN-114 |
| P-10 | `ocupadas` = `confirmada` + `convocada`; `emEspera` = `em_espera`; `vagasRestantes = vagas − ocupadas`; cancelada → `ocupadas: 0`, `emEspera: 0`, `vagasRestantes: vagas` | RN-111, RN-205, RN-217, Seção 5.2; decisão do grupo; P-27 |
| P-11 | `cargaHorariaMinutos` = soma exata das durações, sem arredondamento | RN-109 |
| P-12 | Cancelar a atividade cancela as inscrições ativas; tratado no M2 | RN-217 |
| P-13 | Canceladas aparecem na lista e no detalhe, para todos os perfis | RN-115 |
| P-14 | Fora do escopo: excluir, reativar, criar sala, palestrante, limite por organizador | RN-113, Seção 7 |
| P-18 | `?dia=` (calendário de Brasília) e `?tipo=` combinam (E); valor inválido → 422 `DADOS_INVALIDOS` | RN-116; decisão do grupo |
| P-21 | PATCH: `ATIVIDADE_CANCELADA` → `CAMPO_NAO_EDITAVEL` → `VAGAS_ACIMA_DA_CAPACIDADE` → `VAGAS_ABAIXO_DOS_INSCRITOS` | Decisão do grupo (documento não especifica) |
| P-22 | Cancelada e já iniciada → `ATIVIDADE_CANCELADA` | RN-113, RN-114 |
| P-23 | Título sem tamanho máximo; repetição permitida | Decisão do grupo (documento não especifica) |
| P-30 | Instantes com segundos/milissegundos aceitos e guardados como vieram | Decisão do grupo |

### Perguntas dependentes — encerradas

Nenhuma precisa de rodada nova: a condição que as abriria não se confirmou.

| Pergunta | Situação | Por quê |
|---|---|---|
| Se P-06 liberar `encontros` ou `salaId` no PATCH: o PATCH revalida `ENCONTRO_INVALIDO`/`CONFLITO_DE_SALA`? Os `id` dos encontros se mantêm? | Encerrada | P-06 confirmou que `encontros` e `salaId` nunca são editáveis (RN-110). |
| Se P-01 fixar máximo de encontros: e se P-06 liberar `encontros`, o PATCH também cobra `QUANTIDADE_DE_ENCONTROS`? | Encerrada | P-01 fixou o máximo, mas P-06 não libera `encontros` no PATCH (RN-110). |
| Se P-02 incluir "início no futuro": o PATCH de `encontros` também cobra isso? | Encerrada | P-02 foi respondida pelo documento sem a condição de início no futuro (RN-104–RN-106). |
| Se P-11 tiver arredondamento: combinar com a resposta da P-30 (segundos). | Encerrada | P-11 foi respondida pelo documento: soma exata, sem arredondamento (RN-109). |
