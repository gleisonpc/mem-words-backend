import type { Deck, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { MATURE_INTERVAL_DAYS } from '../lib/scheduling.js';
import type { CreateDeckInput, UpdateDeckInput } from '../schemas/deck.schema.js';

export interface PublicDeck {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckCardStats {
  cardCount: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  matureCount: number;
  suspendedCount: number;
}

export type PublicDeckWithCardCount = PublicDeck & DeckCardStats;
export type PublicDeckWithStats = PublicDeck & DeckCardStats;

function toPublicDeck(deck: Deck): PublicDeck {
  return {
    id: deck.id,
    name: deck.name,
    sourceLanguage: deck.sourceLanguage,
    targetLanguage: deck.targetLanguage,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
  };
}

interface StatCriteria {
  dueCount: Prisma.CardWhereInput;
  newCount: Prisma.CardWhereInput;
  learningCount: Prisma.CardWhereInput;
  matureCount: Prisma.CardWhereInput;
  suspendedCount: Prisma.CardWhereInput;
}

/**
 * `where` de cada contagem por status — mesma prioridade de
 * `deriveCardStatus`/`statusWhereClause` em `card.service.ts`, mas aqui
 * repetida porque as duas contagens de baralho (lista e detalhe) rodam
 * `groupBy`/`count` em paralelo, não sobre um card já carregado.
 */
function statCriteria(now: Date): StatCriteria {
  return {
    // Mesmo critério de "pronto para revisão" da fila (`review.service.ts`).
    dueCount: { suspended: false, OR: [{ state: 'new' }, { dueAt: { lte: now } }] },
    newCount: { suspended: false, state: 'new' },
    learningCount: { suspended: false, state: 'learning' },
    matureCount: {
      suspended: false,
      state: 'review',
      lastGrade: { not: 'hard' },
      intervalDays: { gte: MATURE_INTERVAL_DAYS },
    },
    suspendedCount: { suspended: true },
  };
}

/** Conta, por baralho, os cards que casam com `where` — uma consulta agregada, não uma por baralho. */
async function countCardsByDeck(
  userId: string,
  where: Prisma.CardWhereInput,
): Promise<Map<string, number>> {
  const groups = await prisma.card.groupBy({
    by: ['deckId'],
    where: { deck: { userId }, ...where },
    _count: { _all: true },
  });

  return new Map(groups.map((group) => [group.deckId, group._count._all]));
}

export async function listDecksByUser(userId: string): Promise<PublicDeckWithStats[]> {
  const criteria = statCriteria(new Date());

  const [decks, cardCounts, dueCounts, newCounts, learningCounts, matureCounts, suspendedCounts] =
    await Promise.all([
      prisma.deck.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      countCardsByDeck(userId, {}),
      countCardsByDeck(userId, criteria.dueCount),
      countCardsByDeck(userId, criteria.newCount),
      countCardsByDeck(userId, criteria.learningCount),
      countCardsByDeck(userId, criteria.matureCount),
      countCardsByDeck(userId, criteria.suspendedCount),
    ]);

  // Um baralho sem card algum não gera linha num `groupBy` — ausente do
  // mapa é o mesmo que zero, não "desconhecido".
  return decks.map((deck) => ({
    ...toPublicDeck(deck),
    cardCount: cardCounts.get(deck.id) ?? 0,
    dueCount: dueCounts.get(deck.id) ?? 0,
    newCount: newCounts.get(deck.id) ?? 0,
    learningCount: learningCounts.get(deck.id) ?? 0,
    matureCount: matureCounts.get(deck.id) ?? 0,
    suspendedCount: suspendedCounts.get(deck.id) ?? 0,
  }));
}

export async function createDeck(userId: string, input: CreateDeckInput): Promise<PublicDeck> {
  const deck = await prisma.deck.create({
    data: {
      name: input.name,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      userId,
    },
  });

  return toPublicDeck(deck);
}

/**
 * Resolve um baralho para o dono informado, distinguindo "não existe" de
 * "existe mas não é seu" — quem chama decide 404 vs 403.
 */
async function findDeckOrThrow(id: string, userId: string): Promise<Deck> {
  const deck = await prisma.deck.findUnique({ where: { id } });

  if (deck === null) {
    throw new NotFoundError('Baralho não encontrado.');
  }

  if (deck.userId !== userId) {
    throw new ForbiddenError('Você só pode acessar os próprios baralhos.');
  }

  return deck;
}

export async function getDeckForUser(id: string, userId: string): Promise<PublicDeckWithCardCount> {
  const deck = await findDeckOrThrow(id, userId);
  const criteria = statCriteria(new Date());

  const [cardCount, dueCount, newCount, learningCount, matureCount, suspendedCount] =
    await Promise.all([
      prisma.card.count({ where: { deckId: deck.id } }),
      prisma.card.count({ where: { deckId: deck.id, ...criteria.dueCount } }),
      prisma.card.count({ where: { deckId: deck.id, ...criteria.newCount } }),
      prisma.card.count({ where: { deckId: deck.id, ...criteria.learningCount } }),
      prisma.card.count({ where: { deckId: deck.id, ...criteria.matureCount } }),
      prisma.card.count({ where: { deckId: deck.id, ...criteria.suspendedCount } }),
    ]);

  return {
    ...toPublicDeck(deck),
    cardCount,
    dueCount,
    newCount,
    learningCount,
    matureCount,
    suspendedCount,
  };
}

export async function updateDeck(
  id: string,
  userId: string,
  input: UpdateDeckInput,
): Promise<PublicDeck> {
  await findDeckOrThrow(id, userId);

  const updated = await prisma.deck.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.sourceLanguage !== undefined && { sourceLanguage: input.sourceLanguage }),
      ...(input.targetLanguage !== undefined && { targetLanguage: input.targetLanguage }),
    },
  });

  return toPublicDeck(updated);
}

export async function deleteDeck(id: string, userId: string): Promise<void> {
  await findDeckOrThrow(id, userId);

  // Os cards caem junto por onDelete: Cascade.
  await prisma.deck.delete({ where: { id } });
}
