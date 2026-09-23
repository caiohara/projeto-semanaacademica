# Spec — M1 Grade de atividades

> Origem: `entrevistas/M1-grade.md` (rodadas 1–4 e consulta ao documento de requisitos, 2026-09-22).
> Cada regra cita a pergunta que a originou (**P-xx**) e, quando houver, a regra do documento de requisitos (**RN-xxx**).
> Rotas, campos e códigos vêm de `contrato-api.md` §5 e §6 e não mudam.

## 1. Objetivo

A organização monta a grade da Semana Acadêmica (19 a 23/10/2026, horário de Brasília): cadastra palestras e minicursos, cada um com sala, vagas e encontros; ajusta título e vagas; e cancela atividades que ainda não começaram. Qualquer pessoa (organização ou participante) consulta as salas e a grade, com a situação de cada atividade e as contagens de vagas calculadas no momento da leitura.

## 2. Fora de escopo

- Excluir atividade (P-14, RN-113).
- Reativar atividade cancelada (P-14, RN-113).
- Criar sala; as salas são as dos dados iniciais (P-14, Seção 7; contrato §4).
- Cadastrar palestrante ou descrição (P-14, Seção 7).
- Limitar quantas atividades um organizador cria (P-14, Seção 7).
- Cancelar as inscrições de uma atividade cancelada: é do M2 (P-12, RN-217).
- Exigir que o encontro comece no futuro em relação ao relógio (P-02).
- Faixa de horário permitida no dia (P-02).
- Tamanho máximo de título e unicidade de título (P-23).
- Restringir alteração/cancelamento a quem criou a atividade (P-29).

## 3. Modelo

### Sala (dados iniciais, contrato §4)

| Campo | Tipo | Origem |
|---|---|---|
| `id` | string | dados iniciais (`auditorio`, `sala-101`, `sala-102`, `lab-3`) |
| `nome` | string | dados iniciais |
| `capacidade` | inteiro | dados iniciais (200, 40, 40, 20) |

### Atividade

| Campo | Tipo | Origem |
|---|---|---|
| `id` | string `atv_` + 8 hex minúsculos | gerado na criação |
| `titulo` | string | informado; editável |
| `tipo` | `"palestra"` \| `"minicurso"` | informado; não editável |
| `salaId` | string | informado; não editável |
| `vagas` | inteiro ≥ 1 | informado; editável |
| `encontros` | `[Encontro]`, em ordem de `inicio` | informado; não editável |
| `cancelada` (interno, não sai na resposta) | booleano | gravado pelo cancelamento — o único estado gravado além da entrada (P-27) |
| `cargaHorariaMinutos` | número (minutos) | derivado: soma exata das durações dos encontros; pode ter fração (P-11, P-30, P-35) |
| `situacao` | `"prevista"` \| `"em_andamento"` \| `"encerrada"` \| `"cancelada"` | derivado do relógio e de `cancelada` |
| `ocupadas` | inteiro | derivado das inscrições do M2 |
| `emEspera` | inteiro | derivado das inscrições do M2 |
| `vagasRestantes` | inteiro | derivado: `vagas − ocupadas` |

### Encontro

| Campo | Tipo | Origem |
|---|---|---|
| `id` | string `enc_` + 8 hex minúsculos | gerado na criação |
| `inicio` | instante ISO 8601 | informado |
| `fim` | instante ISO 8601 | informado |

Campos derivados não são gravados: são calculados a cada leitura (P-27).

## 4. Endpoints

| Método | Rota | Quem | Corpo | Sucesso |
|---|---|---|---|---|
| GET | `/salas` | todos | — | 200 `[Sala]` |
| GET | `/atividades` | todos | — (filtros `?dia=AAAA-MM-DD`, `?tipo=palestra\|minicurso`) | 200 `[Atividade]` |
| GET | `/atividades/:id` | todos | — | 200 `Atividade` |
| POST | `/atividades` | organização | `{titulo, tipo, salaId, vagas, encontros: [{inicio, fim}]}` | 201 `Atividade` |
| PATCH | `/atividades/:id` | organização | subconjunto de `{titulo, vagas}` | 200 `Atividade` |
| POST | `/atividades/:id/cancelamento` | organização | ignorado | 200 `Atividade` |

