import { criarApp } from './app.js';

const porta = Number(process.env.PORT) || 3000;
const modoTeste = process.env.MODO_TESTE === '1';

criarApp({ modoTeste }).listen(porta, () => {
  console.log(`API da Semana Acadêmica na porta ${porta}${modoTeste ? ' (modo de teste)' : ''}`);
});
