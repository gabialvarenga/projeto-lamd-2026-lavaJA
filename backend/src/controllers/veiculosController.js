const veiculoService = require('../services/veiculoService');

function criar(req, res) {
  try {
    return res.status(201).json(veiculoService.criar(req.body));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function buscarPorId(req, res) {
  try {
    return res.json(veiculoService.buscarPorId(req.params.id));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function listar(req, res) {
  try {
    const dados = veiculoService.listarPorUsuario(req.query.usuario_id);
    return res.json({ total: dados.length, dados });
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

module.exports = { criar, buscarPorId, listar };