Herdado do contrato (§1, §6), vale para todas as rotas acima e não é regra R: sem `X-Usuario` ou id desconhecido → 401 `USUARIO_DESCONHECIDO`; participante em rota de organização → 403 `SOMENTE_ORGANIZACAO`; `:id` inexistente → 404 `NAO_ENCONTRADO`; corpo que não é JSON, campo obrigatório ausente, `null` ou de tipo errado → 422 `DADOS_INVALIDOS`. Ordem: 401 → 403 → 404 → 422 `DADOS_INVALIDOS` → regras do recurso. Tempo sempre do relógio do modo de teste.

## 5. Regras

### Leitura

- **R1** — `GET /salas` devolve as salas na ordem da tabela de dados iniciais: `auditorio`, `sala-101`, `sala-102`, `lab-3`. (P-28; contrato §4)
- **R2** — `GET /atividades` ordena pelo `inicio` do primeiro encontro; empate pelo `id`. (P-17)
- **R3** — `?dia=AAAA-MM-DD` devolve as atividades com algum encontro nesse dia pelo calendário de Brasília; `?tipo=` filtra por `palestra` ou `minicurso`; os dois combinam em E. Valor inválido em qualquer filtro → 422 `DADOS_INVALIDOS`. (P-18; RN-116)
- **R4** — Atividades canceladas aparecem em `GET /atividades` e em `GET /atividades/:id`, para todos os perfis. (P-13; RN-115)
- **R5** — `encontros` sai ordenado por `inicio`; encontros enviados fora de ordem são aceitos. (P-25; contrato §5)
- **R6** — `cargaHorariaMinutos` é a soma exata das durações dos encontros em minutos, sem arredondamento; pode ter fração quando os instantes têm segundos. (P-11, P-35; RN-109)
- **R7** — `situacao`: `prevista` até antes do `inicio` do 1º encontro; `em_andamento` a partir do instante exato do `inicio` do 1º encontro (inclusive entre encontros); `encerrada` a partir do instante exato do `fim` do último encontro; `cancelada` prevalece sobre todas. Muda com o relógio sem que nada seja gravado. (P-09, P-27; RN-114)
- **R8** — `ocupadas` conta as inscrições `confirmada` e `convocada`; `emEspera` conta só `em_espera`; `vagasRestantes = vagas − ocupadas`. (P-10; RN-111, RN-205, Seção 5.2)
- **R9** — Em atividade cancelada: `ocupadas: 0`, `emEspera: 0`, `vagasRestantes: vagas`. (P-10(d), P-27; RN-217)
- **R10** — Instantes na resposta usam o fuso `-03:00`. (P-20; contrato §1)
- **R11** — Instantes de encontro com segundos ou milissegundos são aceitos e guardados como vieram (o instante devolvido é o mesmo, com a mesma precisão). (P-30)

### Criar (`POST /atividades`)

