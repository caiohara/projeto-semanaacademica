import { ErroDaApi } from './erros.js';

// Identificação do contrato, seção 1: toda rota exige X-Usuario, menos /_teste/*.
// Os usuários válidos são os dos dados iniciais (seção 4), gravados na tabela usuarios.
export function identificar({ db }) {
  const buscar = db.prepare('SELECT id, nome, papel FROM usuarios WHERE id = ?');
  return (req, res, next) => {
    // Sem MODO_TESTE, /_teste/* não está montado e cai no 404 (seção 3), não no 401.
    if (req.path.startsWith('/_teste/')) return next();
    const id = req.get('X-Usuario');
    const usuario = id ? buscar.get(id) : undefined;
    if (!usuario) {
      return next(new ErroDaApi(401, 'USUARIO_DESCONHECIDO', 'X-Usuario ausente ou desconhecido'));
    }
    req.usuario = usuario;
    next();
  };
}

// Rotas "Quem: organização" do contrato, seção 5. Roda depois de identificar e antes do corpo.
export function somenteOrganizacao(req, res, next) {
  if (req.usuario.papel !== 'organizacao') {
    return next(new ErroDaApi(403, 'SOMENTE_ORGANIZACAO', 'rota exclusiva da organização'));
  }
  next();
}

// Rotas "Quem: participante" do contrato, seção 5. Roda depois de identificar e antes do corpo.
export function somenteParticipante(req, res, next) {
  if (req.usuario.papel !== 'participante') {
    return next(new ErroDaApi(403, 'SOMENTE_PARTICIPANTE', 'rota exclusiva de participante'));
  }
  next();
}
