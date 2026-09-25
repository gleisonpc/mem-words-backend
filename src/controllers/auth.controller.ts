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
 * POST /auth/google
 *
 * Mesmo formato de resposta e mesmo cookie de renovação de `login` — só a
 * verificação de credenciais muda (ID token do Google em vez de senha).
 */
export const googleLogin: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken, ...body } = await authService.loginWithGoogle(req.body.idToken);

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

/**
 * POST /auth/mobile/login
 *
 * Mesma verificação de credenciais de `login`, mas o refresh token viaja no
 * corpo da resposta — um cliente nativo o guarda em Keychain/Keystore, não
 * em cookie. Sem `Set-Cookie` nenhum.
 */
export const mobileLogin: RequestHandler = async (req, res, next) => {
  try {
    const tokens = await authService.login(req.body);

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/mobile/refresh
 *
 * O token apresentado vem do corpo (`refreshToken`), nunca de cookie — e o
 * novo token de renovação também sai pelo corpo da resposta.
 */
export const mobileRefresh: RequestHandler = async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/mobile/logout
 *
 * Sem `refreshToken` no corpo, não há o que revogar: responde sucesso do
 * mesmo jeito, sem tocar o banco — mesma idempotência de `logout`.
 */
export const mobileLogout: RequestHandler = async (req, res, next) => {
  try {
    const presented: string | undefined = req.body.refreshToken;

    if (presented !== undefined) {
      await authService.logout(presented);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
