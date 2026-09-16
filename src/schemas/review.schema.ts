import { z } from 'zod';

/**
 * O agendamento resultante é sempre determinado pelo estado atual do card e
 * pela nota recebida (ver `src/lib/scheduling.ts`) — nenhum outro campo é
 * aceito no corpo.
 */
export const recordReviewSchema = z.object({
  params: z.object({ id: z.uuid('Id de card inválido.') }),
  body: z.object({
    grade: z.enum(['again', 'hard', 'good', 'easy'], 'Nota de revisão inválida.'),
  }),
});

export const reviewQueueParamSchema = z.object({
  params: z.object({ id: z.uuid('Id de baralho inválido.') }),
});

export type RecordReviewInput = z.infer<typeof recordReviewSchema>['body'];
