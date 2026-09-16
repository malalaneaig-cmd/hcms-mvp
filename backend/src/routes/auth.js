import { Router } from 'express';

import * as ctrl from '../controllers/authController.js';

import { requireAuth, requireAdmin } from '../middleware/auth.js';

import { attachDbContext } from '../middleware/dbContext.js';



const router = Router();



router.post('/login',    ctrl.login);

router.get('/me',        requireAuth, attachDbContext, ctrl.me);



// Staff management — admin only

router.post('/register', requireAuth, attachDbContext, requireAdmin, ctrl.register);

router.get('/users',     requireAuth, attachDbContext, requireAdmin, ctrl.listUsers);



export default router;


