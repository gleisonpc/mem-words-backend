import type { RequestHandler } from 'express';

import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from '../lib/refreshTokenCookie.js';
import { UnauthorizedError } from '../errors/AppError.js';

/** POST /auth/register */
export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login
 *
 * O token de renovação nunca entra no corpo da resposta — ele vai só pelo
 * cookie `HttpOnly`, gravado antes do `json()`.
 */
export const login: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken, ...body } = await authService.login(req.body);

    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh
 *
 * O token apresentado vem do cookie, nunca do corpo — e o novo token de
 * renovação sai pelo mesmo cookie, substituindo o anterior.
 */
export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const presented = readRefreshTokenCookie(req);

    if (presented === null) {
      throw new UnauthorizedError('Refresh token ausente.');
    }

    const { refreshToken, ...body } = await authService.refresh(presented);

    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 *
 * Sem cookie, não há o que revogar: responde sucesso do mesmo jeito, sem
 * tocar o banco — a operação continua idempotente e não revela se um token
 * existia. O cookie é limpo nos dois casos.
 */
export const logout: RequestHandler = async (req, res, next) => {
  try {
    const presented = readRefreshTokenCookie(req);

    if (presented !== null) {
      await authService.logout(presented);
    }

    clearRefreshTokenCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
