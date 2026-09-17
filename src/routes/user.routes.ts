import { Router } from 'express';

import * as userController from '../controllers/user.controller.js';
import { authenticate, ensureSelf } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { deleteUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

// Todas as rotas abaixo exigem access token.
router.use('/users', authenticate);

router.get('/users/me', userController.getMe);

router.patch('/users/:id', validate(updateUserSchema), ensureSelf, userController.update);

router.delete('/users/:id', validate(deleteUserSchema), ensureSelf, userController.remove);

export default router;
