# Entrevista — M3 Presença por QR

> Skill `grilling`. O agente pergunta; o grupo responde ou marca "consultar requisitos".
> Pergunta marcada "consultar requisitos" fica **Pendente** e é respondida na consulta ao documento de requisitos.
> Numeração **P-xx** contínua. O prefixo **RN** é reservado às regras do documento de requisitos e aparece só na coluna **Fonte**.

## Fatos já resolvidos pelo repositório (não são perguntas)

- Rotas, campos e códigos do M3: `contrato-api.md` §5 e §6. Não mudam.
  - `GET /encontros/:id/codigo` (organização) → 200 `CodigoDoEncontro`.
  - `POST /encontros/:id/presencas` (participante) → 201 na primeira vez, 200 depois.
  - `POST /encontros/:id/presencas/manual` (organização) → 201 na primeira vez, 200 depois.
  - `GET /encontros/:id/presencas` (organização) → 200 `[Presenca]`.
- Ordem geral: 401 `USUARIO_DESCONHECIDO` → 403 `SOMENTE_ORGANIZACAO`/`SOMENTE_PARTICIPANTE` → 404 `NAO_ENCONTRADO` (encontro da rota) → 422 `DADOS_INVALIDOS` → regras do recurso (§1). A ordem **entre** regras do recurso é regra de negócio.
- Códigos de regra do M3 (§6): `ATIVIDADE_CANCELADA` e `FORA_DA_JANELA` (obter código); `FORA_DA_JANELA`, `CODIGO_INVALIDO`, `NAO_INSCRITO`, `SINCRONIZACAO_TARDIA` (registrar presença); `FORA_DA_JANELA`, `NAO_INSCRITO`, `JUSTIFICATIVA_OBRIGATORIA`, `LIMITE_DE_MANUAIS` (presença manual).
- `GET /encontros/:id/presencas` não tem código de regra no §6: para encontro existente, só responde 200 (lista possivelmente vazia).
- `NAO_INSCRITO` é **403**, não 422 (§6).
- `justificativa` ausente é `JUSTIFICATIVA_OBRIGATORIA`, não `DADOS_INVALIDOS` (§5, comentário da entrada manual).
- `codigo` tem 6 caracteres (§5). `validoAte` é o **primeiro instante em que o código deixa de ser aceito** (fim exclusivo). `trocaEm` é quando a tela busca o próximo código (§5).
- `lidoEm` na entrada é opcional e indica leitura sem internet (§5). Na saída, `lidoEm` é "o instante que valeu para as regras" (§5).
- `origem`: `"qr"` | `"qr_offline"` | `"manual"`; `justificativa` só tem texto quando `manual` (§5).
- Inscrição é por atividade (`Inscricao.atividadeId`, §5): estar inscrito num encontro = ter inscrição na atividade dona do encontro.
- Id da presença: `pre_` + 8 hex minúsculos (§1). Encontros têm id `enc_…` e vêm do M1 (§5).
- Tempo vem do relógio do modo de teste (`api/src/relogio.js`, contrato §3), nunca da hora do sistema. O relógio fica parado entre chamadas no modo de teste.
- Instantes na resposta em `-03:00` — mesma decisão do M1 (P-20 de `entrevistas/M1-grade.md`).

---

