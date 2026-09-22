---
name: novo-subagente
description: Cria um subagente do Claude Code em .claude/agents/<nome>.md — frontmatter, ferramentas permitidas e prompt — e a cópia equivalente no formato OpenCode em .opencode/agent/<nome>.md para a entrega. Use quando pedirem para criar um agente, um subagente, um revisor, um auditor, ou "um agente que faz X".
---

# Subagente novo

Um subagente é um markdown. Frontmatter em cima, prompt embaixo. Não tem mais nada.

Ele existe para fazer **uma** coisa que o agente principal não deveria fazer sozinho —
normalmente porque quem escreveu o código não é quem deve assinar o aceite dele.

## Onde mora

São **dois arquivos** com o mesmo nome e o mesmo prompt:

```
.claude/agents/<nome>.md      ← o que o Claude Code usa
.opencode/agent/<nome>.md     ← cópia equivalente, exigida na entrega
```

O `name` do frontmatter é como você chama no Claude Code: "use o subagente `<nome>`"
(ou `@<nome>`). No OpenCode, o nome do arquivo é o nome do agente: `@<nome>`.

O corpo (o prompt) é **idêntico** nos dois. Só o frontmatter muda de formato.
Mudou um, mude o outro no mesmo commit.

## As seis regras

**1. O contexto dele é vazio.**

O subagente **não vê a conversa** que você teve com o agente principal. Ele recebe só o
pedido que foi mandado para ele, mais o que ele mesmo ler do disco.

Isso é a vantagem — ele não herda as justificativas de quem escreveu o código — e é a
obrigação: o prompt precisa dizer **onde achar** o que ele precisa ler. Não escreva
"analise o que discutimos". Ele não estava lá.

**2. `tools:` é o contrato de poder, e é o campo mais importante.**

No Claude Code, `tools` é uma lista separada por vírgula com os nomes das ferramentas
(`Read, Grep, Glob, Bash, Write, Edit, ...`). Só o que está listado fica disponível.

Revisor/auditor só-leitura:

```yaml
tools: Read, Grep, Glob
```

Se ele precisa rodar a suíte de testes, acrescente `Bash` — e só nesse caso:

```yaml
tools: Read, Grep, Glob, Bash
```

Um auditor com `Write` ou `Edit` conserta o que encontrou, e você perde o achado — o
relatório vira "estava tudo bem depois que eu ajustei". Tire a ferramenta, não peça
educadamente no prompt.

**Omitir `tools:` não é "nenhuma ferramenta" — é herdar todas**, inclusive `Write`,
`Edit` e `Agent`. Sempre escreva a lista.

Não inclua `Agent`: sem ele, o subagente não abre outros subagentes e não estoura o
limite de requisições por minuto da conta.

**3. `description` é o gatilho.**

Terceira pessoa, dizendo **o que faz** e **quando usar**, com as palavras que a pessoa
realmente vai digitar. É por essa frase que o agente principal decide chamar.

Ruim: `description: Um agente auditor.`
Bom: `description: Audita uma entrega contra a spec e aponta regra sem teste. Use quando o agente principal declarar que terminou.`

A mesma `description`, palavra por palavra, vai nos dois arquivos.

**4. Campo com nome errado não dá erro.**

Frontmatter do Claude Code: `name` e `description` são obrigatórios; `tools` e `model`
são opcionais. Qualquer outro campo é ignorado sem aviso. Escreveu `tool:` no lugar de
`tools:`? O campo some, o agente herda todas as ferramentas e você só descobre quando
ele reescrever seu código.

Nome de ferramenta também é exato e com maiúscula: `Read`, não `read`.

**5. Confira sem gastar token.**

Rode `/agents` no Claude Code: lista os subagentes carregados e as ferramentas de cada
um. Se `Write` ou `Edit` aparece no que você quis bloquear, o frontmatter está errado.

Arquivo criado com a sessão aberta pode não ser visto até reiniciar: se o agente não
aparece em `/agents`, **saia e reabra o Claude Code**.

**6. A cópia OpenCode é tradução, não reinvenção.**

Mesmo corpo, mesma `description`, frontmatter no formato do OpenCode:

```yaml
---
description: <a mesma do .claude/agents/<nome>.md>
mode: subagent
temperature: 0.1
tools:
  write: false
  edit: false
  patch: false
  task: false
  bash: false     # true só se no Claude Code tiver Bash
  read: true
  grep: true
  glob: true
---
```

Tradução das ferramentas:

| Claude Code (`tools:` lista) | OpenCode (`tools:` mapa) |
|---|---|
| `Read` | `read: true` |
| `Grep` | `grep: true` |
| `Glob` | `glob: true` |
| `Bash` | `bash: true` |
| `Write` | `write: true` |
| `Edit` | `edit: true`, `patch: true` |
| `Agent` | `task: true` |

O que **não** está na lista do Claude Code vira `false` explícito no OpenCode — no
OpenCode, ferramenta não mencionada fica liberada. `mode: subagent` sempre.

No OpenCode não existe campo `name`: o nome vem do arquivo.

## O corpo é o prompt

Cinco seções, nesta ordem:

```
1. Quem ele é e por que não é você     (uma frase, não um cargo inventado)
2. Entrada                              onde achar o que ele precisa ler,
                                        e o que fazer se não achar
3. Procedimento                         passos numerados, verbo no imperativo
4. Formato da saída                     o desenho exato do relatório
5. O que ele não faz                    a lista de proibições
```

A seção 5 é a que mais economiza tempo depois. "Não elogie", "não conserte", "não
presuma", "cite `arquivo:linha`". Sem ela, a saída vem cheia de "excelente
implementação!" e nenhum achado.

## Checklist

```
1. .claude/agents/<nome>.md com name = <nome>
2. tools: lista explícita; para quem opina, sem Write, Edit nem Agent
   (Read, Grep, Glob; + Bash só se precisar rodar algo)
3. description em terceira pessoa, com o quando
4. prompt não cita a conversa — diz onde ler
5. .opencode/agent/<nome>.md com o mesmo corpo e a mesma description,
   mode: subagent, tools traduzidas pela tabela, o resto false
6. /agents mostra o agente com as ferramentas que você quis
7. Claude Code reiniciado se o agente não apareceu
```
