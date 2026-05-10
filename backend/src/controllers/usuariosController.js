const usuarioService = require('../services/usuarioService');

function criar(req, res) {
  try {
    const usuario = usuarioService.criar(req.body);
    return res.status(201).json(usuario);
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function buscarPorId(req, res) {
  try {
    return res.json(usuarioService.buscarPorId(req.params.id));
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

function listar(req, res) {
  try {
    const dados = usuarioService.listar({ tipo: req.query.tipo, nome: req.query.nome });
    return res.json({ total: dados.length, dados });
  } catch (e) { return res.status(e.status || 500).json({ erro: e.erro || e.message }); }
}

module.exports = { criar, buscarPorId, listar };
