/**
 * Middleware de autenticação simplificada — LavaJÁ
 *
 * Como funciona:
 * O app Flutter envia no header de cada requisição:
 *   x-usuario-id: <uuid do usuário logado>
 *
 * O middleware busca o usuário no banco e injeta em req.usuario.
 * Assim qualquer rota sabe quem está fazendo a requisição.
 *
 * IMPORTANTE: Isso é autenticação simplificada para fins acadêmicos.
 * Em produção real usaria JWT (JSON Web Token).
 */

const usuarioRepository = require('../repositories/usuarioRepository');

/**
 * Valida se o header x-usuario-id existe e pertence a um usuário real.
 * Injeta req.usuario com os dados do usuário.
 */
function autenticar(req, res, next) {
  const usuario_id = req.headers['x-usuario-id'];

  if (!usuario_id) {
    return res.status(401).json({
      erro: 'Não autenticado. Envie o header: x-usuario-id'
    });
  }

  const usuario = usuarioRepository.buscarPorId(usuario_id);

  if (!usuario) {
    return res.status(401).json({
      erro: 'Usuário não encontrado. Header x-usuario-id inválido.'
    });
  }

  req.usuario = usuario; // disponível em todo o controller/service
  next();
}

/**
 * Garante que apenas CLIENTES acessem a rota.
 * Deve ser usado APÓS o middleware autenticar().
 */
function apenasCliente(req, res, next) {
  if (req.usuario.tipo !== 'cliente') {
    return res.status(403).json({
      erro: 'Acesso negado. Esta rota é exclusiva para clientes.'
    });
  }
  next();
}

/**
 * Garante que apenas LAVADORES acessem a rota.
 * Deve ser usado APÓS o middleware autenticar().
 */
function apenasLavador(req, res, next) {
  if (req.usuario.tipo !== 'lavador') {
    return res.status(403).json({
      erro: 'Acesso negado. Esta rota é exclusiva para lavadores.'
    });
  }
  next();
}

/**
 * Cliente só acessa o próprio perfil; lavador acessa qualquer um.
 * Deve ser usado APÓS autenticar().
 */
function apenasProprioOuLavador(req, res, next) {
  if (req.usuario.tipo === 'lavador') return next();
  if (req.params.id !== req.usuario.id) {
    return res.status(403).json({
      erro: 'Acesso negado. Você só pode acessar seu próprio perfil.'
    });
  }
  next();
}

module.exports = { autenticar, apenasCliente, apenasLavador, apenasProprioOuLavador };
