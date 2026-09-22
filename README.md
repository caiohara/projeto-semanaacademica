# Semana Acadêmica — repositório inicial

Ponto de partida do projeto final da disciplina de desenvolvimento com agentes de IA (UniFil, 2026). O enunciado completo está no Classroom; aqui fica o que o grupo precisa para começar.

## Como começar

1. Um integrante clica em **Use this template → Create a new repository**, escolhe **PUBLIC** e dá o nome do repositório do grupo.
2. Em **Settings → Collaborators**, adiciona os colegas.
3. Cada integrante clona o repositório, abre o OpenCode na raiz e confere o que veio da aula: `opencode debug skill` precisa listar `grilling`, `to-spec`, `tdd` e `novo-subagente`, e `opencode debug agent auditor` precisa mostrar `write`, `edit` e `task` como `false`.
4. Preencham o `EQUIPE.md` e o `projeto.json`.
5. Escrevam o `AGENTS.md` da raiz (com a stack escolhida) e o de cada subprojeto.
6. Marco 1: a API responde `POST /_teste/reset` no modo de teste (seção 3 do `contrato-api.md`).

## O que já vem

| Caminho | O que é | O que fazer |
|---|---|---|
| `contrato-api.md` | Rotas, campos, códigos de retorno, `projeto.json`, dados iniciais e modo de teste | Não alterar |
| `projeto.json` | Como o juiz instala, inicia e testa a API | Preencher (modelo na seção 2 do contrato) |
| `EQUIPE.md` | O dono de cada módulo | Preencher |
| `.opencode/skills/` | As skills da aula: `grilling`, `to-spec`, `tdd`, `novo-subagente` | Ler. A `tdd` ainda fala do `biblioteca-api` e de `node --test`: adaptem para a stack de vocês |
| `.opencode/agent/auditor.md` | O subagente auditor: para cada regra da spec, confere a pergunta da entrevista que a originou e o teste que a comprova. Só lê | Ler antes de usar. Chamar com `@auditor audite o módulo M2 contra specs/M2-inscricoes.md` |
| `entrevistas/` | As duas rodadas da entrevista de cada módulo | Um arquivo por módulo, criado na rodada 1 |
| `specs/` | Uma spec por módulo | Criada com a skill `to-spec` depois das duas rodadas |
| `auditorias/` | Pareceres do `auditor` e do `revisor-de-contrato` | Salvar inteiros, sem editar |
| `evidencias/exportar-evidencias.js` | Exporta as sessões do OpenCode e gera a linha do tempo de cada uma | Cada integrante roda toda semana: `node evidencias/exportar-evidencias.js` |

## O que vocês criam

- `AGENTS.md` na raiz e em cada subprojeto.
- A API e a interface, com os testes.
- As skills do grupo em `.opencode/skills/` (`novo-endpoint`, `nova-tela`, `regra-de-tempo`) e o subagente `revisor-de-contrato` em `.opencode/agent/`, criado com a skill `novo-subagente`.

## O documento de requisitos fica fora daqui

O documento de requisitos é para vocês consultarem na rodada 2 da entrevista, e só nela. Guardem o arquivo fora desta pasta. Não façam commit dele, não o anexem à conversa e não peçam ao agente para lê-lo: as sessões exportadas e o histórico do git mostram as três coisas.

---

As skills da aula foram reescritas pelo professor a partir de [mattpocock/skills](https://github.com/mattpocock/skills).
