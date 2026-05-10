/**
 * Middleware de regras de papel (role-based rules) — LavaJÁ
 *
 * Valida regras de negócio específicas por papel:
 * - Um cliente só pode ver/cancelar as próprias solicitações
 * - Um lavador só pode aceitar/atualizar solicitações atribuídas a ele
 */

const solicitacaoRepository = require('../repositories/solicitacaoRepository');

/**
 * Garante que o cliente autenticado só acessa suas próprias solicitações.
 */
function donoSolicitacao(req, res, next) {
  const { id } = req.params;
  const usuario = req.usuario;

  const solicitacao = solicitacaoRepository.buscarPorId(id);
  if (!solicitacao) {
    return res.status(404).json({ erro: 'Solicitação não encontrada' });
  }

  // Cliente só acessa a própria solicitação
  if (usuario.tipo === 'cliente' && solicitacao.cliente_id !== usuario.id) {
    return res.status(403).json({
      erro: 'Acesso negado. Você não é o dono desta solicitação.'
    });
  }

  // Lavador só acessa solicitações pendentes (para aceitar) ou as suas
  if (usuario.tipo === 'lavador') {
    const ehPendente = solicitacao.status === 'pendente';
    const ehSeuServico = solicitacao.lavador_id === usuario.id;
    if (!ehPendente && !ehSeuServico) {
      return res.status(403).json({
        erro: 'Acesso negado. Esta solicitação não está disponível para você.'
      });
    }
  }

  req.solicitacao = solicitacao; // já disponível no controller
  next();
}

module.exports = { donoSolicitacao };
