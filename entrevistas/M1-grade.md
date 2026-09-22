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
| P-01 | Quantidade de encontros por tipo (`QUANTIDADE_DE_ENCONTROS`): quantos encontros uma palestra aceita? E um minicurso — qual o mínimo e o máximo? | Pendente — consultar requisitos | |
| P-02 | O que torna um encontro inválido (`ENCONTRO_INVALIDO`)? Quais destas condições valem: (a) `fim` depois de `inicio`; (b) dentro do período do evento, 19–23/10 em Brasília; (c) começa e termina no mesmo dia; (d) duração mínima e/ou máxima — quais valores; (e) encontros da mesma atividade não podem se sobrepor; (f) `inicio` no futuro em relação ao relógio; (g) faixa de horário permitida no dia — qual; (h) alguma outra? | Pendente — consultar requisitos | |
| P-03 | Vagas × capacidade (`VAGAS_ACIMA_DA_CAPACIDADE`): `vagas` pode ser igual à capacidade da sala, ou precisa ser menor? | Pendente — consultar requisitos | |
| P-04 | Conflito de sala (`CONFLITO_DE_SALA`): o que conta como conflito? Encostar (`fim` de um encontro = `inicio` de outro na mesma sala) conflita? Existe intervalo mínimo entre atividades na mesma sala — qual? Atividade cancelada continua ocupando a sala? | Pendente — consultar requisitos | |
| P-05 | Precedência no POST: quando mais de uma regra recusa a mesma criação (`QUANTIDADE_DE_ENCONTROS`, `ENCONTRO_INVALIDO`, `VAGAS_ACIMA_DA_CAPACIDADE`, `CONFLITO_DE_SALA`), em que ordem são verificadas? | Pendente — consultar requisitos | |
| P-06 | Campos editáveis no PATCH (`CAMPO_NAO_EDITAVEL`): quais dos campos `titulo`, `tipo`, `salaId`, `vagas`, `encontros` podem ser alterados? A editabilidade muda com o tempo ou o estado (ex.: depois da primeira inscrição, depois do início)? | Pendente — consultar requisitos | |
| P-07 | Redução de vagas (`VAGAS_ABAIXO_DOS_INSCRITOS`): o novo `vagas` é comparado com qual número (ocupadas? ocupadas + em espera?) e pode ser igual a ele, ou precisa ser maior? | Pendente — consultar requisitos | |
| P-08 | Alterar e cancelar depois do início: PATCH é permitido em atividade em andamento ou encerrada? A partir de que instante a atividade conta como "já iniciada" para `ATIVIDADE_JA_INICIADA`? Cancelar exige alguma antecedência mínima — qual? | Pendente — consultar requisitos | |
| P-09 | Situação calculada (`prevista` / `em_andamento` / `encerrada` / `cancelada`): quando cada uma começa e termina? Entre dois encontros em dias diferentes a atividade está `em_andamento` ou `prevista`? No instante exato de `inicio` e de `fim`, qual é a situação? `cancelada` prevalece sobre as demais? | Pendente — consultar requisitos | |
| P-10 | Contagens da Atividade: (a) `ocupadas` — quais status de inscrição do M2 contam (`confirmada`? `convocada`?); (b) `emEspera` — quais status contam (só `em_espera`? `convocada` também?); (c) `vagasRestantes` — é `vagas − ocupadas`? Pode ficar negativo ou tem piso 0? (d) em atividade cancelada, o que as três contagens mostram? | Pendente — consultar requisitos | |
| P-11 | Carga horária (`cargaHorariaMinutos`): é a soma das durações dos encontros? Há arredondamento, desconto (intervalo) ou teto? | Pendente — consultar requisitos | |
| P-12 | Efeitos do cancelamento: cancelar a atividade faz algo com as inscrições e com a lista de espera? Isso é responsabilidade do M1 ou do M2? | Pendente — consultar requisitos | |
| P-13 | Visibilidade: atividades canceladas aparecem em `GET /atividades` e em `GET /atividades/:id`? Para todos os perfis? | Pendente — consultar requisitos | |
| P-14 | Fora do escopo: o M1 faz algum destes? Excluir atividade, reativar atividade cancelada, criar sala, cadastrar palestrante/descrição, limitar quantas atividades um organizador cria. | Pendente — consultar requisitos | |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-15 | Validação de corpo no POST/PATCH: o que é `422 DADOS_INVALIDOS`? | `titulo` precisa ser string não vazia após trim; `tipo` fora de `palestra`/`minicurso`; `vagas` precisa ser inteiro ≥ 1 (0, negativo ou decimal → `DADOS_INVALIDOS`); `encontros` precisa ser array de objetos com `inicio` e `fim` ISO 8601 com fuso; campo obrigatório ausente ou de tipo errado. Array `encontros` vazio → `QUANTIDADE_DE_ENCONTROS`, não `DADOS_INVALIDOS`. | Ausente / tipo errado → 422: contrato §1. Valores de `tipo`: contrato §5 (Atividade). Datas ISO com fuso: contrato §1. Título não vazio, `vagas` ≥ 1 e array vazio: decisão do grupo (rodada 1), o contrato não fixa. |
| P-16 | `salaId` inexistente no corpo: 404 `NAO_ENCONTRADO` ou 422 `DADOS_INVALIDOS`? | 422 `DADOS_INVALIDOS`. | Decisão do grupo (rodada 1). O contrato não trata id inexistente dentro do corpo: §1 põe a existência (404) antes da validação do corpo e §6 descreve 404 como "recurso inexistente", o que se refere ao recurso da rota. |
| P-17 | Ordem de `GET /atividades`. | Pelo `inicio` do primeiro encontro; empate pelo `id`. | Decisão do grupo (rodada 1). O contrato só fixa a ordem dos encontros dentro da atividade (§5). |
| P-18 | Filtros de `GET /atividades`: `?dia=` casa a atividade que tem algum encontro naquele dia no fuso de Brasília? `dia` ou `tipo` com valor inválido → 422 `DADOS_INVALIDOS` ou lista vazia? Os dois filtros combinam (E)? | Pendente — consultar requisitos | |
| P-19 | PATCH com corpo `{}` ou com campos fora da entrada (`id`, `situacao`, `ocupadas`, campo desconhecido). | `{}` → 200 sem mudança. `id` e campos calculados → `CAMPO_NAO_EDITAVEL`. Campo desconhecido → `DADOS_INVALIDOS`. | Decisão do grupo (rodada 1). |
| P-20 | Fuso dos instantes na resposta. | `-03:00`. | Contrato §1 aceita qualquer fuso ("o juiz compara o instante, não o texto"), então não fixa; os exemplos do contrato usam `-03:00` (§1, §3 reset, §5 entrada do POST). Decisão do grupo: `-03:00`. Observação: `/_teste/relogio` já responde em UTC (`toISOString`), o que o §1 permite. |

