import { Router } from 'express';
import * as ctrl from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login',    ctrl.login);
router.get('/me',        requireAuth, ctrl.me);

// Staff management — admin only
router.post('/register', requireAuth, requireAdmin, ctrl.register);
router.get('/users',     requireAuth, requireAdmin, ctrl.listUsers);

export default router;
