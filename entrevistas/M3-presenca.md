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
| P-01 | Janela de presença (`FORA_DA_JANELA`): a partir de quando e até quando é possível (a) obter o código, (b) registrar presença por QR, (c) registrar presença manual? Há tolerância antes do `inicio` e depois do `fim` do encontro — quanto? As três rotas usam a mesma janela? Os limites são inclusivos ou exclusivos? | A janela de presença abre 15 minutos antes do `inicio` do encontro e fecha 30 minutos depois do `fim`. Os limites são inclusivos (o instante exato vale). Obter código só é permitido dentro dessa janela. Registro manual e envio offline (`lidoEm`) são aceitos até 2 horas depois do `fim` do encontro. | RN-301, RN-302, RN-310, RN-312, Regras Gerais Seção 5 |
| P-02 | Rotação do código: quanto tempo cada código dura? `trocaEm` e `validoAte` coincidem, ou o código antigo continua aceito por uma tolerância depois de `trocaEm` — quanto? | Cada código dura exatamente 1 minuto, em janelas alinhadas aos segundos (00 a 59). O sistema aceita o código do minuto atual e o do minuto anterior. Isso exige que a verificação por HMAC (P-17) calcule dois códigos. | RN-303, RN-304 |
| P-04 | O que é `CODIGO_INVALIDO`: código inexistente, código de outro encontro, código já expirado (depois de `validoAte`), código que ainda não vigorava no instante da leitura — todos são `CODIGO_INVALIDO`? | `CODIGO_INVALIDO` cobre qualquer código que não seja o do minuto atual ou do minuto anterior daquele encontro: código inexistente, de outro encontro, expirado ou de minuto futuro. | RN-304 |
| P-05 | Quem conta como inscrito (`NAO_INSCRITO`): só inscrição `confirmada`? `convocada`, `em_espera`, `cancelada`, `expirada` também recusam? Vale o mesmo para a presença manual? | Só inscrições com status `confirmada` permitem registrar presença. `convocada` e qualquer outro status são recusados com `NAO_INSCRITO`. | RN-306 |
| P-06 | Leitura offline (`lidoEm`, `SINCRONIZACAO_TARDIA`): (a) qual o prazo máximo entre `lidoEm` e o envio? (b) o código é validado contra o instante `lidoEm` (e não contra o relógio)? (c) a janela da P-01 é conferida com `lidoEm`? (d) `lidoEm` no futuro em relação ao relógio — o que acontece? (e) todo envio com `lidoEm` vira `origem: "qr_offline"`, mesmo que `lidoEm` seja igual ao relógio? | Envio offline (com `lidoEm`) é aceito até 2 horas após o término do encontro. A janela e o código são conferidos com base no instante de `lidoEm`, não no horário do envio. Envio além de 2 horas devolve `SINCRONIZACAO_TARDIA`. `lidoEm` posterior ao horário do envio (relógio) devolve `DADOS_INVALIDOS`. Todo envio com `lidoEm` vira `origem: "qr_offline"`. | RN-308, RN-310; decisão do grupo para `lidoEm` no futuro e para `qr_offline` |
| P-07 | Presença repetida (201 × 200): a segunda chamada devolve a presença já gravada sem alterá-la? E nas combinações: primeiro manual e depois QR; primeiro QR e depois manual; primeiro offline e depois online (ou vice-versa, com `lidoEm` mais antigo) — alguma delas substitui a presença anterior? A repetição ainda passa pelas regras (código válido, janela) antes do 200? | Presença repetida devolve 200 com a presença já gravada, sem alteração. A verificação de presença existente acontece antes de todas as outras regras, inclusive `NAO_INSCRITO` e `FORA_DA_JANELA`, com uma exceção: no registro manual, `JUSTIFICATIVA_OBRIGATORIA` vem antes da verificação de presença existente (ver P-11). Manual não substitui QR nem vice-versa. | RN-307, RN-314 |
| P-08 | Limite de manuais (`LIMITE_DE_MANUAIS`): o limite é contado por quê — por participante na atividade, por participante no evento, por encontro, por organizador? Qual o valor? Repetir uma manual já existente (o 200) consome o limite? | O limite é por encontro: 10% das inscrições confirmadas da atividade, arredondado para cima. Repetir presença manual já gravada não gasta o limite (a regra de presença existente vem antes). | RN-313, RN-314 |
| P-09 | Justificativa (`JUSTIFICATIVA_OBRIGATORIA`): string vazia ou só espaços conta como ausente? Há tamanho mínimo ou máximo? | A justificativa precisa ter pelo menos 10 caracteres depois do trim. Vazia, só espaços ou com menos de 10 caracteres devolve `JUSTIFICATIVA_OBRIGATORIA`. | RN-311, RN-314 |
| P-10 | Atividade cancelada: o contrato lista `ATIVIDADE_CANCELADA` só em "obter código". Registrar presença (QR ou manual) num encontro de atividade cancelada devolve qual erro — `FORA_DA_JANELA`, `CODIGO_INVALIDO`, ou é aceito? | Registro por QR ou manual em atividade cancelada devolve `NAO_INSCRITO`, porque o cancelamento da atividade cancela todas as inscrições (RN-217) e o participante deixa de estar inscrito. Obter código devolve `ATIVIDADE_CANCELADA`. | RN-217, RN-302, RN-314 |
| P-11 | Precedência dentro de cada rota: quando mais de uma regra recusa a mesma operação, qual vence? (a) obter código: `ATIVIDADE_CANCELADA` × `FORA_DA_JANELA`; (b) QR: `NAO_INSCRITO` × `FORA_DA_JANELA` × `SINCRONIZACAO_TARDIA` × `CODIGO_INVALIDO`; (c) manual: `NAO_INSCRITO` × `FORA_DA_JANELA` × `JUSTIFICATIVA_OBRIGATORIA` × `LIMITE_DE_MANUAIS`. | (a) Obter código: o documento não especifica a ordem; decisão do grupo: `ATIVIDADE_CANCELADA` antes de `FORA_DA_JANELA`. (b) QR: 404 (encontro inexistente) → presença existente (200) → `NAO_INSCRITO` → `SINCRONIZACAO_TARDIA` → `FORA_DA_JANELA` → `CODIGO_INVALIDO`. Código malformado (P-13) é tratado como `CODIGO_INVALIDO` e cai no último passo da ordem. `DADOS_INVALIDOS` (`lidoEm` no futuro) cai no passo 422 da ordem geral, antes da verificação de presença existente: repetir presença offline com `lidoEm` no futuro devolve 422, não 200. (c) Manual: 404 → `JUSTIFICATIVA_OBRIGATORIA` → presença existente (200) → `NAO_INSCRITO` → `FORA_DA_JANELA` → `LIMITE_DE_MANUAIS`. | RN-302, RN-314; decisão do grupo para obter código e para `lidoEm` no futuro (compatível com o contrato §1) |
| P-12 | Fora do escopo: o M3 faz algum destes? Apagar ou corrigir presença; organização registrar presença por QR em nome de alguém; participante listar as próprias presenças; calcular falta/frequência (isso é do M4/M5?); presença em encontro de quem se inscreveu depois do encontro. | Fora do escopo: apagar presença, organização registrar por QR, participante listar o próprio histórico de presenças. Calcular frequência não é fora do escopo da API: ela calcula e expõe frequência por encontro e média da atividade, mas isso é responsabilidade do M5. Corrigir presença (sem apagar) também fica fora do escopo. Presença de quem se inscreveu depois do encontro fica fora do escopo do M3: o M2 não permite inscrição em atividade encerrada. *Nota: esta regra depende do M2; a fonte será a spec do M2 quando ela existir.* | RN-504, Seção 7; decisão do grupo para corrigir presença e inscrição tardia |

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
| P-24 | Testes do M3 dependem de inscrições do M2: os testes montam o cenário pelas rotas públicas (o que exige M2 pronto antes), ou inserem inscrições direto no banco? | Pelas rotas públicas; implementação na ordem M1 → M2 → M3. *Nota: esta regra depende do M2; a fonte será a spec do M2 quando ela existir.* | Decisão do grupo (rodada 2). |
| P-25 | Âncora das janelas do código (o "índice da janela" da P-17): contadas a partir do epoch Unix ou a partir do início do encontro? | A partir do epoch Unix: janelas de 1 minuto alinhadas ao relógio (segundos 00–59), não ao `inicio` do encontro. *(Revisada após a consulta aos requisitos; a resposta da rodada 2 era "a partir do `inicio` do encontro" e conflitava com a P-02.)* | RN-303, RN-304 |

