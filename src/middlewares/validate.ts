import type { RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

import { BadRequestError } from '../errors/AppError.js';

/**
 * Valida body/params/query contra um schema Zod e substitui os valores
 * originais pelos já normalizados (e-mail em minúsculas, nome sem espaços
 * nas pontas), para que os controllers recebam dados prontos.
 */
export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const error: ZodError = result.error;

      next(
        new BadRequestError(
          'Dados inválidos.',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }

    const parsed = result.data as {
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, unknown>;
    };

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }

    // req.params e req.query são somente-leitura no Express 5; copiamos
    // campo a campo em vez de reatribuir.
    if (parsed.params !== undefined) {
      Object.assign(req.params, parsed.params);
    }

    // req.query é um getter que reparseia a query string a cada leitura
    // (não guarda o valor) — Object.assign nele mutaria um objeto descartado
    // na hora. Precisamos substituir a própria propriedade.
    if (parsed.query !== undefined) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    next();
  };
}