## Rodada 1

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-01 | Janela de presença (`FORA_DA_JANELA`): a partir de quando e até quando é possível (a) obter o código, (b) registrar presença por QR, (c) registrar presença manual? Há tolerância antes do `inicio` e depois do `fim` do encontro — quanto? As três rotas usam a mesma janela? Os limites são inclusivos ou exclusivos? | Pendente — consultar requisitos | |
| P-02 | Rotação do código: quanto tempo cada código dura? `trocaEm` e `validoAte` coincidem, ou o código antigo continua aceito por uma tolerância depois de `trocaEm` — quanto? | Pendente — consultar requisitos | |
| P-04 | O que é `CODIGO_INVALIDO`: código inexistente, código de outro encontro, código já expirado (depois de `validoAte`), código que ainda não vigorava no instante da leitura — todos são `CODIGO_INVALIDO`? | Pendente — consultar requisitos | |
| P-05 | Quem conta como inscrito (`NAO_INSCRITO`): só inscrição `confirmada`? `convocada`, `em_espera`, `cancelada`, `expirada` também recusam? Vale o mesmo para a presença manual? | Pendente — consultar requisitos | |
| P-06 | Leitura offline (`lidoEm`, `SINCRONIZACAO_TARDIA`): (a) qual o prazo máximo entre `lidoEm` e o envio? (b) o código é validado contra o instante `lidoEm` (e não contra o relógio)? (c) a janela da P-01 é conferida com `lidoEm`? (d) `lidoEm` no futuro em relação ao relógio — o que acontece? (e) todo envio com `lidoEm` vira `origem: "qr_offline"`, mesmo que `lidoEm` seja igual ao relógio? | Pendente — consultar requisitos | |
| P-07 | Presença repetida (201 × 200): a segunda chamada devolve a presença já gravada sem alterá-la? E nas combinações: primeiro manual e depois QR; primeiro QR e depois manual; primeiro offline e depois online (ou vice-versa, com `lidoEm` mais antigo) — alguma delas substitui a presença anterior? A repetição ainda passa pelas regras (código válido, janela) antes do 200? | Pendente — consultar requisitos | |
| P-08 | Limite de manuais (`LIMITE_DE_MANUAIS`): o limite é contado por quê — por participante na atividade, por participante no evento, por encontro, por organizador? Qual o valor? Repetir uma manual já existente (o 200) consome o limite? | Pendente — consultar requisitos | |
| P-09 | Justificativa (`JUSTIFICATIVA_OBRIGATORIA`): string vazia ou só espaços conta como ausente? Há tamanho mínimo ou máximo? | Pendente — consultar requisitos | |
| P-10 | Atividade cancelada: o contrato lista `ATIVIDADE_CANCELADA` só em "obter código". Registrar presença (QR ou manual) num encontro de atividade cancelada devolve qual erro — `FORA_DA_JANELA`, `CODIGO_INVALIDO`, ou é aceito? | Pendente — consultar requisitos | |
| P-11 | Precedência dentro de cada rota: quando mais de uma regra recusa a mesma operação, qual vence? (a) obter código: `ATIVIDADE_CANCELADA` × `FORA_DA_JANELA`; (b) QR: `NAO_INSCRITO` × `FORA_DA_JANELA` × `SINCRONIZACAO_TARDIA` × `CODIGO_INVALIDO`; (c) manual: `NAO_INSCRITO` × `FORA_DA_JANELA` × `JUSTIFICATIVA_OBRIGATORIA` × `LIMITE_DE_MANUAIS`. | Pendente — consultar requisitos | |
| P-12 | Fora do escopo: o M3 faz algum destes? Apagar ou corrigir presença; organização registrar presença por QR em nome de alguém; participante listar as próprias presenças; calcular falta/frequência (isso é do M4/M5?); presença em encontro de quem se inscreveu depois do encontro. | Pendente — consultar requisitos | |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-03 | Formato do código: quais caracteres? A leitura diferencia maiúsculas de minúsculas? | Só letras maiúsculas e dígitos, sem os ambíguos `0`, `O`, `1`, `I`, `L`. A leitura não diferencia maiúsculas de minúsculas (o código recebido é comparado em maiúsculas). | Decisão do grupo (rodada 1). O contrato só fixa 6 caracteres (§5). |
| P-13 | Validação do corpo no QR: `codigo` com tamanho ≠ 6 ou caractere fora do alfabeto; `lidoEm` mal formado; campo desconhecido. | `codigo` ausente ou não-string → `DADOS_INVALIDOS`. `codigo` string fora do formato (tamanho ≠ 6, caractere fora do alfabeto da P-03) → `CODIGO_INVALIDO`. `lidoEm` presente e não ISO 8601 com fuso → `DADOS_INVALIDOS`. Campo desconhecido no corpo → `DADOS_INVALIDOS`. | Ausente / tipo errado → 422: contrato §1. Demais: decisão do grupo (rodada 1); campo desconhecido segue a regra do M1 P-19. |
| P-14 | Validação do corpo na manual: `participanteId` inexistente, de alguém da organização; `justificativa` não-string. | `participanteId` ausente/não-string → `DADOS_INVALIDOS`. `participanteId` inexistente → `DADOS_INVALIDOS`. `participanteId` de alguém da organização → `NAO_INSCRITO`. `justificativa` presente e não-string → `DADOS_INVALIDOS`. | Ausente / tipo errado → 422: contrato §1. Demais: decisão do grupo (rodada 1); id inexistente no corpo segue o M1 P-16. |
| P-15 | Ordem de `GET /encontros/:id/presencas`, e se lista só quem tem presença. | Só quem tem presença registrada (sem linhas de ausentes), ordenado por `lidoEm`; empate pelo `id`. | Decisão do grupo (rodada 1). |
| P-16 | Valores de `lidoEm` e `registradaEm` na saída. | QR online: `lidoEm` = `registradaEm` = relógio. Offline: `lidoEm` = o enviado, `registradaEm` = relógio. Manual: `lidoEm` = `registradaEm` = relógio. | Decisão do grupo (rodada 1). Contrato §5 define `lidoEm` como "o instante que valeu para as regras". |
| P-17 | Geração do código: gravado ou derivado? Mesma janela devolve o mesmo código? | Derivado, sem gravar: HMAC de `encontroId` + índice da janela de tempo, com segredo, convertido para o alfabeto da P-03. Duas chamadas na mesma janela devolvem o mesmo código. | Decisão do grupo (rodada 1). Compatível com o relógio parado do contrato §3. |

