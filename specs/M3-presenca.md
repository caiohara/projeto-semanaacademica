# Spec — M3 Presença por QR

> Origem: `entrevistas/M3-presenca.md` (rodadas 1 e 2 e rodada de revisão da spec, 2026-09-22).
> Cada regra cita a pergunta que a originou (**P-xx**) e, quando houver, a regra do documento de requisitos (**RN-xxx**).
> Rotas, campos e códigos de erro vêm de `contrato-api.md` §5 e §6 e não mudam.

## 1. Objetivo

A organização projeta, durante um encontro, um código de 6 caracteres que troca a cada minuto; o participante inscrito lê o código e registra a própria presença, inclusive sem internet (a leitura fica guardada com o instante `lidoEm` e é enviada depois). Quando o QR não resolve, a organização registra a presença manualmente, com justificativa e dentro de um limite. A organização lista quem esteve presente em cada encontro.

## 2. Fora de escopo

Fonte: P-12 (RN-504, Seção 7).

- Apagar presença.
- Corrigir presença já gravada.
- Organização registrar presença por QR em nome de alguém.
- Participante listar o próprio histórico de presenças.
- Calcular frequência por encontro ou média da atividade — é do M5.
- Presença de quem se inscreveu depois do encontro — ver R30 (sujeito à spec do M2).
- Linhas de ausentes na lista de presenças (P-15).

## 3. Modelo

### Presenca (gravada)

| Campo | Tipo | Origem |
|---|---|---|
| `id` | string `pre_` + 8 hex minúsculos | calculado (contrato §1) |
| `encontroId` | string `enc_…` | rota (`:id`); o encontro vem do M1 |
| `participanteId` | string | QR: quem chama (`X-Usuario`); manual: corpo |
| `origem` | `"qr"` \| `"qr_offline"` \| `"manual"` | calculado (R16, R25) |
| `lidoEm` | instante | calculado ou informado pelo cliente (R25) |
| `registradaEm` | instante | calculado: relógio (R25) |
| `justificativa` | string \| `null` | informado pelo cliente; texto só quando `manual` |

- Índice único (`encontroId`, `participanteId`) (P-23).
- Instantes respondidos em `-03:00` (mesma decisão do M1 P-20).

### CodigoDoEncontro (derivado, nunca gravado — P-17)

| Campo | Tipo | Origem |
|---|---|---|
| `encontroId` | string | rota |
| `codigo` | string, 6 caracteres | derivado (R6, R7) |
| `trocaEm` | instante | derivado (R8) |
| `validoAte` | instante | derivado (R8) |

### Termos

- **Janela de presença** do encontro: de `inicio − 15 min` até `fim + 30 min`, limites inclusivos (R2).
- **Minuto** (índice da janela do código): intervalo de 1 minuto alinhado ao relógio, segundos 00–59, contado a partir do epoch Unix (R7).
- **Instante de referência**: `lidoEm` quando enviado; senão, o relógio (R10, R16).
- **Inscrito**: tem inscrição com status `confirmada` na atividade dona do encontro (R13).

## 4. Endpoints

| Método | Caminho | Quem | Corpo | Sucesso |
|---|---|---|---|---|
| GET | `/encontros/:id/codigo` | organização | — | 200 `CodigoDoEncontro` |
| POST | `/encontros/:id/presencas` | participante | `{ "codigo": string, "lidoEm"?: instante }` | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| POST | `/encontros/:id/presencas/manual` | organização | `{ "participanteId": string, "justificativa": string }` | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| GET | `/encontros/:id/presencas` | organização | — | 200 `[Presenca]` |

Todas: sem `X-Usuario` ou id desconhecido → 401 `USUARIO_DESCONHECIDO`; perfil errado → 403 `SOMENTE_ORGANIZACAO` / `SOMENTE_PARTICIPANTE`; encontro inexistente → 404 `NAO_ENCONTRADO` (contrato §1).

## 5. Regras

### Autoria

- **R1** — Qualquer pessoa da organização obtém o código, registra presença manual e lista presenças de **qualquer** encontro, não só de atividades que criou. (P-18)

### Janela de presença

