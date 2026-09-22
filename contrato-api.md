# Contrato da API — Semana Acadêmica

> **Restrição do cliente.** A interface e o juiz de aceitação consomem exatamente o que está aqui. Rota, nome de campo e código de retorno não se negociam.
>
> O contrato diz **o que** a API responde. **Quando** cada código aparece — com que prazo, que limite, em que ordem — está no documento de requisitos, que você consulta na rodada 2 da entrevista, e só nela.

---

## 1. Convenções

- Entrada e saída em JSON UTF-8, exceto a planilha do M5.
- **Identificação:** cabeçalho `X-Usuario: <id>` em toda rota, menos `GET /certificados/:codigo` e `/_teste/*`. Sem o cabeçalho, ou com um id que não existe → `401 USUARIO_DESCONHECIDO`.
- **Datas:** ISO 8601 com fuso (`2026-10-19T19:00:00-03:00` ou `2026-10-19T22:00:00Z`). A API pode responder em qualquer fuso; o juiz compara o instante, não o texto.
- **Identificadores gerados:** prefixo + 8 hexadecimais minúsculos — `atv_1a2b3c4d`, `enc_…`, `ins_…`, `pre_…`.
- **Erro:** sempre `{"erro": "CODIGO", "mensagem": "texto livre"}`. O juiz confere o status e o `erro`; a mensagem é de vocês.
- Corpo que não é JSON, campo obrigatório ausente ou de tipo errado → `422 DADOS_INVALIDOS`.
- **Ordem das verificações:** identificação (401) → perfil (403 `SOMENTE_…`) → existência (404 `NAO_ENCONTRADO`) → corpo (422 `DADOS_INVALIDOS`) → regras do recurso. Quando mais de uma regra do recurso recusa a mesma operação, a ordem entre elas é regra de negócio.

## 2. Como o juiz roda a API: `projeto.json`

A stack é livre. Para o juiz rodar a API de todos os grupos do mesmo jeito, a raiz do repositório tem um `projeto.json`:

```jsonc
{
  "stack": "Node 22 + Express + SQLite; interface em Flutter web",   // texto livre
  "api": {
    "pasta": "api",               // onde rodar os comandos, a partir da raiz
    "instalar": "npm install",    // roda uma vez, antes de iniciar
    "iniciar": "npm start"        // sobe a API e fica rodando
  },
  "testes": ["npm test", "flutter test"]   // os comandos que vocês usam para rodar os testes
}
```

- O juiz roda `instalar` e depois `iniciar` dentro de `api.pasta`, com `MODO_TESTE=1` e `PORT=3000` no ambiente, e espera até 60 s pela primeira resposta.
- Os dois comandos precisam funcionar no Linux só com o runtime da linguagem instalado. O que o `instalar` baixar, tudo bem.
- A API não depende de serviço externo: banco embutido (SQLite ou arquivo), nada de servidor de banco, Docker ou nuvem.
- A API escuta na porta da variável `PORT` (padrão 3000).
- O script de evidências lê `testes` para reconhecer as execuções de teste nas sessões do OpenCode.

## 3. Modo de teste

Com `MODO_TESTE=1` no ambiente, a API expõe:

| Rota | Retorno | O que faz |
|---|---|---|
| `POST /_teste/reset` | 204 | Apaga tudo, recarrega os dados iniciais (seção 4) e põe o relógio em `2026-10-13T09:00:00-03:00` |
| `PUT /_teste/relogio` | 200 | Corpo `{"agora": "<ISO>"}`; responde `{"agora": "<ISO>"}` |
| `GET /_teste/relogio` | 200 | Responde `{"agora": "<ISO>"}` |

- No modo de teste **o relógio fica parado**: só muda por `PUT /_teste/relogio`. Toda regra que depende de tempo usa esse relógio — nunca a hora do sistema direto.
- O juiz sempre começa com `POST /_teste/reset` e depois só avança o relógio.
- Sem `MODO_TESTE`, as rotas `/_teste/*` respondem 404 e o relógio é o real.

## 4. Dados iniciais

Carregados na primeira subida e a cada `POST /_teste/reset`. Não há rota para criar usuário ou sala.

**Evento:** Semana Acadêmica 2026, de 19/10/2026 (segunda) a 23/10/2026 (sexta), horário de Brasília.

| id | nome | papel |
|---|---|---|
| `org-ana` | Ana Beatriz Lima | `organizacao` |
| `org-bruno` | Bruno Tavares | `organizacao` |
| `p-carla` | Carla Mendes Souza | `participante` |
| `p-diego` | Diego Alves | `participante` |
| `p-elisa` | Elisa Fernandes da Rocha | `participante` |
| `p-fabio` | Fábio Nogueira | `participante` |
| `p-gabriela` | Gabriela Moura Castro | `participante` |
| `p-heitor` | Heitor Campos | `participante` |
| `p-isadora` | Isadora Ribeiro dos Santos | `participante` |
| `p-joao` | João Pedro Martins | `participante` |