---

## Rodada 2

### Regra de negócio

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-18 | Autoria: qualquer pessoa da organização pode obter o código, registrar presença manual e listar presenças de qualquer encontro, ou só quem criou a atividade? | Qualquer pessoa da organização, em qualquer encontro. | Decisão do grupo (rodada 2), mesmo critério do M1 P-29; o contrato não tem código de erro para recusar outro organizador. |

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-19 | `lidoEm: null` no corpo do QR: trata como ausente (presença online) ou `DADOS_INVALIDOS`? | `DADOS_INVALIDOS`. Campo opcional se omite; `null` não equivale a ausente. | Decisão do grupo (rodada 2); contrato §1 trata `null` como tipo errado. |
| P-20 | Normalização do código recebido além de maiúsculas: espaços nas pontas, hífen no meio (`K7M-2QX`) — remove ou é `CODIGO_INVALIDO`? | Só converte para maiúsculas. Espaço, hífen ou qualquer outro desvio → `CODIGO_INVALIDO` (regra da P-13). | Decisão do grupo (rodada 2). |
| P-21 | Precisão de `lidoEm` (segundos, milissegundos): aceita e guarda o instante como veio? | Aceita e guarda o instante completo; comparações de prazo usam o instante completo. | Decisão do grupo (rodada 2). |
| P-22 | Segredo do HMAC: de onde vem? Muda a cada `POST /_teste/reset`? | Variável de ambiente `SEGREDO_CODIGO`; sem ela, valor fixo no código. O reset não troca o segredo. | Decisão do grupo (rodada 2). |
| P-23 | Unicidade da presença: índice único (`encontroId`, `participanteId`) no banco, e o 201/200 sai de "inserir ou ler a existente"? | Sim: índice único (`encontroId`, `participanteId`); 201 ao inserir, 200 com a existente. | Decisão do grupo (rodada 2); o comportamento exato do 200 depende da P-07. |
| P-24 | Testes do M3 dependem de inscrições do M2: os testes montam o cenário pelas rotas públicas (o que exige M2 pronto antes), ou inserem inscrições direto no banco? | Pelas rotas públicas; implementação na ordem M1 → M2 → M3. | Decisão do grupo (rodada 2). |
| P-25 | Âncora das janelas do código (o "índice da janela" da P-17): contadas a partir do epoch Unix ou a partir do início do encontro? | A partir do `inicio` do encontro. | Decisão do grupo (rodada 2); sujeita à resposta da P-01/P-02. |

---

## Encerramento

Entrevista encerrada em 2026-09-22, depois da rodada 2. O que ainda falta decidir depende do documento de requisitos. Quando as pendentes forem respondidas, a coluna Fonte recebe o RN correspondente. Depois disso vem a spec (`to-spec`).

### Decisões tomadas

