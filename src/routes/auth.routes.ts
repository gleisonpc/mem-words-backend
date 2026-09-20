import { Router } from 'express';

import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  createUserSchema,
  loginSchema,
  mobileLogoutSchema,
  mobileRefreshSchema,
} from '../schemas/user.schema.js';

const router = Router();

router.post('/auth/register', validate(createUserSchema), authController.register);
router.post('/auth/login', validate(loginSchema), authController.login);
// Sem validação de corpo: o token de renovação vem do cookie, não do body.
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);

// Cliente mobile: mesmas regras, refresh token por corpo em vez de cookie.
router.post('/auth/mobile/login', validate(loginSchema), authController.mobileLogin);
router.post('/auth/mobile/refresh', validate(mobileRefreshSchema), authController.mobileRefresh);
router.post('/auth/mobile/logout', validate(mobileLogoutSchema), authController.mobileLogout);

export default router;
