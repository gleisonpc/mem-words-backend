import { Router } from 'express';

import * as dictionaryController from '../controllers/dictionary.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { suggestQuerySchema } from '../schemas/dictionary.schema.js';

const router = Router();

router.use('/dictionary', authenticate);

router.get('/dictionary/suggest', validate(suggestQuerySchema), dictionaryController.suggest);

export default router;
