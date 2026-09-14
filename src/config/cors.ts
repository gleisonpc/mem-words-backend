import type { CorsOptions } from 'cors';

import env from './env.js';

/**
 * Opções de CORS.
 *
 * Por enquanto qualquer origem é liberada. Quando a URL do frontend estiver
 * definida, basta preencher CORS_ORIGIN (uma ou mais origens separadas por
 * vírgula) que a lista passa a ser aplicada, sem alterar o código.
 */
export function buildCorsOptions(): CorsOptions {
  const configured = env.corsOrigin.trim();

  const origin: CorsOptions['origin'] =
    configured === '' || configured === '*'
      ? '*'
      : configured
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

  return {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  };
}
