import express from 'express';
import { identificar } from './autenticacao.js';
import { abrirBanco } from './banco.js';
import { rotaInexistente, tratarErros } from './erros.js';
import { rotasDaGrade } from './modulos/m1-grade/rotas.js';
import { rotasDaPresenca } from './modulos/m3-presenca/rotas.js';
import { criarRelogio } from './relogio.js';
import { rotasDeTeste } from './teste/rotas.js';

export function criarApp({ modoTeste }) {
  const db = abrirBanco();
  const relogio = criarRelogio({ modoTeste });
  const app = express();
  app.use(express.json());
  if (modoTeste) app.use('/_teste', rotasDeTeste({ db, relogio }));
  app.use(identificar({ db }));
  app.use(rotasDaGrade({ db, relogio }));
  app.use(rotasDaPresenca({ db, relogio }));
  app.use(rotaInexistente);
  app.use(tratarErros);
  return app;
}
