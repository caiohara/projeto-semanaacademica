# Revisão de contrato (2026-09-23)

## Rotas

| Rota do contrato | Estado | Onde |
|---|---|---|
| GET /salas | implementada, bate | api/src/modulos/m1-grade/rotas.js:25 |
| GET /atividades | implementada, bate | api/src/modulos/m1-grade/rotas.js:60 |
| GET /atividades/:id | implementada, bate | api/src/modulos/m1-grade/rotas.js:73 |
| POST /atividades | implementada, bate | api/src/modulos/m1-grade/rotas.js:29 |
| PATCH /atividades/:id | implementada, bate | api/src/modulos/m1-grade/rotas.js:78 |
| POST /atividades/:id/cancelamento | implementada, bate | api/src/modulos/m1-grade/rotas.js:94 |
| POST /atividades/:id/inscricoes | implementada, bate | api/src/modulos/m2-inscricoes/rotas.js:52 |
| GET /inscricoes | implementada, bate | api/src/modulos/m2-inscricoes/rotas.js:118 |
| GET /inscricoes/:id | implementada, bate | api/src/modulos/m2-inscricoes/rotas.js:133 |
| POST /inscricoes/:id/cancelamento | implementada, bate | api/src/modulos/m2-inscricoes/rotas.js:145 |
| POST /inscricoes/:id/confirmacao | implementada, bate | api/src/modulos/m2-inscricoes/rotas.js:175 |
| GET /encontros/:id/codigo | implementada, bate | api/src/modulos/m3-presenca/rotas.js:62 |
| POST /encontros/:id/presencas | implementada, bate | api/src/modulos/m3-presenca/rotas.js:85 |
| POST /encontros/:id/presencas/manual | implementada, bate | api/src/modulos/m3-presenca/rotas.js:175 |
| GET /encontros/:id/presencas | implementada, bate | api/src/modulos/m3-presenca/rotas.js:240 |
| POST /atividades/:id/certificado | não implementada | — |
| GET /certificados | não implementada | — |
| GET /certificados/:codigo | não implementada | — |
| GET /extrato | não implementada | — |
| GET /painel/atividades | não implementada | — |
| GET /painel/atividades/:id/sem-chance | não implementada | — |
| GET /painel/atividades/:id/frequencia.csv | não implementada | — |
| GET /painel/bloqueios | não implementada | — |
| DELETE /painel/bloqueios/:participanteId | não implementada | — |

`api/src/app.js` monta apenas m1-grade, m2-inscricoes, m3-presenca (linhas 18-20) e `/_teste` (linha 16). Nenhum módulo M4 nem M5 existe em `api/src/modulos` (confirmado por listagem de diretório). Não há implementação parcial de nenhuma rota de M4/M5, então tudo cai em "não implementada" por regra 10 do procedimento — não é achado de forma, mas fica registrado.

Verifiquei ao vivo (curl real, API rodando) que `GET /painel/atividades` cai no 404 genérico de rota inexistente (`{"erro":"NAO_ENCONTRADO","mensagem":"GET /painel/atividades não existe"}`), coerente com "não implementada".

## Campos

Nenhuma divergência de nome de campo encontrada nas rotas implementadas. Testei ao vivo o schema completo de `Atividade` (POST/PATCH/GET), `Sala`, `Inscricao` (POST/GET) e `CodigoDoEncontro`/`Presenca` (M3) — todos os campos batem exatamente com contrato-api.md §5 (nomes, calculados incluídos: `cargaHorariaMinutos`, `situacao`, `ocupadas`, `vagasRestantes`, `emEspera`, `posicaoNaEspera`, `convocadaAte`, `criadaEm`, `origem`, `lidoEm`, `registradaEm`, `justificativa`).

Como M4 e M5 não existem, os objetos `Certificado`, `Verificacao`, `Extrato`, `LinhaDoPainel`, `SemChance`, `Bloqueio` não têm implementação para comparar — nada a apontar aqui além da ausência.

## Códigos de erro