| # | Decisão | Fonte |
|---|---|---|
| P-03 | Código: maiúsculas e dígitos, sem `0`, `O`, `1`, `I`, `L`; leitura sem diferenciar maiúsculas | Decisão do grupo |
| P-13 | `codigo` ausente/não-string → `DADOS_INVALIDOS`; string fora do formato → `CODIGO_INVALIDO`; `lidoEm` mal formado e campo desconhecido → `DADOS_INVALIDOS` | Contrato §1; decisão do grupo (regra do M1 P-19) |
| P-14 | `participanteId` inexistente → `DADOS_INVALIDOS`; de organização → `NAO_INSCRITO`; `justificativa` não-string → `DADOS_INVALIDOS` | Contrato §1; decisão do grupo (regra do M1 P-16) |
| P-15 | Lista só presentes, ordenada por `lidoEm`, empate por `id` | Decisão do grupo |
| P-16 | `lidoEm`/`registradaEm` = relógio no QR online e na manual; offline guarda o `lidoEm` enviado | Contrato §5; decisão do grupo |
| P-17 | Código derivado por HMAC(`encontroId` + índice da janela), sem gravar; mesma janela → mesmo código | Decisão do grupo |
| P-18 | Qualquer pessoa da organização age sobre qualquer encontro | Decisão do grupo (critério do M1 P-29) |
| P-19 | `lidoEm: null` → `DADOS_INVALIDOS` | Contrato §1; decisão do grupo |
| P-20 | Código só é convertido para maiúsculas; qualquer outro desvio → `CODIGO_INVALIDO` | Decisão do grupo |
| P-21 | `lidoEm` aceito com segundos/milissegundos; comparações usam o instante completo | Decisão do grupo |
| P-22 | Segredo do HMAC em `SEGREDO_CODIGO`, com valor fixo de reserva; reset não troca | Decisão do grupo |
| P-23 | Índice único (`encontroId`, `participanteId`); 201 insere, 200 devolve a existente | Decisão do grupo; detalhe do 200 depende da P-07 |
| P-24 | Testes do M3 montam o cenário pelas rotas públicas; ordem M1 → M2 → M3 | Decisão do grupo |
| P-25 | Janelas do código contadas a partir do `inicio` do encontro | Decisão do grupo; sujeita à P-01/P-02 |

## Pendentes (consultar requisitos)

### Regra de negócio

| # | Assunto | Código(s) afetado(s) |
|---|---|---|
| P-01 | Janela de cada rota (obter código, QR, manual): tolerâncias antes/depois; limites inclusivos ou exclusivos | `FORA_DA_JANELA` |
| P-02 | Duração do código; tolerância do código antigo depois de `trocaEm` | `trocaEm`, `validoAte`, `CODIGO_INVALIDO` |
| P-04 | Casos que são `CODIGO_INVALIDO` (inexistente, outro encontro, expirado, ainda não vigente) | `CODIGO_INVALIDO` |
| P-05 | Status de inscrição que contam como inscrito, no QR e na manual | `NAO_INSCRITO` |
| P-06 | Leitura offline: prazo de sincronização; código e janela conferidos com `lidoEm`; `lidoEm` no futuro; quando vira `qr_offline` | `SINCRONIZACAO_TARDIA`, `origem` |
| P-07 | Presença repetida: devolve a existente sem alterar? Combinações manual/QR/offline; a repetição passa pelas regras? | 201 × 200 |
| P-08 | Base de contagem e valor do limite de manuais; a repetição consome o limite? | `LIMITE_DE_MANUAIS` |
| P-09 | Justificativa vazia/só espaços; tamanho mínimo/máximo | `JUSTIFICATIVA_OBRIGATORIA` |
| P-10 | Presença em encontro de atividade cancelada | `ATIVIDADE_CANCELADA`, `FORA_DA_JANELA`, `CODIGO_INVALIDO` |
| P-11 | Precedência entre regras em cada rota | todos os do M3 |
| P-12 | Limites de escopo (apagar/corrigir presença, QR pela organização, participante listar as próprias, frequência, inscrição tardia) | — |

### Perguntas que só abrem depois das pendentes

- Se P-02 der tolerância ao código antigo: dois códigos valem ao mesmo tempo; a validação da P-17 precisa aceitar a janela atual e a anterior.
- Se P-01 permitir obter o código antes do `inicio`: a âncora da P-25 gera índice negativo — reancorar no início da janela da P-01?
- Se P-06 validar o código contra `lidoEm`: o código lido offline é conferido com a janela de código vigente em `lidoEm`, e a janela da P-01 também usa `lidoEm`?
- Se P-07 permitir que uma presença substitua outra (ex.: manual sobre QR): o índice único da P-23 vira atualização; `origem` e `lidoEm` mudam, e a resposta continua 200?
- Se P-08 contar por participante: quem esbarrou em `LIMITE_DE_MANUAIS` ainda pode registrar por QR?
- Se P-05 aceitar `convocada`: se a convocação expirar entre `lidoEm` (offline) e o envio, vale o status em `lidoEm` ou no envio?
