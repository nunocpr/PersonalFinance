// backend/routes/accounts.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import * as ctrl from "../controllers/accounts.controller";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.listAccounts);
router.get("/:id", ctrl.getAccount);
router.post("/", ctrl.createAccount);
router.put("/:id", ctrl.updateAccount);
router.delete("/:id", ctrl.removeAccount);
router.get("/:id/current-balance", ctrl.getBalance);

export default router;