---

## Rodada de revisão da spec

Perguntas abertas ao escrever `specs/M3-presenca.md`, respondidas pelo grupo em 2026-09-22.

### Técnica / contrato

| # | Pergunta | Resposta | Fonte |
|---|---|---|---|
| P-26 | Campo desconhecido no corpo da presença manual: `DADOS_INVALIDOS`, como no QR (P-13), ou é ignorado? | `DADOS_INVALIDOS`, mesmo comportamento do QR (R20 da spec). | Decisão do grupo; mesma regra do M1 P-19. |
| P-27 | A `justificativa` da presença manual é guardada como veio ou já com o trim da P-09? | Guardada exatamente como veio, sem trim. O trim serve só para validar o mínimo de 10 caracteres (R22 da spec) e não altera o valor gravado. | Decisão do grupo. |

---

## Encerramento

Entrevista encerrada em 2026-09-22, depois da rodada 2. As pendentes foram respondidas no mesmo dia com base no documento de requisitos, e os conflitos entre respostas foram resolvidos (P-07 × P-11 e P-02 × P-25). Não há decisão em aberto. Próximo passo: a spec (`to-spec`).

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
| P-25 | Janelas do código contadas a partir do epoch Unix, alinhadas ao relógio (revisada; prevalece a P-02) | RN-303, RN-304 |
| P-26 | Campo desconhecido no corpo da manual → `DADOS_INVALIDOS` (revisão da spec) | Decisão do grupo (regra do M1 P-19) |
| P-27 | `justificativa` guardada como veio, sem trim; trim só na validação dos 10 caracteres (revisão da spec) | Decisão do grupo |