- **R2** — A janela de presença de um encontro vai de `inicio − 15 min` até `fim + 30 min`, com os dois limites inclusivos. (P-01; RN-301, RN-302)
- **R3** — Obter código com o relógio fora da janela de presença (R2) → 422 `FORA_DA_JANELA`. (P-01; RN-302)
- **R4** — Presença por QR sem `lidoEm` com o relógio fora da janela de presença (R2) → 422 `FORA_DA_JANELA`. (P-01)
- **R5** — Presença manual é aceita com o relógio de `inicio − 15 min` até `fim + 2 h`, com os dois limites inclusivos: o instante exato `fim + 2 h` ainda é aceito, mesma regra da janela de presença. Fora disso → 422 `FORA_DA_JANELA`. (P-01; RN-310, RN-312, Regras Gerais Seção 5)

### Código

- **R6** — O código tem 6 caracteres, só letras maiúsculas e dígitos, sem `0`, `O`, `1`, `I`, `L`. (P-03)
- **R7** — O código é derivado, não gravado: HMAC de `encontroId` + índice do minuto, com segredo, convertido para o alfabeto da R6. Minutos contados a partir do epoch Unix, alinhados ao relógio (segundos 00–59), não ao `inicio` do encontro. Duas chamadas no mesmo minuto devolvem o mesmo código. (P-02, P-17, P-25; RN-303)
- **R8** — Para o código do minuto que começa em `M`: `trocaEm = M + 1 min` (fim do minuto do código) e `validoAte = M + 2 min` (primeiro instante em que deixa de ser aceito, já que o código do minuto anterior ainda vale — R10). (P-02; RN-303, RN-304; contrato §5)
- **R9** — O segredo do HMAC vem da variável de ambiente `SEGREDO_CODIGO`; sem ela, usa um valor fixo no código. `POST /_teste/reset` não troca o segredo. (P-22)
- **R10** — Um código é aceito se for igual ao código daquele encontro no minuto do instante de referência ou no minuto anterior. Qualquer outro — inexistente, de outro encontro, expirado ou de minuto futuro — → 422 `CODIGO_INVALIDO`. (P-02, P-04; RN-304)
- **R11** — O código recebido só é convertido para maiúsculas antes da comparação. Tamanho ≠ 6, caractere fora do alfabeto da R6, espaço nas pontas, hífen ou qualquer outro desvio → 422 `CODIGO_INVALIDO` (não `DADOS_INVALIDOS`). (P-03, P-13, P-20)
- **R12** — Obter código de encontro de atividade cancelada → 422 `ATIVIDADE_CANCELADA`. (P-10; RN-302)

### Inscrição

- **R13** — Só inscrição com status `confirmada` na atividade dona do encontro permite registrar presença, por QR ou manual. `convocada`, `em_espera`, `cancelada`, `expirada` ou nenhuma inscrição → 403 `NAO_INSCRITO`. (P-05; RN-306)
- **R14** — Presença por QR ou manual em encontro de atividade cancelada → 403 `NAO_INSCRITO` (o cancelamento da atividade cancela as inscrições). (P-10; RN-217, RN-314)
- **R15** — Presença manual com `participanteId` de alguém da organização → 403 `NAO_INSCRITO`. (P-14)

### Leitura offline (`lidoEm`)

- **R16** — Todo envio por QR com `lidoEm` grava `origem: "qr_offline"`, mesmo que `lidoEm` seja igual ao relógio. A janela de presença (R2) e o código (R10) são conferidos com `lidoEm`, não com o relógio; fora da janela → 422 `FORA_DA_JANELA`. (P-06; RN-308, RN-310)
- **R17** — Envio com `lidoEm` é aceito com o relógio até `fim + 2 h` do encontro, limite inclusivo: o instante exato `fim + 2 h` ainda é aceito, mesma regra da janela de presença (P-01). Depois disso → 422 `SINCRONIZACAO_TARDIA`. (P-01, P-06; RN-310)
- **R18** — `lidoEm` posterior ao relógio → 422 `DADOS_INVALIDOS`. (P-06, P-11)
- **R19** — `lidoEm` é aceito e guardado com a precisão enviada (segundos, milissegundos); as comparações de prazo usam o instante completo. (P-21)

