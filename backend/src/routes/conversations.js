import { Router } from 'express';
import * as ctrl from '../controllers/conversationsController.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { attachDbContext } from '../middleware/dbContext.js';

const router = Router();
router.use(requireAuth, attachDbContext, requireStaff);

router.get('/',                    ctrl.listThreads);
router.get('/escalations',         ctrl.listEscalations);
router.patch('/escalations/:id',   ctrl.resolveEscalation);
router.post('/reminders/run',      ctrl.runReminders);
router.get('/:phone',              ctrl.getThread);
router.post('/:phone/reply',       ctrl.replyToThread);

export default router;
