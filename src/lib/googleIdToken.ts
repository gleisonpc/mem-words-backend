import { OAuth2Client } from 'google-auth-library';

import env from '../config/env.js';
import { UnauthorizedError } from '../errors/AppError.js';

const client = new OAuth2Client();

/** O que a autenticação por Google precisa do ID token, já verificado. */
export interface GoogleIdTokenPayload {
  /** Identificador estável da conta Google — nunca muda, ao contrário do e-mail. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Verifica um ID token do Google Identity Services contra o Client ID
 * configurado da aplicação.
 *
 * `verifyIdToken` (biblioteca oficial) cuida de buscar e cachear as chaves
 * públicas do Google, e verificar assinatura, emissor (`iss`), validade
 * (`exp`) e audiência (`aud`) — nenhuma dessas checagens é reimplementada
 * aqui (ver design.md, "Verificação do ID token").
 *
 * Recusa e-mail não verificado é responsabilidade de quem chama
 * (`auth.service.loginWithGoogle`), não desta função: aqui só se verifica
 * que o token em si é autêntico.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  let payload;

  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('Token do Google inválido.');
  }

  if (
    payload === undefined ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.name !== 'string'
  ) {
    throw new UnauthorizedError('Token do Google inválido.');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name,
  };
}
