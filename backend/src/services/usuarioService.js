/**
 * Service — UsuarioService
 * Regras de negócio relacionadas a usuários.
 */
const usuarioRepo = require('../repositories/usuarioRepository');
const { TIPOS } = require('../models/Usuario');

function criar({ nome, email, telefone, tipo }) {
  if (!nome || !email || !tipo) throw { status: 400, erro: 'Campos obrigatórios: nome, email, tipo' };
  if (!TIPOS.includes(tipo)) throw { status: 400, erro: `Tipo deve ser: ${TIPOS.join(' ou ')}` };

  const existente = usuarioRepo.buscarPorEmail(email);
  if (existente) throw { status: 409, erro: 'E-mail já cadastrado' };

  return usuarioRepo.criar({ nome, email, telefone, tipo });
}

function buscarPorId(id) {
  const usuario = usuarioRepo.buscarPorId(id);
  if (!usuario) throw { status: 404, erro: 'Usuário não encontrado' };
  return usuario;
}

function listar({ tipo, nome } = {}) {
  return usuarioRepo.listar({ tipo, nome });
}

module.exports = { criar, buscarPorId, listar };
