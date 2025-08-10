import config from "../config/config";
import { generateToken, ms } from "./tokens";

export function generateEmailToken() {
    return generateToken({ ttlMs: ms.hours(config.EMAIL.VERIFY_TTL_HOURS) });
}
