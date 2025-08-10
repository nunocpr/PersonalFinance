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
};

export default config;