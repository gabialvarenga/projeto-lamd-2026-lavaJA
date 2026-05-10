const solicitacaoService = require('../services/solicitacaoService');

async function criar(req, res) {
  try {
    return res.status(201).json(await solicitacaoService.criar(req.body));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function listar(req, res) {
  try {
    const filtros = { ...req.query };
    // cliente só enxerga as próprias solicitações
    if (req.usuario.tipo === 'cliente') filtros.cliente_id = req.usuario.id;
    const dados = solicitacaoService.listar(filtros);
    return res.json({ total: dados.length, dados });
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function buscarPorId(req, res) {
  try {
    return res.json(solicitacaoService.buscarPorId(req.params.id));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

async function atualizarStatus(req, res) {
  try {
    return res.json(await solicitacaoService.atualizarStatus(req.params.id, req.body, req.usuario));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function historico(req, res) {
  try {
    const dados = solicitacaoService.buscarHistorico(req.params.id);
    return res.json({ total: dados.length, dados });
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

module.exports = { criar, listar, buscarPorId, atualizarStatus, historico };
