import type { Card } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../errors/AppError.js';
import type { CreateCardInput, UpdateCardInput } from '../schemas/card.schema.js';

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

function toPublicCard(card: Card): PublicCard {
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
    deckId: card.deckId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

/** Garante que o baralho existe e pertence a `userId`, sem carregar cards. */
async function ensureDeckOwnership(deckId: string, userId: string): Promise<void> {
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
): Promise<PaginatedCards> {
  await ensureDeckOwnership(deckId, userId);

  const [items, total] = await Promise.all([
    prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where: { deckId } }),
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
 */
async function findCardOrThrow(id: string, userId: string): Promise<Card> {
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
