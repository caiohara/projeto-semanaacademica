import { Router } from 'express';
import { ErroDaApi } from '../../erros.js';

// M3 — Presença por QR (specs/M3-presenca.md).

const MINUTO_MS = 60 * 1000;

// R2: de inicio − 15 min até fim + 30 min, os dois limites inclusivos.
const dentroDaJanela = (encontro, agoraMs) =>
  agoraMs >= encontro.inicio_ms - 15 * MINUTO_MS && agoraMs <= encontro.fim_ms + 30 * MINUTO_MS;

export function rotasDaPresenca({ db, relogio }) {
  const rotas = Router();

  rotas.get('/encontros/:id/codigo', (req, res) => {
    const encontro = db.prepare('SELECT id, inicio_ms, fim_ms FROM encontros WHERE id = ?').get(req.params.id);
    // R3
    if (!dentroDaJanela(encontro, relogio.agora().getTime())) {
      throw new ErroDaApi(422, 'FORA_DA_JANELA', 'fora da janela de presença do encontro');
    }
    res.json({ encontroId: encontro.id });
  });

  return rotas;
}
