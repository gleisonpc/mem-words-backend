import { z } from 'zod';

export const suggestQuerySchema = z.object({
  query: z.object({
    word: z.string().trim().min(1, 'Informe a palavra.').max(200),
    sourceLanguage: z.string().trim().min(1, 'Informe o idioma de origem.'),
    targetLanguage: z.string().trim().min(1, 'Informe o idioma de destino.'),
  }),
});

export type SuggestQuery = z.infer<typeof suggestQuerySchema>['query'];
