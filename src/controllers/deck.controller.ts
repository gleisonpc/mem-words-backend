import type { RequestHandler } from 'express';

import * as deckService from '../services/deck.service.js';
import { requireUser } from '../middlewares/authenticate.js';

/** GET /decks */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(200).json({ decks: await deckService.listDecksByUser(user.id) });
  } catch (error) {
    next(error);
  }
};

/** POST /decks */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(201).json({ deck: await deckService.createDeck(user.id, req.body) });
  } catch (error) {
    next(error);
  }
};

/** GET /decks/:id */
export const getById: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    res.status(200).json({ deck: await deckService.getDeckForUser(id, user.id) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /decks/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    res.status(200).json({ deck: await deckService.updateDeck(id, user.id, req.body) });
  } catch (error) {
    next(error);
  }
};

/** DELETE /decks/:id */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    await deckService.deleteDeck(id, user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
