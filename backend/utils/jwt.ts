import jwt, { SignOptions } from "jsonwebtoken";

export type JwtPayload = { userPublicId: string; v: number };

// Derive the correct "expiresIn" type from SignOptions
type ExpiresIn = SignOptions["expiresIn"];

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

const ACCESS_TTL: ExpiresIn = (process.env.ACCESS_TOKEN_TTL ?? "15m") as ExpiresIn;
const REFRESH_TTL: ExpiresIn = (process.env.REFRESH_TOKEN_TTL ?? "7d") as ExpiresIn;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error("JWT secrets missing. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env");
}

function signToken(payload: object, secret: string, expiresIn: ExpiresIn) {
    const opts: SignOptions = { expiresIn };
    return jwt.sign(payload, secret, opts);
}

export function signAccess(p: JwtPayload) {
    return signToken(p, ACCESS_SECRET, ACCESS_TTL);
}
export function signRefresh(p: JwtPayload) {
    return signToken(p, REFRESH_SECRET, REFRESH_TTL);
}

export function verifyAccess(token: string): JwtPayload {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}
export function verifyRefresh(token: string): JwtPayload {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
