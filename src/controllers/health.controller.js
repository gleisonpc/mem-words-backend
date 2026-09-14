'use strict';

/**
 * GET /health
 * Health-check simples usado por monitoramento e plataformas de deploy.
 */
function getHealth(req, res) {
  res.status(200).json({ status: 'ok' });
}

module.exports = { getHealth };
