import { Router } from 'express';

import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { recordReviewSchema, reviewQueueParamSchema } from '../schemas/review.schema.js';

const router = Router();

// Todas as rotas abaixo exigem access token; a posse é checada no service
// (pelo dono do baralho, direto ou via o baralho do card).
router.use('/decks/:id/reviews', authenticate);
router.use('/cards/:id/reviews', authenticate);

router.get('/decks/:id/reviews/queue', validate(reviewQueueParamSchema), reviewController.queue);

router.post('/cards/:id/reviews', validate(recordReviewSchema), reviewController.create);

export default router;
