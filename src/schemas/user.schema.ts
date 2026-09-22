import { z } from 'zod';

const password = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres.')
  // O bcrypt trunca a entrada em 72 bytes; recusamos explicitamente em vez
  // de aceitar uma senha longa e validar apenas o começo dela.
  .max(72, 'A senha deve ter no máximo 72 caracteres.');

// trim/toLowerCase vêm ANTES da validação: no Zod 4 os formatos (z.email)
// checam o valor recebido, então normalizar depois não teria efeito sobre a
// validação — " USER@X.COM " seria recusado em vez de virar "user@x.com".
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('E-mail inválido.').max(255, 'E-mail muito longo.'));

const name = z
  .string()
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(120, 'O nome deve ter no máximo 120 caracteres.');

export const createUserSchema = z.object({
  body: z.object({ name, email, password }),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    // No login não aplicamos as regras de força: a senha só precisa bater
    // com o hash. Validar tamanho aqui daria uma pista sobre a senha real.
    password: z.string().min(1, 'Informe a senha.'),
  }),
});

/** Cliente mobile: o refresh token vem do corpo, nunca de cookie. */
export const mobileRefreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Informe o refresh token.'),
  }),
});

/**
 * Sem o token, não há o que revogar — mas isso não é erro de validação: o
 * logout continua idempotente também para quem não manda nada (ver
 * `POST /auth/mobile/logout`).
 */
export const mobileLogoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.uuid('Id de usuário inválido.') }),
  body: z
    .object({
      name: name.optional(),
      email: email.optional(),
      password: password.optional(),
      /** Exigida para confirmar a troca de senha. */
      currentPassword: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Informe ao menos um campo para atualizar.',
    })
    .refine((data) => data.password === undefined || data.currentPassword !== undefined, {
      message: 'Informe currentPassword para alterar a senha.',
      path: ['currentPassword'],
    }),
});

export const deleteUserSchema = z.object({
  params: z.object({ id: z.uuid('Id de usuário inválido.') }),
  body: z.object({
    /** Exigida para confirmar a exclusão — mesmo motivo da troca de senha. */
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type DeleteUserInput = z.infer<typeof deleteUserSchema>['body'];
export type MobileRefreshInput = z.infer<typeof mobileRefreshSchema>['body'];
export type MobileLogoutInput = z.infer<typeof mobileLogoutSchema>['body'];
