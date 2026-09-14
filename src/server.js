'use strict';

const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.port, () => {
  console.log(`Servidor rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});

module.exports = server;
