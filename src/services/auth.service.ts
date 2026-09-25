import env from '../config/env.js';
import prisma from '../lib/prisma.js';
import { durationToMs } from '../lib/duration.js';
import { verifyPassword } from '../lib/password.js';
import { verifyGoogleIdToken } from '../lib/googleIdToken.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { LoginInput } from '../schemas/user.schema.js';
import { toPublicUser, type PublicUser } from './user.service.js';

/** Mesmo hash inválido fixo usado para não vazar, pelo tempo de resposta, se um e-mail existe. */
const INVALID_PASSWORD_HASH =
  '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';

/**
 * Tudo que a emissão de tokens produz — inclui `refreshToken` em texto puro,
 * de uso **interno**: o controller o extrai para gravar o cookie e nunca o
 * repassa ao corpo da resposta. `AuthTokens` é o que de fato compõe o corpo.
 */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export type AuthTokens = Omit<IssuedTokens, 'refreshToken'>;

export interface AuthResult extends IssuedTokens {
  user: PublicUser;
}

async function issueTokens(user: { id: string; email: string }): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + durationToMs(env.jwtRefreshExpiresIn)),
    },
  });

  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: env.jwtAccessExpiresIn,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Mesma mensagem para e-mail inexistente, senha errada e conta sem senha
  // (criada via Google): não entregamos a um atacante a informação de quais
  // e-mails estão cadastrados nem por qual meio a conta foi criada.
  if (user === null || user.passwordHash === null) {
    // Gasta tempo comparável ao de um bcrypt real para não expor a
    // existência (ou a ausência de senha) da conta pela diferença no tempo
    // de resposta.
    await verifyPassword(input.password, INVALID_PASSWORD_HASH);
    throw new UnauthorizedError('E-mail ou senha inválidos.');
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError('E-mail ou senha inválidos.');
  }

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

/**
 * Autentica com um ID token do Google (ver spec `user-auth`, "Autenticação
 * por Google"). Resolve a conta por `googleId` → por `email` (vinculando o
 * `googleId`) → cria conta nova sem senha — e finaliza emitindo o mesmo par
 * de tokens que `login()`.
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const payload = await verifyGoogleIdToken(idToken);

  if (!payload.emailVerified) {
    throw new UnauthorizedError('E-mail do Google não verificado.');
  }

  const email = payload.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

  if (user === null) {
    const existing = await prisma.user.findUnique({ where: { email } });

    // E-mail já verificado pelo Google: o vínculo é seguro sem etapa extra
    // de confirmação (ver design.md, "Vínculo automático por e-mail").
    user =
      existing !== null
        ? await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } })
        : await prisma.user.create({ data: { name: payload.name, email, googleId: payload.sub } });
  }

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

/**
 * Rotaciona o refresh token: o token apresentado é revogado e um novo par
 * é emitido. A linha antiga é mantida no banco para que a reapresentação
 * de um token já gasto seja detectável.
 */
export async function refresh(presentedToken: string): Promise<IssuedTokens> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(presentedToken) },
    include: { user: true },
  });

  if (stored === null) {
    throw new UnauthorizedError('Refresh token inválido.');
  }

  if (stored.revokedAt !== null) {
    // Token já usado sendo reapresentado: ou foi roubado, ou vazou. Por
    // segurança derrubamos todas as sessões do usuário.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    throw new UnauthorizedError('Refresh token já utilizado. Faça login novamente.');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError('Refresh token expirado.');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(stored.user);
}

export async function logout(presentedToken: string): Promise<void> {
  // updateMany não falha quando não encontra: o logout é idempotente e não
  // revela se o token existia.
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(presentedToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
