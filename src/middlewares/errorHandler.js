'use strict';

const env = require('../config/env');

/** Rota não encontrada. */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

/** Tratamento centralizado de erros. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (env.nodeEnv !== 'test') {
    console.error(err);
  }

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  });
}

module.exports = { notFoundHandler, errorHandler };
