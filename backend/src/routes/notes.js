import { Router } from 'express';
import * as ctrl from '../controllers/notesController.js';
import { requireAuth } from '../middleware/auth.js';
import { attachDbContext } from '../middleware/dbContext.js';

const router = Router();
router.use(requireAuth, attachDbContext);

router.post('/',       ctrl.create);
router.delete('/:id',  ctrl.remove);

export default router;
