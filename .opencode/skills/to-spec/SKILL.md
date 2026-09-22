---
name: to-spec
description: Transforma a conversa atual em um arquivo de spec verificável, com regras numeradas e critérios de aceite. Use depois da entrevista, quando pedirem "vira isso em spec", "escreve a spec", "documenta as decisões".
---

# A conversa vira contrato

Você já tem tudo o que precisa: está na conversa. **Não entreviste de novo.** Sua
tarefa é escrever, num arquivo, o que já foi decidido — e nada além.

Regra que ninguém decidiu **não entra**. Se faltar alguma coisa para a spec ficar de pé,
pare e pergunte só aquilo. Não preencha buraco com "geralmente é assim".

## Onde escrever

`spec-<recurso>.md`, na raiz do projeto. Um arquivo por recurso.

## Antes de escrever

Leia o repositório: convenções, vocabulário, nomes que já existem. A spec fala a língua
do projeto — se o código chama de `leitor`, a spec não inventa `usuário`.

Decida também **onde isto vai ser verificado**. Prefira a costura mais externa que já
existir (aqui: HTTP, pelo `criarServidor()`). Quanto menos pontos de teste novos, melhor.

## Modelo

```markdown
# Spec — <recurso>

## 1. Objetivo
Um parágrafo: que problema isto resolve, na visão de quem usa.

## 2. Fora de escopo
Lista do que este recurso NÃO faz. Isto é tão contrato quanto o resto — é aqui que
se recusa código que ninguém pediu.

## 3. Modelo
Os campos da entidade, com tipo e origem (informado pelo cliente / calculado / derivado).
Campo derivado nunca é guardado.

## 4. Endpoints
Método, caminho, corpo esperado, status de sucesso.

## 5. Regras
Numeradas: R1, R2, R3… Uma regra por linha de decisão, cada uma com o número, o limite
ou o valor exato que foi decidido, e o status HTTP de recusa quando houver.

Toda regra precisa ser observável de fora. "O sistema deve ser rápido" não é regra.
"Devolver depois da data prevista cobra 1,50 por dia inteiro de atraso, teto de 30" é.

Quando duas regras podem recusar a mesma operação, diga qual vale primeiro.

## 6. Critérios de aceite
Lista numerada de cenários concretos, cada um apontando a regra que ele prova:

1. (R1, R3) POST /x com dados válidos → 201, campo `y` igual a Z.

Regra sem pelo menos um critério é regra sem prova. Volte e escreva o critério.

## 7. Como isto será verificado
A costura (interface) usada nos testes e por quê.

## 8. Fatias de entrega
A ordem de implementação, em fatias verticais. Cada fatia é um conjunto pequeno de
regras que já dá para rodar e verificar sozinho.
```

## Depois de escrever

Mostre ao usuário a lista das regras numeradas — só os números e uma linha cada — e
pergunte se falta alguma. É a última chance de corrigir barato.
