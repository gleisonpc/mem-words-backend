import { createHash, randomBytes } from 'node:crypto';

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import env from '../config/env.js';
import { UnauthorizedError } from '../errors/AppError.js';

export interface AccessTokenPayload {
  /** Id do usuário (subject). */
  sub: string;
  email: string;
}

/**
 * Emite o access token — JWT curto, enviado no header Authorization e
 * validado apenas pela assinatura, sem consultar o banco.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  // NonNullable: com exactOptionalPropertyTypes, expiresIn não aceita
  // undefined — e env.jwtAccessExpiresIn sempre tem valor (há default).
  const options: SignOptions = {
    expiresIn: env.jwtAccessExpiresIn as NonNullable<SignOptions['expiresIn']>,
  };

  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as JwtPayload;

    if (typeof decoded.sub !== 'string' || typeof decoded['email'] !== 'string') {
      throw new UnauthorizedError('Token inválido.');
    }

    return { sub: decoded.sub, email: decoded['email'] };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expirado.');
    }

    throw new UnauthorizedError('Token inválido.');
  }
}

/**
 * Gera o refresh token.
 *
 * É um valor aleatório opaco, não um JWT: como ele é persistido e precisa
 * ser revogável, não há ganho em carregar claims assinadas — e um valor
 * opaco não vaza nada caso seja interceptado.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Hash do refresh token para persistência.
 *
 * SHA-256 (e não bcrypt) porque o token já é aleatório com 384 bits de
 * entropia: não há o que quebrar por força bruta, e o hash precisa ser
 * determinístico para permitir a busca por índice único.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
