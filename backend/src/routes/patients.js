import { Router } from 'express';
import * as ctrl from '../controllers/patientsController.js';
import * as notesCtrl from '../controllers/notesController.js';
import { requireAuth } from '../middleware/auth.js';
import { attachDbContext } from '../middleware/dbContext.js';

const router = Router();
router.use(requireAuth, attachDbContext);

router.get('/',          ctrl.list);
router.post('/',         ctrl.create);
router.get('/:id',       ctrl.get);
router.patch('/:id',     ctrl.update);
router.delete('/:id',    ctrl.remove);

// Nested: notes for a patient
router.get('/:patientId/notes', notesCtrl.listForPatient);

export default router;
