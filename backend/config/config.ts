import dotenv from 'dotenv';

dotenv.config();

interface Config {
    PORT: number;
    DB: {
        USER: string;
        HOST: string;
        NAME: string;
        PASSWORD: string;
        PORT: number;
    };
    APP_URL: string;
    FRONTEND_URL: string;
    EMAIL: {
        FROM: string;
        SMTP_HOST: string;
        SMTP_PORT: number;
        SMTP_USER: string;
        SMTP_PASS: string;
        VERIFY_TTL_HOURS: number;
    };
    PASSWORD_RESET_TTL_MINUTES: number;
}

const config: Config = {
    PORT: Number(process.env.PORT) || 3000,
    DB: {
        USER: process.env.DB_USER || 'postgres',
        HOST: process.env.DB_HOST || 'localhost',
        NAME: process.env.DB_NAME || 'finance_db',
        PASSWORD: process.env.DB_PASSWORD || '',
        PORT: Number(process.env.DB_PORT) || 5432,
    },
    APP_URL: process.env.APP_URL || "https://localhost:3000",
    FRONTEND_URL: process.env.FRONTEND_URL || "https://localhost:5173",
    EMAIL: {
        FROM: process.env.EMAIL_FROM || "no-reply@example.com",
        SMTP_HOST: process.env.SMTP_HOST || "",
        SMTP_PORT: Number(process.env.SMTP_PORT || 587),
        SMTP_USER: process.env.SMTP_USER || "",
        SMTP_PASS: process.env.SMTP_PASS || "",
        VERIFY_TTL_HOURS: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24),
    },
    PASSWORD_RESET_TTL_MINUTES: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30),
};

export default config;