- **R12** — 422 `DADOS_INVALIDOS` quando: `titulo` não é string ou fica vazio após trim; `tipo` fora de `palestra`/`minicurso`; `vagas` não é inteiro ≥ 1 (0, negativo ou decimal); `encontros` não é array de objetos com `inicio` e `fim` ISO 8601 com fuso; campo obrigatório ausente ou de tipo errado. (P-15; contrato §1, §5)
- **R13** — Campo extra dentro de um encontro (ex.: `id`) → 422 `DADOS_INVALIDOS`. (P-26)
- **R34** — No corpo do POST, `id` é ignorado em silêncio: a atividade recebe o `id` gerado pelo servidor. Qualquer outro campo fora de `{titulo, tipo, salaId, vagas, encontros}` → 422 `DADOS_INVALIDOS`, inclusive os calculados (`situacao`, `ocupadas`, `emEspera`, `vagasRestantes`, `cargaHorariaMinutos`). (P-32, P-19)
- **R14** — `salaId` que não existe → 422 `DADOS_INVALIDOS` (não 404). (P-16)
- **R15** — Título sem tamanho máximo; títulos repetidos são aceitos. (P-23)
- **R16** — 422 `QUANTIDADE_DE_ENCONTROS` quando palestra não tem exatamente 1 encontro, ou minicurso tem menos de 2 ou mais de 5. `encontros: []` cai aqui, não em `DADOS_INVALIDOS`. (P-01, P-15; RN-102, RN-103)
- **R17** — 422 `ENCONTRO_INVALIDO` quando a duração de um encontro é inferior a 60 minutos ou superior a 240 minutos (60 e 240 são aceitos; `fim` ≤ `inicio` cai aqui). (P-02; RN-104–RN-106)
- **R18** — 422 `ENCONTRO_INVALIDO` quando um encontro não começa e termina no mesmo dia pelo calendário de Brasília (`-03:00`), qualquer que seja o fuso enviado. (P-02, P-34; RN-104–RN-106)
- **R19** — 422 `ENCONTRO_INVALIDO` quando um encontro fica fora do período 19/10/2026 a 23/10/2026 (horário de Brasília). (P-02; RN-104–RN-106)
- **R20** — 422 `ENCONTRO_INVALIDO` quando dois encontros da mesma atividade se sobrepõem. A sobreposição é de intervalo aberto: encontros que só se encostam (`fim` de um = `inicio` do outro) são aceitos. O intervalo de 15 min da R22 vale só entre atividades na mesma sala, não entre encontros da mesma atividade. (P-02, P-33; RN-104–RN-106)
- **R21** — 422 `VAGAS_ACIMA_DA_CAPACIDADE` quando `vagas` ultrapassa a capacidade da sala; `vagas` igual à capacidade é aceito. Vale no POST e no PATCH. (P-03, P-21; RN-107)
- **R22** — 409 `CONFLITO_DE_SALA` quando um encontro, na mesma sala, fica a menos de 15 minutos de um encontro de outra atividade não cancelada (entre o fim de um e o início do outro). Encostar (`fim` = `inicio`) conflita; intervalo de exatamente 15 minutos é aceito. Atividade cancelada não ocupa a sala. (P-04; RN-108)
- **R23** — Precedência no POST: `QUANTIDADE_DE_ENCONTROS` → `ENCONTRO_INVALIDO` → `VAGAS_ACIMA_DA_CAPACIDADE` → `CONFLITO_DE_SALA`. (P-05)

### Alterar (`PATCH /atividades/:id`)

- **R24** — Só `titulo` e `vagas` são editáveis. `tipo`, `salaId`, `encontros`, `id` e os campos calculados (`cargaHorariaMinutos`, `situacao`, `ocupadas`, `vagasRestantes`, `emEspera`) no corpo → 422 `CAMPO_NAO_EDITAVEL`, mesmo com o valor atual. (P-06, P-19, P-24; RN-110)
- **R25** — Campo desconhecido no corpo → 422 `DADOS_INVALIDOS`. Corpo `{}` → 200 sem mudança. `titulo` e `vagas` enviados seguem a validação da R12. (P-19, P-15)
- **R26** — 409 `VAGAS_ABAIXO_DOS_INSCRITOS` quando o novo `vagas` é menor que `ocupadas`; igual é aceito; a lista de espera não entra na conta. (P-07; RN-111)
- **R27** — PATCH em atividade cancelada → 422 `ATIVIDADE_CANCELADA`. (P-21, P-22; RN-113, RN-114)
- **R28** — O PATCH não é bloqueado pelo tempo: atividade `em_andamento` ou `encerrada` aceita alteração de `titulo` e `vagas`. (P-08; RN-110)
- **R29** — Precedência no PATCH: `ATIVIDADE_CANCELADA` → `CAMPO_NAO_EDITAVEL` → `VAGAS_ACIMA_DA_CAPACIDADE` → `VAGAS_ABAIXO_DOS_INSCRITOS`. (P-21)

### Cancelar (`POST /atividades/:id/cancelamento`)

- **R30** — Cancelar só antes do início do 1º encontro, sem antecedência mínima. Com o relógio no instante exato do `inicio` do 1º encontro ou depois → 422 `ATIVIDADE_JA_INICIADA`. (P-08; RN-112, Seção 5)
- **R31** — Atividade já cancelada → 422 `ATIVIDADE_CANCELADA`, que vence `ATIVIDADE_JA_INICIADA` quando as duas se aplicam. (P-22; RN-113, RN-114)
- **R32** — Sucesso → 200 com a `Atividade` em `situacao: "cancelada"`; o corpo da requisição é ignorado. (P-31, P-27)

