---
name: novo-subagente
description: Cria um subagente do OpenCode em .opencode/agent/<nome>.md — frontmatter, ferramentas permitidas e prompt. Use quando pedirem para criar um agente, um subagente, um revisor, um auditor, ou "um agente que faz X".
---

# Subagente novo

Um subagente é um markdown. Frontmatter em cima, prompt embaixo. Não tem mais nada.

Ele existe para fazer **uma** coisa que o agente principal não deveria fazer sozinho —
normalmente porque quem escreveu o código não é quem deve assinar o aceite dele.

## Onde mora

```
.opencode/agent/<nome>.md
```

O nome do arquivo é como você chama: `@<nome>` no chat.

## As cinco regras

**1. `mode: subagent`.**

```yaml
mode: subagent
```

`primary` é agente principal (aparece no seletor). `subagent` só roda quando alguém
chama. Para um revisor, é sempre `subagent`.

**2. O contexto dele é vazio.**

O subagente **não vê a conversa** que você teve com o agente principal. Ele recebe só o
pedido que foi mandado para ele, mais o que ele mesmo ler do disco.

Isso é a vantagem — ele não herda as justificativas de quem escreveu o código — e é a
obrigação: o prompt precisa dizer **onde achar** o que ele precisa ler. Não escreva
"analise o que discutimos". Ele não estava lá.

**3. `tools:` é o contrato de poder, e é o campo mais importante.**

```yaml
tools:
  write: false     # não cria arquivo
  edit: false      # não altera arquivo
  task: false      # não abre outro subagente
  bash: true       # mas roda a suíte
  read: true
  grep: true
  glob: true
```

Um auditor com `write: true` conserta o que encontrou, e você perde o achado — o
relatório vira "estava tudo bem depois que eu ajustei". Tire a ferramenta, não peça
educadamente no prompt.

`task: false` também importa aqui: sem isso, um subagente pode abrir outros e estourar
o limite de requisições por minuto da conta.

**4. `description` é o gatilho.**

Terceira pessoa, dizendo **o que faz** e **quando usar**, com as palavras que a pessoa
realmente vai digitar. É por essa frase que o agente principal decide chamar.

Ruim: `description: Um agente auditor.`
Bom: `description: Audita uma entrega contra a spec e aponta regra sem teste. Use quando o agente principal declarar que terminou.`

**5. Campo com nome errado não dá erro.**

Frontmatter aceito: `name, model, description, mode, hidden, color, temperature, top_p,
permission, tools, steps, options, disable`. Qualquer outro é **silenciosamente
ignorado** — some dentro de `options` e o agente roda como se você não tivesse escrito
nada. Escreveu `tool:` no lugar de `tools:`? O agente ganha permissão de escrita e você
só descobre quando ele reescrever seu código.

Por isso a conferência da regra 6 não é opcional.

**6. Confira sem gastar token.**

```
opencode debug agent <nome>
```

Mostra a configuração já resolvida: o `mode`, o `temperature` e a lista de `tools` com
`true`/`false`. Se `write` aparece `true` no que você quis bloquear, o frontmatter está
errado.

Config só é lida na inicialização: **saia e reabra o opencode** depois de criar o
arquivo, senão o agente não existe.

## O corpo é o prompt

Quatro seções, nesta ordem:

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
1. .opencode/agent/<nome>.md, nome do arquivo = como vai ser chamado
2. mode: subagent
3. tools: só o que ele precisa; write e edit false para quem opina
4. task: false
5. description em terceira pessoa, com o quando
6. prompt não cita a conversa — diz onde ler
7. opencode debug agent <nome> mostra as ferramentas como você quis
8. opencode reiniciado
```