| Código do contrato | Status esperado | Onde aparece na API | Divergência |
|---|---|---|---|
| USUARIO_DESCONHECIDO | 401 | api/src/autenticacao.js:13 | — (confirmado ao vivo) |
| SOMENTE_ORGANIZACAO | 403 | api/src/autenticacao.js:23 | — (confirmado ao vivo) |
| SOMENTE_PARTICIPANTE | 403 | api/src/autenticacao.js:31 | — (confirmado ao vivo) |
| NAO_ENCONTRADO | 404 | api/src/erros.js:24; m1-grade/rotas.js:135; m2-inscricoes/rotas.js:54,137,148,180; m3-presenca/rotas.js:66,95,186,242 | — (confirmado ao vivo) |
| DADOS_INVALIDOS | 422 | api/src/erros.js:11,33 (mais m1-grade/validacao.js, m3-presenca/rotas.js) | — (confirmado ao vivo, corpo não-JSON e campo desconhecido) |
| QUANTIDADE_DE_ENCONTROS | 422 | api/src/modulos/m1-grade/regras.js:36 | — |
| ENCONTRO_INVALIDO | 422 | api/src/modulos/m1-grade/regras.js:20 | — |
| VAGAS_ACIMA_DA_CAPACIDADE | 422 | api/src/modulos/m1-grade/regras.js:28 | — |
| CONFLITO_DE_SALA | 409 | api/src/modulos/m1-grade/regras.js:63 | — |
| CAMPO_NAO_EDITAVEL | 422 | api/src/modulos/m1-grade/regras.js:76 | — (confirmado ao vivo com `tipo`) |
| VAGAS_ABAIXO_DOS_INSCRITOS | 409 | api/src/modulos/m1-grade/regras.js:83 | — |
| ATIVIDADE_JA_INICIADA | 422 | api/src/modulos/m1-grade/rotas.js:102; m2-inscricoes/rotas.js:157 | — |
| ATIVIDADE_CANCELADA | 422 | api/src/modulos/m1-grade/rotas.js:98; m1-grade/regras.js:73; m2-inscricoes/rotas.js:57; m3-presenca/rotas.js:68 | — (confirmado ao vivo em inscrever e cancelar) |
| INSCRICOES_ENCERRADAS | 422 | api/src/modulos/m2-inscricoes/rotas.js:64 | — |
| INSCRICAO_BLOQUEADA | 422 | não aparece no código | esperado — contrato diz "só em grupos com M5", e M5 não existe neste repositório |
| JA_INSCRITO | 409 | api/src/modulos/m2-inscricoes/rotas.js:71 | — |
| CONFLITO_DE_HORARIO | 409 | api/src/modulos/m2-inscricoes/rotas.js:86,211 | — |
| LIMITE_DE_MINICURSOS | 422 | api/src/modulos/m2-inscricoes/rotas.js:98,225 | — |
| INSCRICAO_INATIVA | 422 | api/src/modulos/m2-inscricoes/rotas.js:162 | — |
| SEM_CONVOCACAO | 422 | api/src/modulos/m2-inscricoes/rotas.js:185 | — (confirmado ao vivo) |
| CONVOCACAO_EXPIRADA | 422 | api/src/modulos/m2-inscricoes/rotas.js:195 | — |
| FORA_DA_JANELA | 422 | api/src/modulos/m3-presenca/rotas.js:72,110,153,212 | — (confirmado ao vivo em GET /encontros/:id/codigo) |
| CODIGO_INVALIDO | 422 | api/src/modulos/m3-presenca/rotas.js:114,158 | — |
| NAO_INSCRITO | 403 | api/src/modulos/m3-presenca/rotas.js:105,143,206 | — (confirmado ao vivo em presença manual) |
| SINCRONIZACAO_TARDIA | 422 | api/src/modulos/m3-presenca/rotas.js:148 | — |
| JUSTIFICATIVA_OBRIGATORIA | 422 | api/src/modulos/m3-presenca/rotas.js:195 | — |
| LIMITE_DE_MANUAIS | 422 | api/src/modulos/m3-presenca/rotas.js:222 | — |
| ATIVIDADE_NAO_ENCERRADA | 422 | não aparece no código | esperado — rota do certificado (M4) não implementada |
| PRESENCA_INSUFICIENTE | 422 | não aparece no código | esperado — rota do certificado (M4) não implementada |