---

## Rodada 2

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-21 | Precedência no PATCH: quando mais de uma regra recusa a mesma alteração (`ATIVIDADE_CANCELADA`, `CAMPO_NAO_EDITAVEL`, `VAGAS_ACIMA_DA_CAPACIDADE`, `VAGAS_ABAIXO_DOS_INSCRITOS`), em que ordem são verificadas? | Pendente — consultar requisitos | |
| P-22 | Precedência no cancelamento: atividade já cancelada **e** já iniciada — `ATIVIDADE_CANCELADA` ou `ATIVIDADE_JA_INICIADA`? | Pendente — consultar requisitos | |
| P-23 | Título: há tamanho máximo? Duas atividades podem ter o mesmo título? | Pendente — consultar requisitos | |

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
| P-30 | Instantes dos encontros com segundos ou milissegundos (ex.: `19:00:30-03:00`): aceita como vieram ou `DADOS_INVALIDOS`? | Pendente — consultar requisitos | |
| P-31 | Corpo enviado em `POST /atividades/:id/cancelamento` (o contrato não define entrada): ignora ou `DADOS_INVALIDOS`? | Ignora o corpo. | Decisão do grupo (rodada 3). |

---

## Encerramento

Entrevista encerrada em 2026-09-22, depois da rodada 3. O que ainda falta decidir depende do documento de requisitos. Quando as pendentes forem respondidas, a coluna Fonte recebe o RN correspondente. Depois disso vem a spec (`to-spec`).

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

## Pendentes (consultar requisitos)

### Regra de negócio

| # | Assunto | Código(s) afetado(s) |
|---|---|---|
| P-01 | Quantidade de encontros por tipo | `QUANTIDADE_DE_ENCONTROS` |
| P-02 | Condições de encontro inválido (período, dia, duração, sobreposição, futuro, faixa de horário) | `ENCONTRO_INVALIDO` |
| P-03 | `vagas` igual à capacidade é permitido? | `VAGAS_ACIMA_DA_CAPACIDADE` |
| P-04 | Definição de conflito de sala (encostar, intervalo mínimo, canceladas) | `CONFLITO_DE_SALA` |
| P-05 | Precedência entre regras no POST | todos os de criar |
| P-06 | Campos editáveis e se isso muda com tempo/estado | `CAMPO_NAO_EDITAVEL` |
| P-07 | Com que número o novo `vagas` é comparado, e se pode ser igual | `VAGAS_ABAIXO_DOS_INSCRITOS` |
| P-08 | Alterar/cancelar depois do início; instante de "já iniciada"; antecedência | `ATIVIDADE_JA_INICIADA` |
| P-09 | Transições de `situacao` e instantes-limite | `situacao` |
| P-10 | Status que contam em `ocupadas`/`emEspera`; fórmula e piso de `vagasRestantes`; contagens em atividade cancelada | `ocupadas`, `vagasRestantes`, `emEspera` |
| P-11 | Cálculo de `cargaHorariaMinutos` (arredondamento, desconto, teto) | `cargaHorariaMinutos` |
| P-12 | Efeitos do cancelamento sobre inscrições e espera; M1 ou M2 | — |
| P-13 | Canceladas aparecem nas listagens? Para quem? | — |
| P-14 | Limites de escopo (excluir, reativar, criar sala, palestrante, limite por organizador) | — |
| P-21 | Precedência entre regras no PATCH | todos os de alterar |
| P-22 | Precedência no cancelamento: cancelada × já iniciada | `ATIVIDADE_CANCELADA`, `ATIVIDADE_JA_INICIADA` |
| P-23 | Tamanho máximo e unicidade do título | — |

### Técnica / contrato

| # | Assunto | Código(s) afetado(s) |
|---|---|---|
| P-18 | Semântica e validação dos filtros `?dia=` e `?tipo=` | `DADOS_INVALIDOS` |
| P-30 | Instantes com segundos/milissegundos nos encontros | `DADOS_INVALIDOS` |

### Perguntas que só abrem depois das pendentes

- Se P-06 liberar `encontros` ou `salaId` no PATCH: o PATCH revalida `ENCONTRO_INVALIDO`/`CONFLITO_DE_SALA`? Os `id` dos encontros se mantêm?
- Se P-01 fixar máximo de encontros: e se P-06 liberar `encontros`, o PATCH também cobra `QUANTIDADE_DE_ENCONTROS`?
- Se P-02 incluir "início no futuro": o PATCH de `encontros` também cobra isso?
- Se P-11 tiver arredondamento: combinar com a resposta da P-30 (segundos).
