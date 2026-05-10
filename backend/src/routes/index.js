const express = require('express');
const router  = express.Router();

const usuarios     = require('../controllers/usuariosController');
const veiculos     = require('../controllers/veiculosController');
const solicitacoes = require('../controllers/solicitacoesController');

const { autenticar, apenasCliente, apenasLavador, apenasProprioOuLavador } = require('../middlewares/auth');
const { donoSolicitacao } = require('../middlewares/roleGuard');

// ── Usuários ──────────────────────────────────────────────────────────────────
router.post ('/usuarios',     usuarios.criar);
router.get  ('/usuarios',     autenticar, apenasLavador, usuarios.listar);
router.get  ('/usuarios/:id', autenticar, apenasProprioOuLavador, usuarios.buscarPorId);

// ── Veículos (só cliente) ─────────────────────────────────────────────────────
router.post ('/veiculos',     autenticar, apenasCliente, veiculos.criar);
router.get  ('/veiculos',     autenticar, apenasCliente, veiculos.listar);
router.get  ('/veiculos/:id', autenticar, veiculos.buscarPorId);

// ── Solicitações ──────────────────────────────────────────────────────────────
router.post ('/solicitacoes',               autenticar, apenasCliente,    solicitacoes.criar);
router.get  ('/solicitacoes',               autenticar,                   solicitacoes.listar);
router.get  ('/solicitacoes/:id',           autenticar, donoSolicitacao,  solicitacoes.buscarPorId);
router.patch('/solicitacoes/:id/status',    autenticar, donoSolicitacao,  solicitacoes.atualizarStatus);
router.get  ('/solicitacoes/:id/historico', autenticar, donoSolicitacao,  solicitacoes.historico);

module.exports = router;