Todos os códigos presentes batem em status e local com a coluna "onde aparece" do contrato §6. Os três ausentes (`INSCRICAO_BLOQUEADA`, `ATIVIDADE_NAO_ENCERRADA`, `PRESENCA_INSUFICIENTE`) correspondem exatamente às rotas de M4/M5 não implementadas — não é achado por si (regra 10), mas fica no registro.

## Identificação (seção 1)

`api/src/autenticacao.js:9` exclui só `req.path.startsWith('/_teste/')`. O contrato-api.md:12 exige que, além de `/_teste/*`, a rota `GET /certificados/:codigo` também fique fora da exigência de `X-Usuario`. Hoje essa exclusão **não existe nomeada** em `autenticacao.js` — testei ao vivo (`curl -i http://localhost:3000/certificados/SA26-XXXX-0000` sem cabeçalho) e a resposta foi `401 USUARIO_DESCONHECIDO`, não porque a rota público-sem-usuário foi implementada e recusada por outro motivo, mas porque a rota nem existe e cai no middleware `identificar` antes do roteador de M4 (que não existe). Isso é esperado hoje dado que M4 não foi implementado, mas a lista de exclusão em si — que é o artefato pedido pela regra do repositório (AGENTS.md: "toda rota pública nova, como GET /certificados/:codigo do M4, precisa ser excluída explicitamente nele") — ainda não tem essa entrada. Registro como achado de atenção, não como bug ativo, já que não há rota para excluir ainda.

## Interface

| Campo ou rota consumido | Onde | Divergência |
|---|---|---|
| `X-Usuario` no cabeçalho | app/src/api/cliente.js:11 | — bate com contrato §1 |
| `{erro, mensagem}` no corpo de erro | app/src/api/cliente.js:22 (`dados?.erro`, `dados?.mensagem`) | — bate com contrato §1 |
| GET /salas | app/src/modulos/m1-grade/FormularioAtividade.jsx:21 | — bate |
| POST /atividades — titulo, tipo, salaId, vagas, encontros[].inicio/fim | app/src/modulos/m1-grade/FormularioAtividade.jsx:42-55 | — bate exatamente com o schema de entrada do contrato-api.md:96-105 |
| GET /atividades?dia=&tipo= | app/src/modulos/m1-grade/ProgramacaoPorDia.jsx:19-22 | — bate |
| GET /atividades/:id — titulo, tipo, situacao, vagas, ocupadas, emEspera, vagasRestantes, cargaHorariaMinutos, encontros[].id/inicio/fim | app/src/modulos/m1-grade/DetalheAtividade.jsx:42-64 | — bate |
| GET /encontros/:id/codigo — codigo, trocaEm | app/src/modulos/m3-presenca/TelaCodigoEncontro.jsx:14-18 | — bate |
| POST /encontros/:id/presencas — codigo, lidoEm | app/src/modulos/m3-presenca/TelaLeituraPresenca.jsx:24-27,61-65 | — bate |

Nenhum campo traduzido, apelidado ou renomeado encontrado do lado da interface. Nenhuma tela para M2 (inscrições), M4 ou M5 existe em app/src/modulos, coerente com a API não ter essas rotas ainda.

## Execução real

A API subiu com sucesso. Comandos: `cd api && npm install` (ok, sem mudanças) e depois `MODO_TESTE=1 PORT=3000 node src/servidor.js` em background. Observação operacional: numa primeira tentativa via `npm start &` dentro do mesmo comando de background havia processos node.exe zumbis de uma sessão anterior já escutando na porta 3000 sem `MODO_TESTE`, fazendo `/_teste/relogio` responder 404 (comportamento correto para esse processo antigo, mas me enganou momentaneamente). Matei todos os `node.exe` residuais (`taskkill /F /IM node.exe`) e subi de novo isolado — aí respondeu 200 corretamente.

