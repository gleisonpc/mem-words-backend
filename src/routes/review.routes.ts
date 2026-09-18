import { Router } from 'express';

import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { recordReviewSchema, reviewQueueParamSchema } from '../schemas/review.schema.js';

const router = Router();

// Todas as rotas abaixo exigem access token; a posse é checada no service
// (pelo dono do baralho, direto ou via o baralho do card). `/reviews/today`
// não recebe `:id` — é sempre o agregado da própria conta.
router.use('/decks/:id/reviews', authenticate);
router.use('/cards/:id/reviews', authenticate);
router.use('/reviews', authenticate);

router.get('/decks/:id/reviews/queue', validate(reviewQueueParamSchema), reviewController.queue);

router.post('/cards/:id/reviews', validate(recordReviewSchema), reviewController.create);

router.get('/reviews/today', reviewController.today);

export default router;
