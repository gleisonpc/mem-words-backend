import type { Request, Response } from 'express';

import type { HealthResponse } from '../types/health.js';

/**
 * GET /health
 * Health-check simples usado por monitoramento e plataformas de deploy.
 */
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.status(200).json({ status: 'ok' });
}
