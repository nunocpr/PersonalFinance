import { Router } from "express";
import * as ctrl from "../controllers/category.controller";
import { authenticate } from "../middlewares/auth";

const r = Router();
r.use(authenticate);

r.get("/", ctrl.listTree);
r.post("/", ctrl.create);
r.patch("/:id", ctrl.patch);       // rename/patch props
r.post("/:id/move", ctrl.move);    // move to new parent (or root, parentId=null)
r.post("/reorder", ctrl.reorder);  // reorder siblings
r.post("/:id/archive", ctrl.archive);
r.delete("/:id", ctrl.destroy);

export default r;
