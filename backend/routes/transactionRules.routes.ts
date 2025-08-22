// src/routes/transactionRules.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import * as ctrl from "../controllers/transactionRules.controller";

const r = Router();
r.use(authenticate);

r.get("/", ctrl.list);
r.post("/", ctrl.create);
r.put("/:id", ctrl.update);
r.delete("/:id", ctrl.remove);
r.post("/reorder", ctrl.reorder);

export default r;
