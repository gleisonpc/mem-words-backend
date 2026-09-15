import { Router } from 'express';

import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, loginSchema, refreshSchema } from '../schemas/user.schema.js';

const router = Router();

router.post('/auth/register', validate(createUserSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
router.post('/auth/refresh', validate(refreshSchema), authController.refresh);
router.post('/auth/logout', validate(refreshSchema), authController.logout);

export default router;
