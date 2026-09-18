import { z } from 'zod';

const word = z
  .string()
  .trim()
  .min(1, 'A palavra é obrigatória.')
  .max(200, 'A palavra deve ter no máximo 200 caracteres.');

const translation = z
  .string()
  .trim()
  .min(1, 'A tradução é obrigatória.')
  .max(200, 'A tradução deve ter no máximo 200 caracteres.');

const partOfSpeech = z
  .string()
  .trim()
  .min(1)
  .max(40, 'A classe gramatical deve ter no máximo 40 caracteres.');

const synonyms = z.array(z.string().trim().min(1)).max(50, 'No máximo 50 sinônimos.');

const exampleSentence = z.string().trim().min(1);
const exampleTranslation = z.string().trim().min(1);
const personalNote = z.string().trim().min(1);

export const createCardSchema = z.object({
  params: z.object({ id: z.uuid('Id de baralho inválido.') }),
  body: z.object({
    word,
    translation,
    partOfSpeech: partOfSpeech.optional(),
    synonyms: synonyms.optional(),
    exampleSentence: exampleSentence.optional(),
    exampleTranslation: exampleTranslation.optional(),
    personalNote: personalNote.optional(),
  }),
});

export const updateCardSchema = z.object({
  params: z.object({ id: z.uuid('Id de card inválido.') }),
  body: z
    .object({
      word: word.optional(),
      translation: translation.optional(),
      partOfSpeech: partOfSpeech.optional(),
      synonyms: synonyms.optional(),
      exampleSentence: exampleSentence.optional(),
      exampleTranslation: exampleTranslation.optional(),
      personalNote: personalNote.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Informe ao menos um campo para atualizar.',
    }),
});

export const cardIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Id de card inválido.') }),
});

const cardStatus = z.enum(
  ['new', 'learning', 'difficult', 'mature', 'reviewing', 'suspended'],
  'Status de card inválido.',
);

export const listCardsQuerySchema = z.object({
  params: z.object({ id: z.uuid('Id de baralho inválido.') }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
    q: z.string().trim().min(1).optional(),
    status: cardStatus.optional(),
  }),
});

export type CreateCardInput = z.infer<typeof createCardSchema>['body'];
export type UpdateCardInput = z.infer<typeof updateCardSchema>['body'];
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>['query'];
