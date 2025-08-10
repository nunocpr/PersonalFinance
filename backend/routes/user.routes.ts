import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { updateMe, changeMyPassword } from "../controllers/user.controller";

const router = Router();
router.patch("/me", authenticate, updateMe);
router.post("/change-password", authenticate, changeMyPassword);

export default router;
