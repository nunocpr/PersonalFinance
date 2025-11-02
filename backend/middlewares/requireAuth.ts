// middlewares/requireAuth.ts
import { Router } from "express";
import { authenticate } from "./auth";
import { noStorePrivate } from "./cache";

export const requireAuth = Router();
requireAuth.use(authenticate, noStorePrivate);
