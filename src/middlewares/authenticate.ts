import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../lib/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware `authenticate`. */
      user?: { id: string; email: string };
    }
  }
}

/** Exige um access token válido no header `Authorization: Bearer <token>`. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');

  if (header === undefined || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Token de acesso ausente.'));
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Garante que o usuário autenticado é o dono do recurso em `:id`.
 *
 * Sem isso qualquer usuário logado poderia editar ou excluir a conta de
 * outro apenas trocando o id da URL.
 */
export const ensureSelf: RequestHandler = (req, _res, next) => {
  if (req.user === undefined) {
    next(new UnauthorizedError('Token de acesso ausente.'));
    return;
  }

  if (req.params['id'] !== req.user.id) {
    next(new ForbiddenError('Você só pode alterar a própria conta.'));
    return;
  }

  next();
};
