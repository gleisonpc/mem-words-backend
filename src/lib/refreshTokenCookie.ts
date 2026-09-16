import type { Request, Response } from 'express';

import env from '../config/env.js';
import { durationToMs } from './duration.js';

/**
 * Cookie que carrega o token de renovação.
 *
 * `HttpOnly` + `Secure` + `SameSite=None` é o conjunto necessário para um
 * cookie legível entre origens diferentes (frontend e backend em domínios
 * distintos) e ilegível por JavaScript — o ponto inteiro desta mudança.
 * `Path=/auth` restringe o envio às rotas que de fato precisam dele.
 *
 * Sempre os mesmos atributos, sem depender de `NODE_ENV`: a topologia real
 * (Vercel + Render) é cross-site em qualquer ambiente que não seja
 * `localhost` nos dois lados, e um caminho condicional nunca exercitado em
 * desenvolvimento é um caminho não testado até a produção.
 */
const COOKIE_NAME = 'refreshToken';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/auth',
};

/**
 * Lê o cookie do token de renovação do cabeçalho `Cookie` da requisição.
 *
 * Analisador mínimo para um único nome — o projeto não usa `cookie-parser`
 * porque não precisa do que ele resolve (múltiplos cookies, formatos
 * variados): há só este cookie, e seu valor é gerado pelo próprio backend
 * como base64url, um alfabeto que nunca precisa de decodificação. O
 * `decodeURIComponent` aqui é defensivo, não necessário para o valor que
 * este backend emite.
 */
export function readRefreshTokenCookie(req: Request): string | null {
  const header = req.headers.cookie;

  if (header === undefined) {
    return null;
  }

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();

    if (name !== COOKIE_NAME) {
      continue;
    }

    const rawValue = part.slice(separatorIndex + 1).trim();

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

/** Emite ou substitui o cookie, com validade igual à do token que carrega. */
export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: durationToMs(env.jwtRefreshExpiresIn),
  });
}

/** Limpa o cookie — chamado no logout, com ou sem token presente. */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
}
