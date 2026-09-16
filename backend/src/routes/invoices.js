import { Router } from 'express';
import * as ctrl from '../controllers/invoicesController.js';
import { requireAuth } from '../middleware/auth.js';
import { attachDbContext } from '../middleware/dbContext.js';

const router = Router();
router.use(requireAuth, attachDbContext);

router.get('/',             ctrl.list);
router.post('/',            ctrl.create);
router.get('/:id',          ctrl.get);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id',       ctrl.remove);

export default router;
