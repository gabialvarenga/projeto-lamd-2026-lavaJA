const { initDb } = require('./database');

async function migrate() {
  const db = await initDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('cliente','lavador')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS veiculos (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id),
      placa TEXT NOT NULL UNIQUE,
      modelo TEXT NOT NULL,
      cor TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES usuarios(id),
      lavador_id TEXT REFERENCES usuarios(id),
      veiculo_id TEXT NOT NULL REFERENCES veiculos(id),
      endereco TEXT NOT NULL,
      tipo_servico TEXT NOT NULL CHECK(tipo_servico IN ('simples','completa','polimento')),
      status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','aceita','recusada','em_execucao','concluida','cancelada')),
      observacoes TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS historico_status (
      id TEXT PRIMARY KEY,
      solicitacao_id TEXT NOT NULL REFERENCES solicitacoes(id),
      status_anterior TEXT,
      status_novo TEXT NOT NULL,
      alterado_por TEXT NOT NULL REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ Migrations executadas com sucesso!');
  return db;
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { migrate };
