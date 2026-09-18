import type { User } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { nextStreak } from '../lib/streak.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../errors/AppError.js';
import type { CreateUserInput, UpdateUserInput } from '../schemas/user.schema.js';

/** Usuário como exposto pela API — nunca inclui o hash da senha. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  currentStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currentStreak: user.currentStreak,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Registra que o usuário teve atividade de revisão agora, recalculando sua
 * sequência de dias seguidos (`nextStreak`) e persistindo o resultado.
 * Chamada a cada nota de revisão registrada (`review.service.recordReview`),
 * qualquer que seja a nota.
 */
export async function registerReviewActivity(userId: string, now: Date): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user === null) {
    return;
  }

  const streak = nextStreak(user.currentStreak, user.lastActiveOn, now);

  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: streak.currentStreak, lastActiveOn: streak.lastActiveOn },
  });
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing !== null) {
    throw new ConflictError('Já existe um usuário com este e-mail.');
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });

  return toPublicUser(user);
}

export async function findUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (user === null) {
    throw new NotFoundError('Usuário não encontrado.');
  }

  return toPublicUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (user === null) {
    throw new NotFoundError('Usuário não encontrado.');
  }

  // Trocar a senha exige confirmar a atual: impede que um access token
  // roubado seja usado para assumir a conta em definitivo.
  if (input.password !== undefined) {
    const currentPasswordMatches = await verifyPassword(
      input.currentPassword ?? '',
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedError('Senha atual incorreta.');
    }
  }

  if (input.email !== undefined && input.email !== user.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } });

    if (emailOwner !== null) {
      throw new ConflictError('Já existe um usuário com este e-mail.');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.password !== undefined && {
        passwordHash: await hashPassword(input.password),
      }),
    },
  });

  // Trocar a senha invalida as sessões abertas em outros dispositivos.
  if (input.password !== undefined) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return toPublicUser(updated);
}

export async function deleteUser(id: string, currentPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (user === null) {
    throw new NotFoundError('Usuário não encontrado.');
  }

  // Mesmo motivo da troca de senha: um token de acesso obtido indevidamente
  // não pode bastar para uma ação irreversível na conta.
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError('Senha atual incorreta.');
  }

  // Os baralhos, cards e refresh tokens caem junto por onDelete: Cascade.
  await prisma.user.delete({ where: { id } });
}
