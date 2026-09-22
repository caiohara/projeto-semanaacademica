---
name: grilling
description: Entrevista o usuário até não sobrar decisão implícita sobre uma funcionalidade nova. Use antes de escrever qualquer código quando o pedido for vago, ou quando pedirem "me entreviste", "grill", "levanta os requisitos", "o que falta decidir".
---

# Entrevista até o fim

O pedido que você recebeu está incompleto. Sempre está. Seu trabalho aqui **não é
programar** — é descobrir tudo o que o usuário sabe e não escreveu, antes que você
precise adivinhar.

Toda vez que você adivinha, você decide sozinho uma regra de negócio que não é sua.
Ela vai passar no teste que você mesmo escrever e falhar no primeiro contato com o
cliente. Perguntar é mais barato.

## Como conduzir

Trate as decisões como uma árvore: cada resposta abre as decisões que dependiam dela.

Trabalhe em **rodadas**. A **fronteira** é o conjunto de decisões cujos pré-requisitos
já estão resolvidos — o que dá para perguntar **agora**, sem chutar resposta que você
ainda não ouviu. Pergunte a fronteira inteira de uma vez, numerada, e **espere** o
usuário responder antes da próxima rodada.

Uma pergunta que só faz sentido depois de outra pergunta desta mesma rodada pertence à
**rodada seguinte**, não a esta.

Formato de cada rodada:

```
❓ **P1 — <título curto>**: <a pergunta, com as opções quando houver>

➡️ <sua recomendação, uma linha>

---

❓ **P2 — <título curto>**: <...>

➡️ <sua recomendação>
```

Sempre dê a sua recomendação. O usuário pode responder "todas as recomendadas" e a
rodada acaba em dez segundos — mas ele decidiu, e está registrado.

## O que perguntar

Passe por estas famílias antes de declarar a fronteira vazia:

- **Números.** Prazo, limite, quantidade, valor, teto, piso. Todo número que aparecer
  no código sem estar na resposta do usuário é invenção sua.
- **Ordem e precedência.** Quando duas regras recusam a mesma operação, qual erro o
  cliente recebe?
- **Estados e transições.** O que pode acontecer com uma coisa já criada? O que é
  proibido depois?
- **Fronteira do escopo.** O que este recurso **não** faz. Pergunte explicitamente.
- **Contrato de saída.** Nomes de campo, códigos de status, formato de data. Se existe
  cliente consumindo, os nomes não são escolha sua.
- **Como se verifica.** Para cada regra: qual cenário provaria que ela funciona? Regra
  que não dá para verificar não é regra, é desejo — e você precisa dizer isso ao
  usuário durante a entrevista, não depois.

## Fatos são seu problema, decisões são do usuário

Se a resposta está no repositório, **vá ler o repositório**. Não pergunte ao usuário
convenção de código, nome de arquivo, formato que já existe — procure com `grep` e
`read` e traga já resolvido.

Pergunte só o que ele decide e você não teria como saber.

## Quando acaba

Acaba quando a fronteira está vazia: nenhuma decisão restante escondida atrás de um
"acho que". Aí faça um resumo numerado das decisões e **confirme** com o usuário.

Não escreva código nesta skill. Nem teste. A saída é entendimento compartilhado.
