import { Router } from 'express';

import * as cardController from '../controllers/card.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import {
  cardIdParamSchema,
  createCardSchema,
  listCardsQuerySchema,
  updateCardSchema,
} from '../schemas/card.schema.js';

const router = Router();

// Todas as rotas abaixo exigem access token; a posse é checada no service
// (pelo dono do baralho, direto ou via o baralho do card).
router.use('/decks/:id/cards', authenticate);
router.use('/cards', authenticate);

router.get('/decks/:id/cards', validate(listCardsQuerySchema), cardController.list);
router.post('/decks/:id/cards', validate(createCardSchema), cardController.create);

router.get('/cards/:id', validate(cardIdParamSchema), cardController.getById);
router.patch('/cards/:id', validate(updateCardSchema), cardController.update);
router.delete('/cards/:id', validate(cardIdParamSchema), cardController.remove);

export default router;
