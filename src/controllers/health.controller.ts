import type { Request, RequestHandler, Response } from 'express';

import prisma from '../lib/prisma.js';
import env from '../config/env.js';
import type { HealthResponse, ReadinessResponse } from '../types/health.js';

/**
 * GET /health — sinal de vida.
 *
 * Não consulta o banco de propósito: responde se o processo está no ar.
 */
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.status(200).json({ status: 'ok' });
}

/**
 * GET /health/ready — sinal de prontidão.
 *
 * Verifica a conexão com o banco. É este o endpoint que a plataforma de
 * deploy consulta: sem ele, um deploy com DATABASE_URL errada sobe, passa no
 * health check e só falha quando alguém tenta usar uma rota real.
 */
export const getReadiness: RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({ status: 'ready', database: 'up' } satisfies ReadinessResponse);
  } catch (error) {
    // Registrado no servidor, mas nunca devolvido: a mensagem do driver
    // carrega host e usuário do banco.
    if (env.nodeEnv !== 'test') {
      console.error('Verificação de prontidão falhou:', error);
    }

    res.status(503).json({ status: 'unavailable', database: 'down' } satisfies ReadinessResponse);
  }
};
