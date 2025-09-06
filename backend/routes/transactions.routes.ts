// routes/transactions.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import * as ctrl from "../controllers/transactions.controller";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/group-by-category", ctrl.groupByCategory);

router.post("/transfers", ctrl.createTransfer);
router.get("/transfers", ctrl.listTransfers);
router.delete("/transfers/:transferId", ctrl.removeTransfer);
router.post("/transfers/convert", ctrl.convertToTransfer);

export default router;
