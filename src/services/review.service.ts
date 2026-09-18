import prisma from '../lib/prisma.js';
import { computeNextSchedule, type ReviewGrade } from '../lib/scheduling.js';
import { ensureDeckOwnership, findCardOrThrow, toPublicCard, type PublicCard } from './card.service.js';
import { registerReviewActivity } from './user.service.js';

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
      suspended: false,
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
 * com `computeNextSchedule` e persistindo o resultado. Também conta como
 * atividade do dia para a sequência de dias seguidos do dono do baralho,
 * qualquer que seja a nota.
 */
export async function recordReview(
  id: string,
  userId: string,
  grade: ReviewGrade,
): Promise<PublicCard> {
  const card = await findCardOrThrow(id, userId);
  const now = new Date();
  const schedule = computeNextSchedule(card, grade, now);

  const updated = await prisma.card.update({
    where: { id },
    data: {
      state: schedule.state,
      learningStep: schedule.learningStep,
      easeFactor: schedule.easeFactor,
      intervalDays: schedule.intervalDays,
      dueAt: schedule.dueAt,
      lastGrade: grade,
    },
  });

  await registerReviewActivity(userId, now);

  return toPublicCard(updated);
}

export interface TodaySummary {
  dueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

/**
 * Agrega, entre todos os baralhos do usuário, os cards prontos para
 * revisão agora — mesmo critério de `getReviewQueue`, dividido por tipo em
 * vez de por baralho.
 */
export async function getTodaySummary(userId: string): Promise<TodaySummary> {
  const now = new Date();

  const [newCount, learningCount, reviewCount] = await Promise.all([
    prisma.card.count({ where: { deck: { userId }, suspended: false, state: 'new' } }),
    prisma.card.count({
      where: { deck: { userId }, suspended: false, state: 'learning', dueAt: { lte: now } },
    }),
    prisma.card.count({
      where: { deck: { userId }, suspended: false, state: 'review', dueAt: { lte: now } },
    }),
  ]);

  return { dueCount: newCount + learningCount + reviewCount, newCount, learningCount, reviewCount };
}
