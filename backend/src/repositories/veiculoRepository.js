/**
 * Repository — VeiculoRepository
 * Único responsável por acessar o banco para veículos.
 */
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

function criar({ usuario_id, placa, modelo, cor }) {
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO veiculos (id, usuario_id, placa, modelo, cor) VALUES (?,?,?,?,?)')
    .run(id, usuario_id, placa.toUpperCase(), modelo, cor || null);
  return buscarPorId(id);
}

function buscarPorPlaca(placa) {
  return getDb().prepare('SELECT * FROM veiculos WHERE placa = ?').get(placa.toUpperCase());
}

function buscarPorId(id) {
  return getDb().prepare('SELECT * FROM veiculos WHERE id = ?').get(id);
}

function listarPorUsuario(usuario_id) {
  return getDb().prepare('SELECT * FROM veiculos WHERE usuario_id = ? ORDER BY criado_em DESC').all(usuario_id);
}

module.exports = { criar, buscarPorPlaca, buscarPorId, listarPorUsuario };
