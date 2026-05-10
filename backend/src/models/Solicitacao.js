/**
 * Model — Solicitacao
 * Define a estrutura e os estados válidos de uma solicitação de lavagem.
 */

const STATUS = {
  PENDENTE:     'pendente',
  ACEITA:       'aceita',
  RECUSADA:     'recusada',
  EM_EXECUCAO:  'em_execucao',
  CONCLUIDA:    'concluida',
  CANCELADA:    'cancelada',
};

const TIPOS_SERVICO = ['simples', 'completa', 'polimento'];

const TRANSICOES = {
  pendente:    ['aceita', 'recusada', 'cancelada'],
  aceita:      ['em_execucao', 'cancelada'],
  em_execucao: ['concluida'],
  recusada:    [],
  concluida:   [],
  cancelada:   [],
};

function transicaoValida(statusAtual, statusNovo) {
  return (TRANSICOES[statusAtual] || []).includes(statusNovo);
}

module.exports = { STATUS, TIPOS_SERVICO, TRANSICOES, transicaoValida };
