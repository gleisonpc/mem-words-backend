import prisma from '../lib/prisma.js';
import { computeNextSchedule, type ReviewGrade } from '../lib/scheduling.js';
import { ensureDeckOwnership, findCardOrThrow, toPublicCard, type PublicCard } from './card.service.js';

const GRADES: ReviewGrade[] = ['again', 'hard', 'good', 'easy'];

export interface ReviewPreview {
  grade: ReviewGrade;
  dueAt: Date;
}

export interface QueuedCard {
  card: PublicCard;
  previews: ReviewPreview[];
}

/** Ordena `learning` antes de `review`, antes de `new` — ver design.md. */
const STATE_PRIORITY: Record<string, number> = { learning: 0, review: 1, new: 2 };

/**
 * Monta a fila de revisão de um baralho: todo card `new`, e todo card
 * `learning`/`review` cujo `dueAt` já passou. Cada card vem com a prévia
 * das quatro notas, calculada por `computeNextSchedule` sem gravar nada.
 */
export async function getReviewQueue(deckId: string, userId: string): Promise<QueuedCard[]> {
  await ensureDeckOwnership(deckId, userId);

  const now = new Date();

  const cards = await prisma.card.findMany({
    where: {
      deckId,
      OR: [{ state: 'new' }, { dueAt: { lte: now } }],
    },
  });

  cards.sort((a, b) => (STATE_PRIORITY[a.state] as number) - (STATE_PRIORITY[b.state] as number));

  return cards.map((card) => ({
    card: toPublicCard(card),
    previews: GRADES.map((grade) => ({
      grade,
      dueAt: computeNextSchedule(card, grade, now).dueAt,
    })),
  }));
}

/**
 * Registra uma nota de revisão para um card, recalculando seu agendamento
 * com `computeNextSchedule` e persistindo o resultado.
 */
export async function recordReview(
  id: string,
  userId: string,
  grade: ReviewGrade,
): Promise<PublicCard> {
  const card = await findCardOrThrow(id, userId);
  const schedule = computeNextSchedule(card, grade, new Date());

  const updated = await prisma.card.update({
    where: { id },
    data: {
      state: schedule.state,
      learningStep: schedule.learningStep,
      easeFactor: schedule.easeFactor,
      intervalDays: schedule.intervalDays,
      dueAt: schedule.dueAt,
    },
  });

  return toPublicCard(updated);
}
