---
name: tdd
description: Implementa uma spec em fatias verticais, teste primeiro — vermelho, verde, próxima fatia. Use quando existir uma spec para implementar, ou quando pedirem "TDD", "teste primeiro", "red-green".
---

# Teste primeiro, uma fatia por vez

O ciclo é: **um teste que falha → o código mínimo que faz ele passar → a próxima fatia.**
Nada de escrever a suíte inteira e depois o código inteiro.

Você precisa de uma spec com regras numeradas. Sem ela, pare: você vai acabar testando o
que você mesmo inventou. Sem contrato, verde não significa nada.

## Onde o teste mora

Teste verifica **comportamento pela interface pública**, nunca implementação. Não importe
serviço nem repositório no teste — se importar, o teste quebra quando você refatorar
sem que o comportamento tenha mudado.

**API** (`api/`): a interface é HTTP, nas rotas do `contrato-api.md`. Suba a API com
`MODO_TESTE=1` e fale por `fetch`. Cada teste começa com `POST /_teste/reset` e controla
o tempo só por `PUT /_teste/relogio` — nunca pelo relógio do sistema.
Padrão: `node --test`, `node:assert/strict`, um arquivo por módulo em `api/test/`
(M1 grade, M2 inscrições, M3 presença). Sem mock da API, sem banco falso: o SQLite é o
de verdade, zerado pelo reset.

**Interface** (`app/`): a interface pública é a tela. Renderize o componente com Testing
Library e interaja como o usuário (texto, papel, rótulo), nunca por estado interno.
A API é sempre a falsa (MSW), respondendo exatamente o formato do `contrato-api.md`;
nenhum teste chama a API real. Rode com `npx vitest run`.

## O ciclo, por fatia

Para cada fatia da spec, nesta ordem:

1. Escreva **um** teste que prova **um** critério de aceite. O nome do teste é a regra
   em português: `it('recusa requisição sem X-Usuario com 401 USUARIO_DESCONHECIDO')`.
2. Rode. **Ele tem que falhar.** Teste que passa antes do código existir não está
   testando nada — descubra por quê antes de seguir.
3. Escreva o mínimo de código que faz ele passar. Nada de já implementar a regra
   seguinte "que eu vou precisar mesmo".
4. Rode a suíte inteira. Verde? Próxima fatia.

Só passe para a fatia seguinte com a suíte inteira verde.

## A regra que não se quebra

**Quando o teste falha, o suspeito é o código.**

Se você mudar um teste para ele passar, você trocou o contrato pela sua implementação e
o verde virou enfeite. Só se altera um teste quando a **spec** mudou — e aí você diz, em
voz alta, qual regra da spec mudou e por quê.

Vale para o valor esperado, para o status HTTP, para o código de `erro` e para o cenário.
Trocar `assert.equal(res.status, 409)` por `assert.equal(res.status, 201)` porque o código
deu 201 é a forma mais comum de mentir sozinho.

## Três testes que não valem nada

- **Acoplado à implementação** — chama serviço ou repositório direto, ou confere o dado
  consultando o SQLite direto em vez de pedir pela API (na interface: inspecionando estado
  do componente em vez do que aparece na tela). Quebra em refatoração, não em regressão.
- **Tautológico** — o esperado é calculado do mesmo jeito que o código calcula
  (`assert.equal(vagas, capacidade - inscritos)`). Passa por construção, nunca discorda do
  código. O valor esperado vem da spec, escrito na mão: `assert.equal(vagas, 2)`.
- **Frouxo** — confere só o status e ignora o corpo. `201` com o campo errado passa; `409`
  com o `erro` errado também.

## Fechamento

Terminada a última fatia, rode a suíte inteira uma vez e relate o número real que
apareceu na saída — de `node --test` na API e de `npx vitest run` na interface. Não estime, não arredonde, não repita um número de outra rodada.