## Pendentes (consultar requisitos)

Todas as pendentes foram respondidas em 2026-09-22 na consulta ao documento de requisitos. As respostas estão na tabela da Rodada 1.

### Regra de negócio

| # | Assunto | Código(s) afetado(s) | Situação |
|---|---|---|---|
| P-01 | Janela de cada rota (obter código, QR, manual): tolerâncias antes/depois; limites inclusivos ou exclusivos | `FORA_DA_JANELA` | Respondida — RN-301, RN-302, RN-310, RN-312, Regras Gerais Seção 5 |
| P-02 | Duração do código; tolerância do código antigo depois de `trocaEm` | `trocaEm`, `validoAte`, `CODIGO_INVALIDO` | Respondida — RN-303, RN-304 |
| P-04 | Casos que são `CODIGO_INVALIDO` (inexistente, outro encontro, expirado, ainda não vigente) | `CODIGO_INVALIDO` | Respondida — RN-304 |
| P-05 | Status de inscrição que contam como inscrito, no QR e na manual | `NAO_INSCRITO` | Respondida — RN-306 |
| P-06 | Leitura offline: prazo de sincronização; código e janela conferidos com `lidoEm`; `lidoEm` no futuro; quando vira `qr_offline` | `SINCRONIZACAO_TARDIA`, `origem` | Respondida — RN-308, RN-310 |
| P-07 | Presença repetida: devolve a existente sem alterar? Combinações manual/QR/offline; a repetição passa pelas regras? | 201 × 200 | Respondida — RN-307, RN-314 |
| P-08 | Base de contagem e valor do limite de manuais; a repetição consome o limite? | `LIMITE_DE_MANUAIS` | Respondida — RN-313, RN-314 |
| P-09 | Justificativa vazia/só espaços; tamanho mínimo/máximo | `JUSTIFICATIVA_OBRIGATORIA` | Respondida — RN-311, RN-314 |
| P-10 | Presença em encontro de atividade cancelada | `ATIVIDADE_CANCELADA`, `FORA_DA_JANELA`, `CODIGO_INVALIDO` | Respondida — RN-217, RN-302, RN-314 |
| P-11 | Precedência entre regras em cada rota | todos os do M3 | Respondida — RN-302, RN-314; decisão do grupo para obter código |
| P-12 | Limites de escopo (apagar/corrigir presença, QR pela organização, participante listar as próprias, frequência, inscrição tardia) | — | Respondida — RN-504, Seção 7 |

### Perguntas que só abrem depois das pendentes — resolvidas

- P-02 deu tolerância ao código antigo: a validação da P-17 calcula dois códigos (minuto atual e anterior). **Resolvida pela P-02.**
- P-01 permite obter o código 15 minutos antes do `inicio`: não há índice negativo, porque a P-25 revisada conta as janelas a partir do epoch Unix. **Resolvida pela P-25.**
- P-06 confere o código e a janela da P-01 com base em `lidoEm`. **Resolvida pela P-06.**
- P-07 não deixa uma presença substituir outra: o índice único da P-23 fica como está, e a repetição devolve a existente. **Não se aplica.**
- P-08 conta por encontro, não por participante. **Não se aplica.**
- P-05 não aceita `convocada`. **Não se aplica.**