### Autoria

- **R33** — Qualquer pessoa da organização altera e cancela qualquer atividade, inclusive as criadas por outra. (P-29)

## 6. Critérios de aceite

Todos partem de `POST /_teste/reset` (relógio em `2026-10-13T09:00:00-03:00`) e usam `X-Usuario: org-ana` salvo indicação. "Palestra válida" = `{"titulo":"IA hoje","tipo":"palestra","salaId":"sala-101","vagas":40,"encontros":[{"inicio":"2026-10-19T19:00:00-03:00","fim":"2026-10-19T21:00:00-03:00"}]}`.

1. (R1) `GET /salas` com `p-carla` → 200, ids na ordem `auditorio`, `sala-101`, `sala-102`, `lab-3`, capacidades 200, 40, 40, 20.
2. (R2) Criar A com encontro em 20/10 19:00 e B em 19/10 19:00 → `GET /atividades` devolve B antes de A.
3. (R2) Duas atividades com o mesmo `inicio` do 1º encontro (salas diferentes) → saem em ordem crescente de `id`.
4. (R3) Palestra em 19/10 e minicurso em 20/10–21/10 → `?dia=2026-10-20` devolve só o minicurso; `?tipo=palestra` só a palestra; `?dia=2026-10-20&tipo=palestra` → `[]`.
5. (R3) Encontro `2026-10-19T22:00:00-03:00`–`23:30-03:00` (01:00Z do dia 20) → aparece em `?dia=2026-10-19`, não em `?dia=2026-10-20`.
6. (R3) `?dia=19-10-2026` → 422 `DADOS_INVALIDOS`; `?tipo=oficina` → 422 `DADOS_INVALIDOS`.
7. (R4, R32) Cancelar a palestra válida → 200, `situacao: "cancelada"`; `GET /atividades` e `GET /atividades/:id` com `p-carla` a incluem com `situacao: "cancelada"`.
8. (R5) Minicurso com encontros enviados 20/10 antes de 19/10 → 201, `encontros[0].inicio` é o de 19/10; cada encontro tem `id` `enc_` + 8 hex.
9. (R6) Minicurso com encontros de 3 h e 2 h 30 → `cargaHorariaMinutos: 330`.
10. (R6, R11, P-35) Palestra de `19:00:30-03:00` a `20:30:00-03:00` → 201, `cargaHorariaMinutos` = 89,5 (soma exata, sem arredondar), `inicio` devolvido é o mesmo instante com os segundos.
11. (R7) Palestra válida: relógio 19/10 18:59:59 → `prevista`; 19:00:00 → `em_andamento`; 21:00:00 → `encerrada`.
12. (R7) Minicurso 19/10 19–22 h e 20/10 19–22 h, relógio 20/10 10:00 → `em_andamento`.
13. (R7, R9) Palestra cancelada com o relógio depois avançado para 19/10 22:00 → `situacao: "cancelada"`, `ocupadas: 0`, `emEspera: 0`, `vagasRestantes: 40`.
14. (R8) *(depende do M2)* Atividade com 2 inscrições `confirmada`, 1 `convocada` e 3 `em_espera`, `vagas` 40 → `ocupadas: 3`, `emEspera: 3`, `vagasRestantes: 37`.
15. (R10) Encontro enviado como `2026-10-19T22:00:00Z` → resposta com `inicio` terminando em `-03:00` e igual a `2026-10-19T19:00:00-03:00`.
16. (R12) POST com `titulo: "   "`, com `tipo: "oficina"`, com `vagas: 0`, `vagas: -1`, `vagas: 2.5`, `vagas: "20"`, `titulo: null`, sem `salaId`, com `encontros: [{"inicio":"2026-10-19T19:00:00"}]` (sem fuso e sem `fim`) → cada um 422 `DADOS_INVALIDOS`.
17. (R12, R16) Palestra válida com `vagas: 0` **e** `encontros: []` → 422 `DADOS_INVALIDOS` (corpo vence regra).
18. (R13) Encontro com `"id":"enc_00000000"` → 422 `DADOS_INVALIDOS`.
19. (R14) `salaId: "sala-999"` → 422 `DADOS_INVALIDOS`.
20. (R15) Duas palestras válidas com o mesmo título (horários sem conflito) → as duas 201; título com 1000 caracteres → 201.
21. (R16) Palestra com 2 encontros → 422 `QUANTIDADE_DE_ENCONTROS`; minicurso com 1 → 422; minicurso com 6 → 422; minicurso com 5 → 201; palestra com `encontros: []` → 422 `QUANTIDADE_DE_ENCONTROS`.
22. (R17) Encontro de 59 min → 422 `ENCONTRO_INVALIDO`; de 60 min → 201; de 240 min → 201; de 241 min → 422; `fim` igual a `inicio` → 422 `ENCONTRO_INVALIDO`.
23. (R18) Encontro de `2026-10-19T22:00:00-03:00` a `2026-10-20T01:00:00-03:00` → 422 `ENCONTRO_INVALIDO`.
24. (R19) Encontro em 18/10/2026 19–21 h → 422 `ENCONTRO_INVALIDO`; em 24/10/2026 → 422; em 23/10/2026 19–21 h → 201.
25. (R20) Minicurso com encontros 19/10 19–21 h e 19/10 20–22 h → 422 `ENCONTRO_INVALIDO`.
26. (R21) `lab-3` com `vagas: 20` → 201; com `vagas: 21` → 422 `VAGAS_ACIMA_DA_CAPACIDADE`.
27. (R22) Existe palestra na `sala-101` 19/10 19–21 h. Nova na mesma sala 21:00–22:00 → 409 `CONFLITO_DE_SALA`; 21:14–22:14 → 409; 21:15–22:15 → 201; 17:45–18:45 → 201; 18:00–19:00 → 409. Mesmo horário em `sala-102` → 201.
28. (R22) Cancelar a palestra existente e criar outra na `sala-101` 19/10 19–21 h → 201.
29. (R23) Palestra com 2 encontros inválidos e `vagas` acima da capacidade → `QUANTIDADE_DE_ENCONTROS`; palestra com 1 encontro de 30 min, `vagas` acima da capacidade e conflito de sala → `ENCONTRO_INVALIDO`; encontro válido, `vagas` acima e conflito → `VAGAS_ACIMA_DA_CAPACIDADE`.
30. (R24) PATCH com `{"tipo":"minicurso"}`, `{"salaId":"sala-101"}` (valor atual), `{"encontros":[...]}`, `{"id":"atv_00000000"}`, `{"situacao":"encerrada"}`, `{"ocupadas":0}` → cada um 422 `CAMPO_NAO_EDITAVEL`.
31. (R24, R25) PATCH `{"titulo":"Novo"}` → 200, `titulo: "Novo"`; `{"vagas":30}` → 200, `vagas: 30`, `vagasRestantes: 30`.
32. (R25) PATCH `{}` → 200 com a atividade igual; `{"descricao":"x"}` → 422 `DADOS_INVALIDOS`; `{"vagas":0}` → 422 `DADOS_INVALIDOS`; `{"titulo":""}` → 422 `DADOS_INVALIDOS`.
33. (R21) PATCH `{"vagas":41}` na `sala-101` → 422 `VAGAS_ACIMA_DA_CAPACIDADE`; `{"vagas":40}` → 200.
34. (R26) *(depende do M2)* Atividade com `ocupadas: 3` e 2 em espera → PATCH `{"vagas":2}` → 409 `VAGAS_ABAIXO_DOS_INSCRITOS`; `{"vagas":3}` → 200.
35. (R27) PATCH `{"titulo":"x"}` em atividade cancelada → 422 `ATIVIDADE_CANCELADA`.
36. (R28) Relógio em 19/10 20:00 (em andamento) → PATCH `{"titulo":"x"}` → 200; relógio em 19/10 22:00 (encerrada) → PATCH `{"vagas":35}` → 200.
37. (R29) Cancelada + `{"tipo":"minicurso","vagas":999}` → `ATIVIDADE_CANCELADA`; não cancelada + `{"tipo":"minicurso","vagas":999}` → `CAMPO_NAO_EDITAVEL`. *(depende do M2)* `ocupadas: 3` + `{"vagas":999}` → `VAGAS_ACIMA_DA_CAPACIDADE`.
38. (R30) Relógio em 19/10 18:59:59 → cancelar → 200; em outra palestra, relógio em 19/10 19:00:00 → 422 `ATIVIDADE_JA_INICIADA`; relógio em 19/10 22:00 → 422 `ATIVIDADE_JA_INICIADA`.
39. (R31) Cancelar duas vezes → a 2ª é 422 `ATIVIDADE_CANCELADA`; cancelada e com relógio depois do início → 422 `ATIVIDADE_CANCELADA`.
40. (R32) Cancelamento com corpo `{"motivo":"x"}` → 200, `situacao: "cancelada"`.
41. (R33) Atividade criada por `org-ana`; `org-bruno` faz PATCH `{"titulo":"x"}` → 200 e cancela → 200.
42. (R34) Palestra válida com `"descricao":"x"` → 422 `DADOS_INVALIDOS`; com `"situacao":"prevista"`, `"ocupadas":0`, `"emEspera":0`, `"vagasRestantes":40` ou `"cargaHorariaMinutos":120` → cada um 422 `DADOS_INVALIDOS`; palestra válida com `"id":"atv_00000000"` → 201, `id` diferente de `atv_00000000` e no formato `atv_` + 8 hex.
43. (R20) Minicurso na `lab-3` com encontros 19/10 19:00–21:00 e 19/10 21:00–23:00 → 201 (encostar não é sobreposição nem conflito de sala consigo mesma).
44. (R18) Encontro de `2026-10-19T23:00:00Z` a `2026-10-20T01:00:00Z` (19/10 20:00–22:00 em Brasília, 120 min) → 201; encontro de `2026-10-20T02:00:00Z` a `2026-10-20T04:00:00Z` (19/10 23:00 a 20/10 01:00 em Brasília) → 422 `ENCONTRO_INVALIDO`.