### Corpo

- **R20** — QR: `codigo` ausente ou não-string → 422 `DADOS_INVALIDOS`. `lidoEm` presente e não ISO 8601 com fuso → 422 `DADOS_INVALIDOS`. `lidoEm: null` → 422 `DADOS_INVALIDOS` (não equivale a ausente). Campo desconhecido no corpo → 422 `DADOS_INVALIDOS`. (P-13, P-19)
- **R21** — Manual: `participanteId` ausente, não-string ou inexistente → 422 `DADOS_INVALIDOS`. `justificativa` presente e não-string → 422 `DADOS_INVALIDOS`. Campo desconhecido no corpo → 422 `DADOS_INVALIDOS`, mesmo comportamento do QR (R20). (P-14, P-26)
- **R22** — Manual: `justificativa` precisa ter pelo menos 10 caracteres depois do trim. Ausente, vazia, só espaços ou com menos de 10 caracteres → 422 `JUSTIFICATIVA_OBRIGATORIA`. (P-09; RN-311, RN-314)

### Limite de manuais

- **R23** — Por encontro, o número de presenças `manual` não passa de `⌈10% × inscrições confirmadas da atividade⌉`. A manual que passaria desse número → 422 `LIMITE_DE_MANUAIS`. Repetir uma manual já gravada não gasta o limite (R24 vem antes). (P-08; RN-313, RN-314)

### Presença repetida

- **R24** — Há no máximo uma presença por (`encontroId`, `participanteId`). Registrar de novo — por qualquer rota e origem — devolve 200 com a presença já gravada, sem alteração: manual não substitui QR, QR não substitui manual, offline não substitui online nem o contrário. (P-07, P-23; RN-307, RN-314)

### Saída

- **R25** — Valores gravados: QR sem `lidoEm` → `origem: "qr"`, `lidoEm = registradaEm = relógio`, `justificativa: null`. QR com `lidoEm` → `origem: "qr_offline"`, `lidoEm` = o enviado, `registradaEm = relógio`, `justificativa: null`. Manual → `origem: "manual"`, `lidoEm = registradaEm = relógio`, `justificativa` = o texto exatamente como veio, sem trim; o trim serve só para validar o mínimo da R22 e não altera o valor guardado. (P-06, P-16, P-27)
- **R26** — `GET /encontros/:id/presencas` lista só quem tem presença registrada no encontro, em ordem crescente de `lidoEm`; empate pelo `id`. Encontro existente sem presenças → 200 `[]`. (P-15)

### Precedência

- **R27** — Obter código: 401 → 403 → 404 → `ATIVIDADE_CANCELADA` (R12) → `FORA_DA_JANELA` (R3). (P-11a)
- **R28** — QR: 401 → 403 → 404 → 422 `DADOS_INVALIDOS` (R18, R20) → presença existente, 200 (R24) → `NAO_INSCRITO` (R13, R14) → `SINCRONIZACAO_TARDIA` (R17) → `FORA_DA_JANELA` (R4, R16) → `CODIGO_INVALIDO` (R10, R11). Código malformado cai no último passo; repetir presença com `lidoEm` no futuro devolve 422, não 200. (P-07, P-11b, P-13; RN-302, RN-314)
- **R29** — Manual: 401 → 403 → 404 → 422 `DADOS_INVALIDOS` (R21) → `JUSTIFICATIVA_OBRIGATORIA` (R22) → presença existente, 200 (R24) → `NAO_INSCRITO` (R13, R14, R15) → `FORA_DA_JANELA` (R5) → `LIMITE_DE_MANUAIS` (R23). (P-07, P-08, P-11c; RN-314)

### Dependências do M2

- **R30** — O M3 não trata presença de quem se inscreveu depois do encontro: o M2 não permite inscrição em atividade encerrada. Sujeito à spec do M2. (P-12)
- **R31** — Os testes do M3 montam o cenário (atividades, encontros e inscrições) pelas rotas públicas do M1 e do M2, sem inserir direto no banco; a implementação segue a ordem M1 → M2 → M3. Sujeito à spec do M2. (P-24)

