/**
 * Service — VeiculoService
 * Regras de negócio relacionadas a veículos.
 */
const veiculoRepo  = require('../repositories/veiculoRepository');
const usuarioRepo  = require('../repositories/usuarioRepository');

function criar({ usuario_id, placa, modelo, cor }) {
  if (!usuario_id || !placa || !modelo) throw { status: 400, erro: 'Campos obrigatórios: usuario_id, placa, modelo' };

  const usuario = usuarioRepo.buscarPorId(usuario_id);
  if (!usuario) throw { status: 404, erro: 'Usuário não encontrado' };
  if (usuario.tipo !== 'cliente') throw { status: 403, erro: 'Apenas clientes podem cadastrar veículos' };

  const existente = veiculoRepo.buscarPorPlaca(placa);
  if (existente) throw { status: 409, erro: 'Placa já cadastrada' };

  return veiculoRepo.criar({ usuario_id, placa, modelo, cor });
}

function buscarPorId(id) {
  const veiculo = veiculoRepo.buscarPorId(id);
  if (!veiculo) throw { status: 404, erro: 'Veículo não encontrado' };
  return veiculo;
}

function listarPorUsuario(usuario_id) {
  if (!usuario_id) throw { status: 400, erro: 'Parâmetro usuario_id é obrigatório' };
  return veiculoRepo.listarPorUsuario(usuario_id);
}

module.exports = { criar, buscarPorId, listarPorUsuario };
