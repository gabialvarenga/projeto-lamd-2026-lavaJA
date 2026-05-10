/**
 * Database helper usando sql.js (SQLite puro JS — sem dependências nativas).
 * A interface expõe métodos prepare/get/all/run (sem dependências nativas) (prepare/get/all/run)
 * para que os controllers não precisem ser alterados.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './database.sqlite');
let sqlDb = null;
let initPromise = null;

function save() {
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function buildCompatLayer() {
  return {
    prepare(sql) {
      return {
        run(...params) {
          sqlDb.run(sql, params);
          save();
          return { changes: sqlDb.getRowsModified() };
        },
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          const cols = stmt.getColumnNames();
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const rows = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
      };
    },
    exec(sql) {
      sqlDb.run(sql);
      save();
    },
    pragma() {},
  };
}

let db = null;

async function initDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    sqlDb = new SQL.Database();
  }
  db = buildCompatLayer();
  return db;
}

function getDb() {
  if (!db) throw new Error('Banco não inicializado. Aguarde initDb().');
  return db;
}

module.exports = { initDb, getDb };
