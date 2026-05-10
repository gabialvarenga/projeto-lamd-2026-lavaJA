/**
 * Repository — UsuarioRepository
 * Único responsável por acessar o banco para usuários.
 */
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

function criar({ nome, email, telefone, tipo }) {
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO usuarios (id, nome, email, telefone, tipo) VALUES (?,?,?,?,?)')
    .run(id, nome, email, telefone || null, tipo);
  return buscarPorId(id);
}

function buscarPorEmail(email) {
  return getDb().prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
}

function buscarPorId(id) {
  return getDb().prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
}

function listar({ tipo, nome } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (tipo) { conditions.push('tipo = ?');             params.push(tipo); }
  if (nome) { conditions.push('LOWER(nome) LIKE ?');   params.push(`%${nome.toLowerCase()}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM usuarios ${where} ORDER BY criado_em DESC`).all(...params);
}

module.exports = { criar, buscarPorEmail, buscarPorId, listar };
