import type { ErrorRequestHandler, RequestHandler } from 'express';

import env from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/** Rota não encontrada. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' } satisfies ErrorResponse);
};

/** Tratamento centralizado de erros. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined && { details: err.details }),
    } satisfies ErrorResponse);
    return;
  }

  // JSON malformado no corpo da requisição.
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON inválido.', code: 'BAD_REQUEST' } satisfies ErrorResponse);
    return;
  }

  if (env.nodeEnv !== 'test') {
    console.error(err);
  }

  // Erro inesperado: a mensagem original não vai para o cliente, para não
  // vazar detalhes internos (query, caminho de arquivo, stack).
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  } satisfies ErrorResponse);
};
