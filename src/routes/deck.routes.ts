import { Router } from 'express';

import * as deckController from '../controllers/deck.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { createDeckSchema, deckIdParamSchema, updateDeckSchema } from '../schemas/deck.schema.js';

const router = Router();

// Todas as rotas abaixo exigem access token; a posse é checada no service.
router.use('/decks', authenticate);

router.get('/decks', deckController.list);
router.post('/decks', validate(createDeckSchema), deckController.create);

router.get('/decks/:id', validate(deckIdParamSchema), deckController.getById);
router.patch('/decks/:id', validate(updateDeckSchema), deckController.update);
router.delete('/decks/:id', validate(deckIdParamSchema), deckController.remove);

export default router;
