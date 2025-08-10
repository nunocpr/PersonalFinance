// types/express/index.d.ts or types/authenticated-request.d.ts
import { Request } from "express";
import { User } from "../../express"; // adjust import path

export interface AuthenticatedRequest extends Request {
    user: Pick<User, "user_id" | "user_email">;
}
