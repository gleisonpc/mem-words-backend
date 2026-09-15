import type { Server } from 'node:http';

import app from './app.js';
import env from './config/env.js';

/**
 * Escuta em 0.0.0.0 para que a aplicação seja alcançável de fora do
 * container — exigência de plataformas como o Render, onde o bind apenas
 * em localhost faz o health check falhar.
 */
const server: Server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${env.port} (${env.nodeEnv})`);
});

/**
 * Encerramento gracioso: o Render envia SIGTERM a cada deploy. Sem tratar o
 * sinal o processo é morto à força após o timeout, derrubando requisições
 * em andamento.
 */
function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} recebido, encerrando o servidor...`);

  server.close((err) => {
    if (err) {
      console.error('Erro ao encerrar o servidor:', err);
      process.exit(1);
    }

    console.log('Servidor encerrado.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
