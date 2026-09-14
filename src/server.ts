import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`Servidor rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});

export default server;