| id | nome | capacidade |
|---|---|---|
| `auditorio` | Auditório Central | 200 |
| `sala-101` | Sala 101 | 40 |
| `sala-102` | Sala 102 | 40 |
| `lab-3` | Laboratório 3 | 20 |

## 5. Rotas

### M1 — Grade de atividades

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| GET | `/salas` | todos | 200 `[Sala]` |
| GET | `/atividades` | todos | 200 `[Atividade]` — filtros `?dia=AAAA-MM-DD` e `?tipo=palestra\|minicurso` |
| GET | `/atividades/:id` | todos | 200 `Atividade` |
| POST | `/atividades` | organização | 201 `Atividade` |
| PATCH | `/atividades/:id` | organização | 200 `Atividade` |
| POST | `/atividades/:id/cancelamento` | organização | 200 `Atividade` |

```jsonc
// POST /atividades — entrada
{
  "titulo": "Flutter do zero",
  "tipo": "minicurso",
  "salaId": "lab-3",
  "vagas": 20,
  "encontros": [
    { "inicio": "2026-10-19T19:00:00-03:00", "fim": "2026-10-19T22:00:00-03:00" },
    { "inicio": "2026-10-20T19:00:00-03:00", "fim": "2026-10-20T22:00:00-03:00" }
  ]
}
// PATCH /atividades/:id — entrada: qualquer subconjunto dos campos acima

// Atividade
{
  "id": "atv_1a2b3c4d",
  "titulo": "Flutter do zero",
  "tipo": "minicurso",                  // "palestra" | "minicurso"
  "salaId": "lab-3",
  "vagas": 20,
  "encontros": [                        // em ordem de início
    { "id": "enc_5e6f7a8b", "inicio": "…", "fim": "…" }
  ],
  "cargaHorariaMinutos": 360,           // calculado
  "situacao": "prevista",               // calculado: "prevista" | "em_andamento" | "encerrada" | "cancelada"
  "ocupadas": 12,                       // calculado
  "vagasRestantes": 8,                  // calculado
  "emEspera": 3                         // calculado
}

// Sala
{ "id": "sala-101", "nome": "Sala 101", "capacidade": 40 }
```

### M2 — Inscrições e lista de espera

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| POST | `/atividades/:id/inscricoes` | participante | 201 `Inscricao` (sem corpo na entrada) |
| GET | `/inscricoes` | todos | 200 `[Inscricao]` — participante recebe só as próprias; filtro `?atividadeId=` |
| GET | `/inscricoes/:id` | todos | 200 `Inscricao` |
| POST | `/inscricoes/:id/cancelamento` | participante | 200 `Inscricao` |
| POST | `/inscricoes/:id/confirmacao` | participante | 200 `Inscricao` |

```jsonc
// Inscricao
{
  "id": "ins_9c0d1e2f",
  "atividadeId": "atv_1a2b3c4d",
  "participanteId": "p-carla",
  "status": "confirmada",      // "confirmada" | "em_espera" | "convocada" | "cancelada" | "expirada"
  "posicaoNaEspera": null,     // número (1, 2, …) só quando em_espera
  "convocadaAte": null,        // instante, só quando convocada
  "criadaEm": "…"
}
```

### M3 — Presença por QR

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| GET | `/encontros/:id/codigo` | organização | 200 `CodigoDoEncontro` |
| POST | `/encontros/:id/presencas` | participante | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| POST | `/encontros/:id/presencas/manual` | organização | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| GET | `/encontros/:id/presencas` | organização | 200 `[Presenca]` |

```jsonc
// CodigoDoEncontro
{
  "encontroId": "enc_5e6f7a8b",
  "codigo": "K7M2QX",           // 6 caracteres
  "trocaEm": "…",               // quando a tela deve buscar o próximo código
  "validoAte": "…"              // primeiro instante em que este código deixa de ser aceito
}

// POST /encontros/:id/presencas — entrada
{ "codigo": "K7M2QX", "lidoEm": "…" }        // lidoEm é opcional: leitura feita sem internet

// POST /encontros/:id/presencas/manual — entrada
{ "participanteId": "p-carla", "justificativa": "…" }   // justificativa ausente também é JUSTIFICATIVA_OBRIGATORIA

// Presenca
{
  "id": "pre_3a4b5c6d",
  "encontroId": "enc_5e6f7a8b",
  "participanteId": "p-carla",
  "origem": "qr",               // "qr" | "qr_offline" | "manual"
  "lidoEm": "…",                // o instante que valeu para as regras
  "registradaEm": "…",
  "justificativa": null         // texto só quando manual
}
```

### M4 — Certificados (grupos de 4 e de 5)

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| POST | `/atividades/:id/certificado` | participante | 201 `Certificado` na primeira vez; 200 `Certificado` depois |
| GET | `/certificados` | participante | 200 `[Certificado]` — os já emitidos |
| GET | `/certificados/:codigo` | **público, sem `X-Usuario`** | 200 `Verificacao` |
| GET | `/extrato` | participante | 200 `Extrato` |

