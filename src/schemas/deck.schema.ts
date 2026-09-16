import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(1, 'O nome do baralho é obrigatório.')
  .max(120, 'O nome deve ter no máximo 120 caracteres.');

// Código de idioma livre (ex.: "pt-br", "en") — o produto não trava em uma
// lista fixa, então validamos só o formato, não os valores possíveis.
const language = z
  .string()
  .trim()
  .min(2, 'Informe um código de idioma válido.')
  .max(10, 'Código de idioma muito longo.');

export const createDeckSchema = z.object({
  body: z.object({
    name,
    sourceLanguage: language,
    targetLanguage: language,
  }),
});

export const updateDeckSchema = z.object({
  params: z.object({ id: z.uuid('Id de baralho inválido.') }),
  body: z
    .object({
      name: name.optional(),
      sourceLanguage: language.optional(),
      targetLanguage: language.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Informe ao menos um campo para atualizar.',
    }),
});

export const deckIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Id de baralho inválido.') }),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>['body'];
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>['body'];
