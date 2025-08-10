import { Router } from 'express';
import {
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    removeAccount,
    getBalance
} from '../controllers/accounts.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Apply authentication to all account routes
router.use(authenticate);

router.get('/', authenticate, listAccounts);
router.get('/:id', authenticate, getAccount);
router.post('/', authenticate, createAccount);
router.put('/:id', authenticate, updateAccount);
router.delete('/:id', authenticate, removeAccount);
router.get('/:id/balance', authenticate, getBalance);

export default router;