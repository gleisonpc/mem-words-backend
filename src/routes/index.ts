import { Router } from 'express';

import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import deckRoutes from './deck.routes.js';
import cardRoutes from './card.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(deckRoutes);
router.use(cardRoutes);

export default router;