```jsonc
// Certificado
{
  "codigo": "SA26-7K2M-9QXA",
  "atividadeId": "atv_1a2b3c4d",
  "participanteId": "p-carla",
  "cargaHorariaMinutos": 360,
  "presencas": 2,
  "encontros": 2,
  "emitidoEm": "…"
}

// Verificacao
{
  "codigo": "SA26-7K2M-9QXA",
  "participante": "Carla M. S.",
  "atividade": "Flutter do zero",
  "cargaHorariaMinutos": 360,
  "emitidoEm": "…"
}

// Extrato
{
  "itens": [
    { "atividadeId": "atv_1a2b3c4d", "titulo": "Flutter do zero", "tipo": "minicurso",
      "cargaHorariaMinutos": 360, "codigo": null }
  ],
  "palestrasMinutos": 0,        // bruto
  "minicursosMinutos": 360,     // bruto
  "totalMinutos": 360,          // bruto
  "aproveitadoMinutos": 360     // o que conta como hora complementar
}
```

### M5 — Painel da organização (grupos de 5)

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| GET | `/painel/atividades` | organização | 200 `[LinhaDoPainel]` |
| GET | `/painel/atividades/:id/sem-chance` | organização | 200 `[SemChance]` |
| GET | `/painel/atividades/:id/frequencia.csv` | organização | 200 `text/csv` |
| GET | `/painel/bloqueios` | organização | 200 `[Bloqueio]` |
| DELETE | `/painel/bloqueios/:participanteId` | organização | 204 — quem não está bloqueado → 404 |

```jsonc
// LinhaDoPainel
{
  "atividadeId": "atv_1a2b3c4d", "titulo": "Flutter do zero",
  "vagas": 20, "ocupadas": 12, "emEspera": 3,
  "ocupacaoPercentual": 60.0,
  "frequenciaPercentual": null
}

// SemChance
{ "participanteId": "p-heitor", "nome": "Heitor Campos", "faltas": 2, "faltasPermitidas": 1 }

// Bloqueio
{ "participanteId": "p-heitor", "nome": "Heitor Campos",
  "atividades": ["atv_1a2b3c4d", "atv_7e8f9a0b"], "bloqueadoDesde": "…" }
```

## 6. Códigos de retorno

| Código | Status | Onde aparece |
|---|---|---|
| `USUARIO_DESCONHECIDO` | 401 | toda rota identificada |
| `SOMENTE_ORGANIZACAO` | 403 | rotas de organização |
| `SOMENTE_PARTICIPANTE` | 403 | rotas de participante |
| `NAO_ENCONTRADO` | 404 | recurso inexistente |
| `DADOS_INVALIDOS` | 422 | corpo mal formado |
| `QUANTIDADE_DE_ENCONTROS` | 422 | criar atividade |
| `ENCONTRO_INVALIDO` | 422 | criar atividade |
| `VAGAS_ACIMA_DA_CAPACIDADE` | 422 | criar e alterar atividade |
| `CONFLITO_DE_SALA` | 409 | criar atividade |
| `CAMPO_NAO_EDITAVEL` | 422 | alterar atividade |
| `VAGAS_ABAIXO_DOS_INSCRITOS` | 409 | alterar atividade |
| `ATIVIDADE_JA_INICIADA` | 422 | cancelar atividade, cancelar inscrição |
| `ATIVIDADE_CANCELADA` | 422 | alterar e cancelar atividade, inscrever, obter código, certificado |
| `INSCRICOES_ENCERRADAS` | 422 | inscrever |
| `INSCRICAO_BLOQUEADA` | 422 | inscrever — só em grupos com M5 |
| `JA_INSCRITO` | 409 | inscrever |
| `CONFLITO_DE_HORARIO` | 409 | inscrever, confirmar convocação |
| `LIMITE_DE_MINICURSOS` | 422 | inscrever, confirmar convocação |
| `INSCRICAO_INATIVA` | 422 | cancelar inscrição |
| `SEM_CONVOCACAO` | 422 | confirmar convocação |
| `CONVOCACAO_EXPIRADA` | 422 | confirmar convocação |
| `FORA_DA_JANELA` | 422 | obter código, registrar presença, presença manual |
| `CODIGO_INVALIDO` | 422 | registrar presença |
| `NAO_INSCRITO` | 403 | registrar presença, presença manual, certificado |
| `SINCRONIZACAO_TARDIA` | 422 | registrar presença com `lidoEm` |
| `JUSTIFICATIVA_OBRIGATORIA` | 422 | presença manual |
| `LIMITE_DE_MANUAIS` | 422 | presença manual |
| `ATIVIDADE_NAO_ENCERRADA` | 422 | certificado |
| `PRESENCA_INSUFICIENTE` | 422 | certificado |

## 7. O que este contrato não diz

Cada código da seção 6 existe porque existe uma regra. Prazo, limite, janela, tolerância, arredondamento, ordem entre regras e o que acontece quando o tempo passa sem ninguém acessar o sistema: nada disso está aqui, e o juiz cobra tudo isso. Está no documento de requisitos, e o caminho até ele é a entrevista em duas rodadas: primeiro o agente pergunta, depois você consulta.
