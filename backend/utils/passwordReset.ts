import config from "../config/config";
import { generateToken, ms } from "./tokens";

export function generateResetToken() {
    return generateToken({ ttlMs: ms.minutes(config.PASSWORD_RESET_TTL_MINUTES) });
}
