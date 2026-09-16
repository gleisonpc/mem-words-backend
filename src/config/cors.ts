import type { CorsOptions } from 'cors';

import env from './env.js';

/**
 * Converte uma entrada de `CORS_ORIGIN` com `*` em uma expressão regular
 * ancorada, tratando o curinga como "qualquer sequência de caracteres".
 *
 * Escapa todo caractere especial de regex antes de trocar `*` por `.*` — sem
 * isso, o `.` do domínio casaria qualquer caractere, e um padrão como
 * `https://app.exemplo.com` aceitaria também `https://appXexemploXcom`.
 */
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (char) =>
    char === '*' ? '.*' : `\\${char}`,
  );

  return new RegExp(`^${escaped}$`);
}

/**
 * Opções de CORS.
 *
 * Por enquanto qualquer origem é liberada. Quando a URL do frontend estiver
 * definida, basta preencher CORS_ORIGIN (uma ou mais origens separadas por
 * vírgula) que a lista passa a ser aplicada, sem alterar o código.
 *
 * Uma entrada pode conter `*` para casar uma família de origens que muda a
 * cada deploy — como as URLs de revisão que a Vercel gera por branch ou por
 * build — sem exigir atualizar a lista a cada nova URL.
 */
export function buildCorsOptions(): CorsOptions {
  const configured = env.corsOrigin.trim();
  const anyOriginAllowed = configured === '' || configured === '*';

  const origin: CorsOptions['origin'] = anyOriginAllowed
    ? '*'
    : configured
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => (value.includes('*') ? patternToRegExp(value) : value));

  return {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Credenciais (o cookie do token de renovação) só acompanham uma lista de
    // origens específica. `Access-Control-Allow-Origin: *` com
    // `Access-Control-Allow-Credentials: true` é uma combinação que o próprio
    // navegador recusa — e liberá-la do mesmo jeito exporia o cookie de
    // sessão a qualquer site que fizesse a requisição.
    credentials: !anyOriginAllowed,
  };
}
