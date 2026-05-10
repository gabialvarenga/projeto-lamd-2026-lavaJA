/**
 * Repository — SolicitacaoRepository
 * Único responsável por acessar o banco para solicitações.
 */
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

function criar({ cliente_id, veiculo_id, endereco, tipo_servico, observacoes }) {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO solicitacoes (id, cliente_id, veiculo_id, endereco, tipo_servico, observacoes)
    VALUES (?,?,?,?,?,?)
  `).run(id, cliente_id, veiculo_id, endereco, tipo_servico, observacoes || null);
  registrarHistorico(id, null, 'pendente', cliente_id);
  return buscarPorId(id);
}

function buscarPorId(id) {
  return getDb().prepare(`
    SELECT s.*, u.nome AS cliente_nome, v.placa, v.modelo
    FROM solicitacoes s
    JOIN usuarios u ON s.cliente_id = u.id
    JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.id = ?
  `).get(id);
}

function listar({ status, cliente_id, lavador_id } = {}) {
  const db = getDb();
  let query = `
    SELECT s.*, u.nome AS cliente_nome, v.placa, v.modelo
    FROM solicitacoes s
    JOIN usuarios u ON s.cliente_id = u.id
    JOIN veiculos v ON s.veiculo_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (status)     { query += ' AND s.status = ?';     params.push(status); }
  if (cliente_id) { query += ' AND s.cliente_id = ?'; params.push(cliente_id); }
  if (lavador_id) { query += ' AND s.lavador_id = ?'; params.push(lavador_id); }
  query += ' ORDER BY s.criado_em DESC';
  return db.prepare(query).all(...params);
}

function atualizarStatus(id, status, lavador_id, alterado_por) {
  const db = getDb();
  db.prepare(`
    UPDATE solicitacoes
    SET status = ?, lavador_id = COALESCE(?, lavador_id), atualizado_em = datetime('now')
    WHERE id = ?
  `).run(status, lavador_id || null, id);
  registrarHistorico(id, null, status, alterado_por);
  return buscarPorId(id);
}

function registrarHistorico(solicitacao_id, status_anterior, status_novo, alterado_por) {
  getDb().prepare(`
    INSERT INTO historico_status (id, solicitacao_id, status_anterior, status_novo, alterado_por)
    VALUES (?,?,?,?,?)
  `).run(uuidv4(), solicitacao_id, status_anterior, status_novo, alterado_por);
}

function buscarHistorico(solicitacao_id) {
  return getDb().prepare(`
    SELECT h.*, u.nome AS alterado_por_nome
    FROM historico_status h
    JOIN usuarios u ON h.alterado_por = u.id
    WHERE h.solicitacao_id = ?
    ORDER BY h.criado_em ASC
  `).all(solicitacao_id);
}

module.exports = { criar, buscarPorId, listar, atualizarStatus, buscarHistorico };
