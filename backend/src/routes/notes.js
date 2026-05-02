import { Router } from 'express';
import * as ctrl from '../controllers/notesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/',       ctrl.create);
router.delete('/:id',  ctrl.remove);

export default router;