## 6. Critérios de aceite

**Cenário base** (montado pelas rotas públicas — R31, sujeito à spec do M2): relógio no reset; `org-ana` cria a atividade **A** com o encontro **E** de `2026-10-19T19:00:00-03:00` a `2026-10-19T22:00:00-03:00` e a atividade **B**, em outra sala, com o encontro **F** no mesmo horário. `p-carla`, `p-diego` e `p-elisa` têm inscrição `confirmada` em A; `p-fabio` tem inscrição em A com status diferente de `confirmada`; `p-gabriela` não tem inscrição em A. Janela de presença de E: 18:45:00 a 22:30:00; limite de manual e de sincronização: 2026-10-20T00:00:00-03:00. Limite de manuais de E: ⌈10% × 3⌉ = 1. "Código de E às hh:mm" = `codigo` devolvido por `GET /encontros/E/codigo` com o relógio nesse minuto.

Obter código

1. (R3, R2) Relógio 18:44:59.999 → `GET /encontros/E/codigo` → 422 `FORA_DA_JANELA`; 18:45:00 → 200; 22:30:00 → 200; 22:30:00.001 → 422 `FORA_DA_JANELA`.
2. (R6, R7, R8) Relógio 19:00:30 → 200; `codigo` casa `^[A-HJKMNP-Z2-9]{6}$`, `trocaEm` = 19:01:00, `validoAte` = 19:02:00, instantes em `-03:00`. Nova chamada às 19:00:59 → mesmo `codigo`. Às 19:01:00 → `trocaEm` = 19:02:00.
3. (R7) Com o relógio às 19:00:30, os códigos de E e de F são diferentes.
4. (R1) `org-bruno`, que não criou A, obtém o código de E → 200.
5. (R12, R27) Atividade A cancelada (pelo M1) e relógio 19:00:30 → 422 `ATIVIDADE_CANCELADA`; relógio fora da janela, A cancelada → 422 `ATIVIDADE_CANCELADA`.
6. (contrato §1) `p-carla` → 403 `SOMENTE_ORGANIZACAO`; `enc_00000000` → 404 `NAO_ENCONTRADO`.
7. (R9) Teste da função de código: mesmo `encontroId`, índice e segredo → mesmo código; segredos diferentes → códigos diferentes; sem `SEGREDO_CODIGO` usa o valor fixo; `POST /_teste/reset` não altera o segredo.

Presença por QR (online)

8. (R10, R25) Relógio 19:00:30, `p-carla` envia o código de E às 19:00 → 201; `origem: "qr"`, `lidoEm = registradaEm` = 19:00:30, `justificativa: null`, `id` casa `^pre_[0-9a-f]{8}$`.
9. (R10, R8) Código de E às 19:00; relógio 19:01:59.999 → `p-diego` → 201. Relógio 19:02:00 → `p-elisa` com o mesmo código → 422 `CODIGO_INVALIDO`.
10. (R10) Relógio 19:00:30, `p-carla` envia o código de F às 19:00 → 422 `CODIGO_INVALIDO`; envia `"ZZZZZZ"` (diferente dos códigos de E às 19:00 e 18:59) → 422 `CODIGO_INVALIDO`.
11. (R11) Relógio 19:00:30: código de E às 19:00 em minúsculas → 201; o mesmo com espaço nas pontas, com hífen no meio (`"K7M-2QX"`), com 5 ou 7 caracteres, ou com `O` → 422 `CODIGO_INVALIDO`.
12. (R4, R2) Relógio 18:44:59, `p-carla` envia o código de E às 18:44 → 422 `FORA_DA_JANELA`; relógio 22:30:00 com o código de E às 22:30 → 201.
13. (R13) Relógio 19:00:30 com código válido: `p-fabio` → 403 `NAO_INSCRITO`; `p-gabriela` → 403 `NAO_INSCRITO`.
14. (R14) A cancelada; relógio 19:00:30; `p-carla` envia qualquer código → 403 `NAO_INSCRITO`.
15. (R24) `p-carla` já tem presença QR às 19:00:30; relógio 19:10:00, envia código válido → 200 com a presença idêntica à gravada (mesmo `id`, `lidoEm`, `registradaEm`, `origem`).
16. (R24, R28) `p-carla` já tem presença; relógio 23:00:00 envia `"ZZZZZZ"` → 200 com a presença gravada (repetição vem antes de `FORA_DA_JANELA` e `CODIGO_INVALIDO`).
17. (R20) `{}` → 422 `DADOS_INVALIDOS`; `{"codigo": 123}` → 422; `{"codigo": "…", "lidoEm": null}` → 422; `{"codigo": "…", "lidoEm": "2026-10-19T19:00:00"}` (sem fuso) → 422; `{"codigo": "…", "extra": 1}` → 422.
18. (R28) `p-gabriela` (não inscrita), relógio 23:00:00, código `"ZZZZZZ"` → 403 `NAO_INSCRITO`. `p-carla`, relógio 23:00:00, sem presença, `"ZZZZZZ"` → 422 `FORA_DA_JANELA`.
19. (contrato §1) `org-ana` → 403 `SOMENTE_PARTICIPANTE`; encontro inexistente → 404.

