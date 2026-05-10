const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', projeto: 'LavaJÁ', versao: '1.0.0' }));

// Rotas
app.use('/api', routes);

// Handler 404
app.use((req, res) => res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.path}` }));

// Handler erros globais
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor', detalhe: err.message });
});

module.exports = app;
