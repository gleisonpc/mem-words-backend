import type { Card, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { MATURE_INTERVAL_DAYS } from '../lib/scheduling.js';
import type { CreateCardInput, UpdateCardInput } from '../schemas/card.schema.js';

export type CardStatus = 'suspended' | 'new' | 'learning' | 'difficult' | 'mature' | 'reviewing';

export interface PublicCard {
  id: string;
  word: string;
  translation: string;
  partOfSpeech: string | null;
  synonyms: string[];
  exampleSentence: string | null;
  exampleTranslation: string | null;
  personalNote: string | null;
  state: string;
  // Agendamento de revisão espaçada — ver src/lib/scheduling.ts. `dueAt` é
  // `null` enquanto o card nunca recebeu nota (`state: "new"`).
  learningStep: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: Date | null;
  suspended: boolean;
  lastGrade: string | null;
  // Classificação calculada — ver `deriveCardStatus`.
  status: CardStatus;
  deckId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedCards {
  items: PublicCard[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Classifica um card num único status, na ordem de prioridade do spec de
 * `cards`: suspenso vence qualquer outra coisa; `difficult` (última nota
 * `hard` em `review`) vence `mature`, mesmo com intervalo maduro.
 */
export function deriveCardStatus(card: {
  suspended: boolean;
  state: string;
  lastGrade: string | null;
  intervalDays: number;
}): CardStatus {
  if (card.suspended) {
    return 'suspended';
  }

  if (card.state === 'new') {
    return 'new';
  }

  if (card.state === 'learning') {
    return 'learning';
  }

  if (card.lastGrade === 'hard') {
    return 'difficult';
  }

  return card.intervalDays >= MATURE_INTERVAL_DAYS ? 'mature' : 'reviewing';
}

/**
 * Traduz um `CardStatus` na combinação de colunas reais que o produz —
 * usada para filtrar `GET /decks/:id/cards?status=`, já que `status` não é
 * coluna. Mesma prioridade de `deriveCardStatus`, na direção oposta.
 */
export function statusWhereClause(status: CardStatus): Prisma.CardWhereInput {
  switch (status) {
    case 'suspended':
      return { suspended: true };
    case 'new':
      return { suspended: false, state: 'new' };
    case 'learning':
      return { suspended: false, state: 'learning' };
    case 'difficult':
      return { suspended: false, state: 'review', lastGrade: 'hard' };
    case 'mature':
      return {
        suspended: false,
        state: 'review',
        lastGrade: { not: 'hard' },
        intervalDays: { gte: MATURE_INTERVAL_DAYS },
      };
    case 'reviewing':
      return {
        suspended: false,
        state: 'review',
        lastGrade: { not: 'hard' },
        intervalDays: { lt: MATURE_INTERVAL_DAYS },
      };
  }
}

export function toPublicCard(card: Card): PublicCard {
  return {
    id: card.id,
    word: card.word,
    translation: card.translation,
    partOfSpeech: card.partOfSpeech,
    synonyms: card.synonyms,
    exampleSentence: card.exampleSentence,
    exampleTranslation: card.exampleTranslation,
    personalNote: card.personalNote,
    state: card.state,
    learningStep: card.learningStep,
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    dueAt: card.dueAt,
    suspended: card.suspended,
    lastGrade: card.lastGrade,
    status: deriveCardStatus(card),
    deckId: card.deckId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

/**
 * Garante que o baralho existe e pertence a `userId`, sem carregar cards.
 *
 * Exportada porque `review.service.ts` precisa da mesma checagem para
 * montar a fila de revisão de um baralho.
 */
export async function ensureDeckOwnership(deckId: string, userId: string): Promise<void> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });

  if (deck === null) {
    throw new NotFoundError('Baralho não encontrado.');
  }

  if (deck.userId !== userId) {
    throw new ForbiddenError('Você só pode acessar os próprios baralhos.');
  }
}

export async function listCardsByDeck(
  deckId: string,
  userId: string,
  page: number,
  pageSize: number,
  filters: { q?: string; status?: CardStatus } = {},
): Promise<PaginatedCards> {
  await ensureDeckOwnership(deckId, userId);

  const where: Prisma.CardWhereInput = {
    deckId,
    ...(filters.q !== undefined && { word: { contains: filters.q, mode: 'insensitive' } }),
    ...(filters.status !== undefined && statusWhereClause(filters.status)),
  };

  const [items, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);

  return { items: items.map(toPublicCard), total, page, pageSize };
}

export async function createCard(
  deckId: string,
  userId: string,
  input: CreateCardInput,
): Promise<PublicCard> {
  await ensureDeckOwnership(deckId, userId);

  const card = await prisma.card.create({
    data: {
      word: input.word,
      translation: input.translation,
      partOfSpeech: input.partOfSpeech ?? null,
      synonyms: input.synonyms ?? [],
      exampleSentence: input.exampleSentence ?? null,
      exampleTranslation: input.exampleTranslation ?? null,
      personalNote: input.personalNote ?? null,
      deckId,
    },
  });

  return toPublicCard(card);
}

/**
 * Resolve um card verificando a posse pelo dono do baralho, em uma única
 * consulta — evita duas idas ao banco (uma para o card, outra para o dono).
 *
 * Exportada porque `review.service.ts` precisa da mesma resolução para
 * registrar uma nota — não há motivo para duplicar a consulta.
 */
export async function findCardOrThrow(id: string, userId: string): Promise<Card> {
  const card = await prisma.card.findUnique({
    where: { id },
    include: { deck: true },
  });

  if (card === null) {
    throw new NotFoundError('Card não encontrado.');
  }

  if (card.deck.userId !== userId) {
    throw new ForbiddenError('Você só pode acessar os cards dos próprios baralhos.');
  }

  return card;
}

export async function getCardForUser(id: string, userId: string): Promise<PublicCard> {
  return toPublicCard(await findCardOrThrow(id, userId));
}

/**
 * Suspende ou reativa um card — ação manual e reversível, ortogonal ao
 * agendamento de revisão (`state`/`learningStep`/`easeFactor`/
 * `intervalDays`/`dueAt`, nenhum dos quais é tocado aqui). Idempotente:
 * suspender um card já suspenso, ou reativar um já ativo, só confirma o
 * estado atual, sem erro.
 */
async function setSuspended(id: string, userId: string, suspended: boolean): Promise<PublicCard> {
  await findCardOrThrow(id, userId);

  const updated = await prisma.card.update({ where: { id }, data: { suspended } });

  return toPublicCard(updated);
}

export function suspendCard(id: string, userId: string): Promise<PublicCard> {
  return setSuspended(id, userId, true);
}

export function unsuspendCard(id: string, userId: string): Promise<PublicCard> {
  return setSuspended(id, userId, false);
}

export async function updateCard(
  id: string,
  userId: string,
  input: UpdateCardInput,
): Promise<PublicCard> {
  await findCardOrThrow(id, userId);

  const updated = await prisma.card.update({
    where: { id },
    data: {
      ...(input.word !== undefined && { word: input.word }),
      ...(input.translation !== undefined && { translation: input.translation }),
      ...(input.partOfSpeech !== undefined && { partOfSpeech: input.partOfSpeech }),
      ...(input.synonyms !== undefined && { synonyms: input.synonyms }),
      ...(input.exampleSentence !== undefined && { exampleSentence: input.exampleSentence }),
      ...(input.exampleTranslation !== undefined && {
        exampleTranslation: input.exampleTranslation,
      }),
      ...(input.personalNote !== undefined && { personalNote: input.personalNote }),
    },
  });

  return toPublicCard(updated);
}

export async function deleteCard(id: string, userId: string): Promise<void> {
  await findCardOrThrow(id, userId);

  await prisma.card.delete({ where: { id } });
}
