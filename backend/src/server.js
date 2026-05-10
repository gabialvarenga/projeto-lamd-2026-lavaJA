require('dotenv').config();
const http = require('http');
const { migrate } = require('./config/migrate');
const { connect } = require('./config/rabbitmq');
const wsGateway = require('./config/websocket');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
  await migrate();
  await connect();

  // Cria servidor HTTP compartilhado entre Express e WebSocket
  const httpServer = http.createServer(app);

  // Inicia WebSocket Gateway (consome RabbitMQ e repassa aos apps)
  await wsGateway.iniciar(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚗💦 LavaJÁ Backend rodando em http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponível em  ws://localhost:${PORT}`);
    console.log(`📋 Endpoints REST em        http://localhost:${PORT}/api`);
  });
}

start().catch(e => { console.error(e); process.exit(1); });
