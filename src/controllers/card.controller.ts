import type { RequestHandler } from 'express';

import * as cardService from '../services/card.service.js';
import { requireUser } from '../middlewares/authenticate.js';

/** GET /decks/:id/cards */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const deckId = req.params['id'] as string;
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
    res.status(200).json(await cardService.listCardsByDeck(deckId, user.id, page, pageSize));
  } catch (error) {
    next(error);
  }
};

/** POST /decks/:id/cards */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const deckId = req.params['id'] as string;
    res.status(201).json({ card: await cardService.createCard(deckId, user.id, req.body) });
  } catch (error) {
    next(error);
  }
};

/** GET /cards/:id */
export const getById: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    res.status(200).json({ card: await cardService.getCardForUser(id, user.id) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /cards/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    res.status(200).json({ card: await cardService.updateCard(id, user.id, req.body) });
  } catch (error) {
    next(error);
  }
};

/** DELETE /cards/:id */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    await cardService.deleteCard(id, user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
