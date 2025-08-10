// routes/transactions.routes.ts
import { Router } from 'express';
import { getTransactions, createTransaction } from '../controllers/transactions.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, getTransactions);
router.post('/', authenticate, createTransaction);

export default router;