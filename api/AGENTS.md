# API
- Tempo sempre pelo relógio do modo de teste, nunca Date.now() direto.
- Testes em api/test/, um arquivo por módulo.
- POST /encontros/:id/presencas exige somenteParticipante (403 SOMENTE_PARTICIPANTE); implementar antes das fatias 2, 5 e 6 do M3, junto com o primeiro teste que usa essa rota.