## 7. Como isto será verificado

Pela costura HTTP, a mais externa que o repositório já tem: `api/test/apoio/api.js` (`subirApi`) sobe a API num processo separado com `MODO_TESTE=1` e banco temporário, como o juiz faz. Os testes ficam em `api/test/m1-grade.test.js` (um arquivo por módulo), usam `fetch`, `POST /_teste/reset` antes de cada cenário e `PUT /_teste/relogio` para mover o tempo. Nenhum ponto de teste novo: as regras são todas observáveis nas rotas do contrato.

Os critérios 14, 34 e a última parte do 37 precisam de inscrições com status `confirmada`, `convocada` e `em_espera`, que só existem pelo M2 (`POST /atividades/:id/inscricoes` e o fluxo de convocação). Eles entram na última fatia e só rodam quando o M2 existir.

## 8. Fatias de entrega

1. **Salas e palestra mínima** — R1, R5, R6, R10, R11, R12, R13, R14, R15, R34; `GET /salas`, `POST /atividades` feliz, `GET /atividades/:id` com contagens zeradas (`ocupadas: 0`, `emEspera: 0`, `vagasRestantes: vagas`) e `situacao: "prevista"`. Critérios 1, 8–10, 15–20, 42.
2. **Regras de criação** — R16, R17, R18, R19, R20, R21 (POST), R22 (sem cancelamento), R23. Critérios 21–27, 29, 43, 44.
3. **Listagem** — R2, R3. Critérios 2–6.
4. **Tempo e cancelamento** — R7, R9, R30, R31, R32, R4, R22 (cancelada libera a sala), R33 (cancelar). Critérios 7, 11–13, 28, 38–40, 41 (parte do cancelamento).
5. **Alteração** — R24, R25, R21 (PATCH), R27, R28, R29 (sem inscrições), R33 (PATCH). Critérios 30–33, 35–37 (sem a parte do M2), 41.
6. **Contagens com inscrições** *(depende do M2)* — R8, R26, R29 completa. Critérios 14, 34, 37 (parte do M2).