Presença por QR (offline)

20. (R16, R25) Código de E às 19:00; relógio 21:00:00; `p-carla` envia com `lidoEm` 19:00:45 → 201, `origem: "qr_offline"`, `lidoEm` = 19:00:45, `registradaEm` = 21:00:00.
21. (R16) Relógio 19:00:30; `p-diego` envia código válido com `lidoEm` = 19:00:30 → 201 `origem: "qr_offline"`.
22. (R16, R10) Código de E às 19:05; relógio 19:05:30; `p-carla` envia com `lidoEm` 19:03:10 → 422 `CODIGO_INVALIDO` (minuto futuro em relação a `lidoEm`).
23. (R16, R2) Código de E às 22:30; relógio 22:40:00; `p-carla` envia com `lidoEm` 22:30:00 → 201; `p-diego` com `lidoEm` 22:30:00.001 → 422 `FORA_DA_JANELA`.
24. (R17) Relógio 2026-10-20T00:00:00-03:00, `lidoEm` válido de 19:00:45 → 201; relógio 2026-10-20T00:00:00.001-03:00 → 422 `SINCRONIZACAO_TARDIA`.
25. (R17, R28) Relógio depois de `fim + 2 h`, `lidoEm` fora da janela e código inválido → 422 `SINCRONIZACAO_TARDIA`.
26. (R18, R28) Relógio 19:00:30, `lidoEm` 19:00:31 → 422 `DADOS_INVALIDOS`; o mesmo com `p-carla` já presente → 422 (não 200).
27. (R19) `lidoEm` `2026-10-19T19:00:45.123-03:00` → a presença devolve esse instante com os milissegundos; relógio 2026-10-20T00:00:00.000-03:00 aceita, 00:00:00.001 recusa (critério 24).

Presença manual

