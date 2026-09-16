import type { Deck } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../errors/AppError.js';
import type { CreateDeckInput, UpdateDeckInput } from '../schemas/deck.schema.js';

export interface PublicDeck {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDeckWithCardCount extends PublicDeck {
  cardCount: number;
}

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

export async function listDecksByUser(userId: string): Promise<PublicDeck[]> {
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return decks.map(toPublicDeck);
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
  const cardCount = await prisma.card.count({ where: { deckId: deck.id } });

  return { ...toPublicDeck(deck), cardCount };
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
