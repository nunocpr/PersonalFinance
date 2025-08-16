import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import * as ctrl from "../controllers/category.controller";

const router = Router();

router.use(authenticate);

router.get("/tree", ctrl.list);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.patch("/:id/move", ctrl.move);
router.patch("/reorder", ctrl.reorderSiblings);
router.delete("/:id", ctrl.archive);
router.delete("/:id/hard", ctrl.hardDelete);

export default router;
