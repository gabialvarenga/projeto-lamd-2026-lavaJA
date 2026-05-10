/**
 * Service — SolicitacaoService
 * Regras de negócio, publica eventos no RabbitMQ.
 * O backend é o ÚNICO que fala com o RabbitMQ —
 * os apps Flutter recebem atualizações via WebSocket.
 */
const solicitacaoRepo = require('../repositories/solicitacaoRepository');
const usuarioRepo     = require('../repositories/usuarioRepository');
const veiculoRepo     = require('../repositories/veiculoRepository');
const { publish, ROUTING_KEYS } = require('../config/rabbitmq');
const { TIPOS_SERVICO, transicaoValida } = require('../models/Solicitacao');

async function criar({ cliente_id, veiculo_id, endereco, tipo_servico, observacoes }) {
  if (!cliente_id || !veiculo_id || !endereco || !tipo_servico)
    throw { status: 400, erro: 'Campos obrigatórios: cliente_id, veiculo_id, endereco, tipo_servico' };

  if (!TIPOS_SERVICO.includes(tipo_servico))
    throw { status: 400, erro: `tipo_servico deve ser: ${TIPOS_SERVICO.join(', ')}` };

  const cliente = usuarioRepo.buscarPorId(cliente_id);
  if (!cliente) throw { status: 404, erro: 'Cliente não encontrado' };
  if (cliente.tipo !== 'cliente') throw { status: 403, erro: 'Apenas clientes podem criar solicitações' };

  const veiculo = veiculoRepo.buscarPorId(veiculo_id);
  if (!veiculo) throw { status: 404, erro: 'Veículo não encontrado' };
  if (veiculo.usuario_id !== cliente_id) throw { status: 403, erro: 'Veículo não pertence ao cliente' };

  const solicitacao = solicitacaoRepo.criar({ cliente_id, veiculo_id, endereco, tipo_servico, observacoes });

  // Publica evento no RabbitMQ → backend vai repassar via WebSocket aos apps
  await publish(ROUTING_KEYS.CRIADA, {
    id: solicitacao.id,
    cliente_id,
    cliente_nome: solicitacao.cliente_nome,
    veiculo: { placa: solicitacao.placa, modelo: solicitacao.modelo },
    endereco,
    tipo_servico,
    status: 'pendente',
  });

  return solicitacao;
}

function listar(filtros) {
  return solicitacaoRepo.listar(filtros);
}

function buscarPorId(id) {
  const solicitacao = solicitacaoRepo.buscarPorId(id);
  if (!solicitacao) throw { status: 404, erro: 'Solicitação não encontrada' };
  const historico = solicitacaoRepo.buscarHistorico(id);
  return { ...solicitacao, historico };
}

async function atualizarStatus(id, { status, lavador_id }, usuario) {
  if (!status) throw { status: 400, erro: 'Campo obrigatório: status' };

  const solicitacao = solicitacaoRepo.buscarPorId(id);
  if (!solicitacao) throw { status: 404, erro: 'Solicitação não encontrada' };

  if (!transicaoValida(solicitacao.status, status))
    throw {
      status: 422,
      erro: `Transição inválida: ${solicitacao.status} → ${status}`,
    };

  if (status === 'cancelada' && usuario.tipo !== 'cliente')
    throw { status: 403, erro: 'Apenas o cliente pode cancelar uma solicitação' };

  if (status === 'aceita') {
    if (!lavador_id) throw { status: 400, erro: 'lavador_id é obrigatório ao aceitar' };
    const lavador = usuarioRepo.buscarPorId(lavador_id);
    if (!lavador) throw { status: 404, erro: 'Lavador não encontrado' };
    if (lavador.tipo !== 'lavador') throw { status: 403, erro: 'Usuário não é lavador' };
  }

  const alterado_por = usuario.id;
  const atualizada = solicitacaoRepo.atualizarStatus(id, status, lavador_id, alterado_por);

  // Mapa de routing keys por status
  const rkMap = {
    aceita:      ROUTING_KEYS.ACEITA,
    recusada:    ROUTING_KEYS.RECUSADA,
    em_execucao: ROUTING_KEYS.EM_EXECUCAO,
    concluida:   ROUTING_KEYS.CONCLUIDA,
    cancelada:   ROUTING_KEYS.CANCELADA,
  };

  // Publica evento → backend repassa via WebSocket ao cliente e/ou lavador
  await publish(rkMap[status] || ROUTING_KEYS.STATUS_ATUALIZADO, {
    id: atualizada.id,
    cliente_id: atualizada.cliente_id,
    lavador_id:  atualizada.lavador_id,
    status_anterior: solicitacao.status,
    status_novo: status,
  });

  return atualizada;
}

function buscarHistorico(id) {
  const existe = solicitacaoRepo.buscarPorId(id);
  if (!existe) throw { status: 404, erro: 'Solicitação não encontrada' };
  return solicitacaoRepo.buscarHistorico(id);
}

module.exports = { criar, listar, buscarPorId, atualizarStatus, buscarHistorico };
