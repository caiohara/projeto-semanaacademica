import { Router } from 'express';
import { zerarBanco } from '../banco.js';
import { lerInstante } from '../erros.js';
import { INSTANTE_DO_RESET } from '../relogio.js';

// Rotas /_teste/* do contrato, seção 3. Só são montadas com MODO_TESTE=1.
export function rotasDeTeste({ db, relogio }) {
  const rotas = Router();

  rotas.post('/reset', (req, res) => {
    zerarBanco(db);
    relogio.ajustar(INSTANTE_DO_RESET);
    res.status(204).end();
  });

  rotas.get('/relogio', (req, res) => {
    res.json({ agora: relogio.agora().toISOString() });
  });

  rotas.put('/relogio', (req, res) => {
    relogio.ajustar(lerInstante(req.body?.agora, 'agora'));
    res.json({ agora: relogio.agora().toISOString() });
  });

  return rotas;
}