Sequência real executada e confirmada por resposta HTTP real (não simulada):
- `POST /_teste/reset` → 204
- `GET /salas` sem `X-Usuario` → 401 `USUARIO_DESCONHECIDO`; com `X-Usuario: p-carla` → 200, 4 salas na ordem dos dados iniciais
- `POST /atividades` como `p-carla` → 403 `SOMENTE_ORGANIZACAO`; como `org-ana` → 201 `Atividade` completa com todos os campos calculados
- `GET /atividades?dia=2026-10-19` → 200, filtro aplicado
- `GET /atividades/:id` → 200
- `PATCH /atividades/:id` com `titulo` → 200; com `tipo` → 422 `CAMPO_NAO_EDITAVEL`
- `POST /atividades/:id/cancelamento` → 200, `situacao: "cancelada"`
- `POST /atividades/:id/inscricoes` em atividade cancelada → 422 `ATIVIDADE_CANCELADA`
- Nova atividade (vagas=1) → `POST /atividades/:id/inscricoes` p-carla → 201 `confirmada`; p-diego → 201 `em_espera`, `posicaoNaEspera: 1`
- `GET /inscricoes` (participante, só próprias) e `GET /inscricoes?atividadeId=` (organização, todas) → 200, ambas corretas
- `POST /inscricoes/:id/cancelamento` sem `X-Usuario` → 401
- `POST /inscricoes/:id/confirmacao` sem convocação → 422 `SEM_CONVOCACAO`
- `GET /encontros/:id/codigo` fora da janela → 422 `FORA_DA_JANELA`; como participante → 403 `SOMENTE_ORGANIZACAO`
- `PUT /_teste/relogio` avançando para dentro do 1º encontro → 200
- `GET /encontros/:id/codigo` dentro da janela → 200 `CodigoDoEncontro` completo (`encontroId`, `codigo` 6 chars, `trocaEm`, `validoAte`)
- `POST /encontros/:id/presencas` com o código válido → 201 `Presenca` (`origem: "qr"`); repetido → 200, mesmo id
- `POST /encontros/:id/presencas/manual` para participante sem inscrição confirmada → 403 `NAO_INSCRITO`
- `GET /encontros/:id/presencas` → 200 `[Presenca]`
- `GET /certificados/:codigo` (M4) sem `X-Usuario` → 401 (rota não existe, cai no middleware de identificação antes do 404)
- `GET /painel/atividades` (M5) → 404 `NAO_ENCONTRADO` genérico (rota inexistente)
- Corpo não-JSON em `POST /atividades` → 422 `DADOS_INVALIDOS`
- `POST /_teste/reset` sem `X-Usuario` → 204 (pública, correto)

Ao final, derrubei o processo (`taskkill /F /IM node.exe`) e confirmei que a porta 3000 parou de responder.

## Achados

1. [IDENTIFICAÇÃO] contrato-api.md:12 exige `GET /certificados/:codigo` fora da exigência de `X-Usuario`; `api/src/autenticacao.js:9` só exclui `/_teste/*`. Hoje isso não quebra nada porque a rota não existe (M4 não implementado), mas a lista de exclusão pedida pelo próprio AGENTS.md do repositório ainda não tem essa entrada nomeada — vale registrar para quando M4 for implementado.
2. [ROTA] M4 (POST /atividades/:id/certificado, GET /certificados, GET /certificados/:codigo, GET /extrato) e M5 (GET /painel/atividades, GET /painel/atividades/:id/sem-chance, GET /painel/atividades/:id/frequencia.csv, GET /painel/bloqueios, DELETE /painel/bloqueios/:participanteId) do contrato-api.md:188-256 não têm nenhum handler em api/src (confirmado em api/src/app.js:5-9, sem import de módulos m4/m5, e por `find` na pasta modulos/). Não é divergência de forma — apenas "não implementada" — mas anoto por completude: nenhuma rota de M4/M5 responde nada além do 404 genérico.

## Veredito

Nas rotas efetivamente implementadas (M1, M2, M3, /_teste), API e interface respeitam o contrato-api.md à risca — nomes de campo, rotas, status e códigos de erro batem exatamente, confirmado por leitura estática e por chamadas reais contra a API rodando. M4 e M5 inteiros ainda não existem, o que por si não é violação (rota sem handler é "não implementada"), mas a lista de exclusão de `X-Usuario` em `api/src/autenticacao.js` já deveria ter `GET /certificados/:codigo` nomeada, como o próprio AGENTS.md do projeto exige, e ainda não tem.
