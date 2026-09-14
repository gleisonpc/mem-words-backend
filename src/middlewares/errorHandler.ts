import type { ErrorRequestHandler, RequestHandler } from 'express';

import env from '../config/env.js';

/** Erro de aplicação com status HTTP associado. */
export interface HttpError extends Error {
  status?: number;
}

export interface ErrorResponse {
  error: string;
}

/** Rota não encontrada. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not Found' } satisfies ErrorResponse);
};

/** Tratamento centralizado de erros. */
export const errorHandler: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const status = err.status ?? 500;

  if (env.nodeEnv !== 'test') {
    console.error(err);
  }

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  } satisfies ErrorResponse);
};
