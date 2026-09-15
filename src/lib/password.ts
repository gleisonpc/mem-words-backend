import bcrypt from 'bcryptjs';

/**
 * Custo do bcrypt. 12 é um equilíbrio usual entre segurança e latência
 * (~250ms por hash em hardware modesto).
 */
const SALT_ROUNDS = 12;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
