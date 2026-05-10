/**
 * WebSocket Gateway — o coração da arquitetura orientada a eventos
 *
 * FLUXO CORRETO:
 *   RabbitMQ → [este módulo] → WebSocket → App Flutter
 *
 * O Flutter NUNCA fala direto com RabbitMQ.
 * Este módulo faz a ponte: consome eventos do MOM e repassa
 * em tempo real para os apps conectados via WebSocket.
 *
 * Cada cliente WebSocket se identifica ao conectar:
 *   { tipo: 'cliente' | 'lavador', usuario_id: 'uuid' }
 *
 * Assim conseguimos enviar a mensagem só para quem é relevante.
 */

const { WebSocketServer } = require('ws');
const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'lavaja.solicitacoes';

// Mapa de clientes conectados: usuario_id → WebSocket
const clientes = new Map();

let wss = null;

/**
 * Inicializa o servidor WebSocket e o consumer do RabbitMQ.
 * @param {http.Server} httpServer — o mesmo servidor HTTP do Express
 */
async function iniciar(httpServer) {
  // ── 1. Servidor WebSocket (compartilha porta com Express) ──────────
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    let usuario_id = null;
    let tipo = null;

    // App envia identificação ao conectar:
    // { tipo: 'cliente', usuario_id: 'uuid-do-usuario' }
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.tipo && msg.usuario_id) {
          usuario_id = msg.usuario_id;
          tipo = msg.tipo;
          clientes.set(usuario_id, ws);
          console.log(`🔌 WebSocket conectado: ${tipo} [${usuario_id}]`);
          ws.send(JSON.stringify({ evento: 'conectado', mensagem: 'WebSocket ativo' }));
        }
      } catch (_) {}
    });

    ws.on('close', () => {
      if (usuario_id) {
        clientes.delete(usuario_id);
        console.log(`🔌 WebSocket desconectado: ${tipo} [${usuario_id}]`);
      }
    });
  });

  console.log('✅ WebSocket Gateway iniciado');

  // ── 2. Consumer do RabbitMQ ────────────────────────────────────────
  try {
    const conn    = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Fila temporária exclusiva deste processo
    const { queue } = await channel.assertQueue('', { exclusive: true });

    // Escuta TODOS os eventos do exchange
    await channel.bindQueue(queue, EXCHANGE, '#');

    channel.consume(queue, (msg) => {
      if (!msg) return;
      try {
        const evento    = msg.fields.routingKey;
        const payload   = JSON.parse(msg.content.toString());

        console.log(`📥 Evento recebido do RabbitMQ: [${evento}]`, payload.id || '');

        // Decide para quem enviar baseado no tipo de evento
        const pacote = JSON.stringify({ evento, dados: payload });

        if (evento === 'solicitacao.criada') {
          // Nova solicitação → notifica TODOS os lavadores conectados
          enviarParaTipo('lavador', pacote);
        } else {
          // Mudança de status → notifica o cliente específico
          if (payload.cliente_id) enviarParaUsuario(payload.cliente_id, pacote);
          // E o lavador específico (se já foi vinculado)
          if (payload.lavador_id) enviarParaUsuario(payload.lavador_id, pacote);
        }

        channel.ack(msg);
      } catch (err) {
        console.error('Erro ao processar mensagem do RabbitMQ:', err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log('✅ Consumer RabbitMQ → WebSocket Gateway ativo');
  } catch (err) {
    console.warn('⚠️  RabbitMQ indisponível — WebSocket gateway em modo offline:', err.message);
  }
}

/** Envia mensagem para um usuário específico pelo ID */
function enviarParaUsuario(usuario_id, pacote) {
  const ws = clientes.get(usuario_id);
  if (ws && ws.readyState === 1) {
    ws.send(pacote);
    console.log(`📤 WebSocket → usuário [${usuario_id}]`);
  }
}

/** Envia mensagem para todos os clientes de um tipo (ex: todos lavadores) */
function enviarParaTipo(tipo, pacote) {
  let enviados = 0;
  clientes.forEach((ws, uid) => {
    if (ws.readyState === 1) {
      ws.send(pacote);
      enviados++;
    }
  });
  console.log(`📤 WebSocket broadcast → ${enviados} ${tipo}(s) conectado(s)`);
}

module.exports = { iniciar };
