import type { RequestHandler } from 'express';

import * as reviewService from '../services/review.service.js';
import { requireUser } from '../middlewares/authenticate.js';

/** GET /decks/:id/reviews/queue */
export const queue: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const deckId = req.params['id'] as string;
    res.status(200).json({ queue: await reviewService.getReviewQueue(deckId, user.id) });
  } catch (error) {
    next(error);
  }
};

/** POST /cards/:id/reviews */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params['id'] as string;
    const { grade } = req.body;
    res.status(200).json({ card: await reviewService.recordReview(id, user.id, grade) });
  } catch (error) {
    next(error);
  }
};
