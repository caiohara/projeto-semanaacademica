# Semana Acadêmica

## Stack
- API: Node 22.13+, Express, banco node:sqlite (arquivo), testes com node --test. Pasta api/.
- Interface: web, Vite + React, testes com Vitest + Testing Library + MSW (API falsa). Pasta app/.

## Regras do repositório
- contrato-api.md é restrição do cliente: nome de campo, rota e código de erro não mudam.
- Regra de negócio só existe se estiver em specs/; spec só existe a partir de entrevistas/.
- Nunca editar um teste existente para ele passar.
- Comandos do projeto.json precisam rodar no Linux: nada de sintaxe de shell do Windows.
- Um módulo por pasta: api/src/modulos/m1-grade, m2-inscricoes, m3-presenca.