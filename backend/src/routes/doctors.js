import { Router } from 'express';
import * as ctrl from '../controllers/doctorsController.js';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../config/db.js';

const router = Router();

// Public: list of doctors is needed by the public website-booking page
router.get('/public', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, specialty FROM doctors ORDER BY name ASC'
  );
  res.json(rows);
});

router.use(requireAuth);

router.get('/',       ctrl.list);
router.post('/',      ctrl.create);
router.get('/:id',    ctrl.get);
router.patch('/:id',  ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