28. (R5, R25, R1) Relógio 19:30:00, `org-bruno` envia `{participanteId: "p-carla", justificativa: "Celular sem bateria"}` → 201, `origem: "manual"`, `lidoEm = registradaEm` = 19:30:00, `justificativa` = a enviada.
29. (R5) Relógio 18:44:59.999 → 422 `FORA_DA_JANELA`; 2026-10-20T00:00:00-03:00 → 201; 2026-10-20T00:00:00.001-03:00 → 422 `FORA_DA_JANELA`.
30. (R22) `justificativa` ausente, `""`, `"          "`, `"  curta  "` (9 chars após trim) → 422 `JUSTIFICATIVA_OBRIGATORIA`; `"  0123456789  "` → 201.
30a. (R25, R22) A presença do critério 30 devolve `justificativa: "  0123456789  "`, com os espaços, e a lista (R26) devolve o mesmo texto.
31. (R21) `participanteId` ausente, `42`, `"p-naoexiste"` → 422 `DADOS_INVALIDOS`; `justificativa: 5` → 422 `DADOS_INVALIDOS`; corpo válido com `"extra": 1` → 422 `DADOS_INVALIDOS`.
32. (R15) `participanteId: "org-bruno"` com justificativa válida → 403 `NAO_INSCRITO`.
33. (R13, R14) `p-fabio` → 403 `NAO_INSCRITO`; A cancelada, `p-carla` → 403 `NAO_INSCRITO`.
34. (R23) Relógio 19:30:00: manual de `p-carla` → 201; manual de `p-diego` → 422 `LIMITE_DE_MANUAIS`. Com 1 inscrição confirmada, limite ⌈0,1⌉ = 1: a primeira manual → 201.
35. (R23, R24) Depois do critério 34, repetir a manual de `p-carla` → 200 com a presença gravada, não `LIMITE_DE_MANUAIS`.
36. (R24) `p-carla` com presença QR; manual para `p-carla` → 200 com a presença QR inalterada (`origem: "qr"`, `justificativa: null`). `p-diego` com manual; `p-diego` envia QR válido → 200 com a manual inalterada.
37. (R29, R22, R24) `p-carla` já presente; manual sem justificativa → 422 `JUSTIFICATIVA_OBRIGATORIA` (não 200).
38. (R29) `p-carla` já presente; relógio fora da janela da R5, justificativa válida → 200.
39. (R29) `p-fabio` fora da janela → 403 `NAO_INSCRITO`; `p-elisa` fora da janela e limite esgotado → 422 `FORA_DA_JANELA`.
40. (contrato §1) `p-carla` chamando a rota manual → 403 `SOMENTE_ORGANIZACAO`.

Listagem

41. (R26) E sem presenças → 200 `[]`.
42. (R26) Presenças de `p-diego` (`lidoEm` 19:10:00), `p-carla` offline (`lidoEm` 19:00:45) e `p-elisa` manual (19:30:00) → lista `[p-carla, p-diego, p-elisa]`; `p-fabio` e `p-gabriela` não aparecem.
43. (R26) Duas presenças com o mesmo `lidoEm` → vêm em ordem crescente de `id`.
44. (R26, R1) `org-bruno` lista E → 200; `p-carla` → 403 `SOMENTE_ORGANIZACAO`; encontro inexistente → 404.

Dependências do M2

45. (R30) Sujeito à spec do M2: com A encerrada, a inscrição de `p-gabriela` em A é recusada pelo M2, logo não há como ela ter presença em E.
46. (R31) Sujeito à spec do M2: todos os critérios acima montam inscrições por `POST /atividades/:id/inscricoes` (e demais rotas do M2), nunca por escrita direta no banco.

## 7. Como isto será verificado

Costura principal: **HTTP contra a API de verdade**, subida por `subirApi()` (`api/test/apoio/api.js`) com `MODO_TESTE=1`, banco em arquivo temporário e o relógio controlado por `PUT /_teste/relogio`. É a mesma costura do juiz e já existe; todos os critérios, exceto o 7, passam por ela, com `node --test`.

O código não é previsível de fora (HMAC com segredo), então os testes nunca fixam um valor de `codigo`: sempre obtêm o código por `GET /encontros/:id/codigo` no minuto desejado e depois movem o relógio.

Único ponto de teste novo: a **função que deriva o código** (critério 7, R9), porque o segredo e a sobrevivência ao reset não são observáveis por HTTP — o reset apaga as atividades e os encontros ganham ids novos.

O cenário depende do M1 (atividades e encontros) e do M2 (inscrições): R31, sujeito à spec do M2.

## 8. Fatias de entrega

1. **Código do encontro** — R1, R2, R3, R6, R7, R8, R9, R12, R27. Critérios 1–7. Só depende do M1.
2. **Presença por QR online** — R4, R10, R11, R13, R14, R24, R25 (parte QR), R28 (sem offline). Critérios 8–16, 18–19. Depende do M2.
3. **Corpo do QR** — R20. Critério 17.
4. **Listagem** — R26. Critérios 41–44.
5. **Leitura offline** — R16, R17, R18, R19, R28 completa. Critérios 20–27.
6. **Presença manual** — R5, R15, R21, R22, R23, R29, R25 (parte manual). Critérios 28–40, incluindo 30a.
7. **Dependências do M2** — R30, R31. Critérios 45–46, conferidos quando a spec do M2 existir.
