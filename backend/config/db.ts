import { Pool } from 'pg';
import config from './config';

const pool = new Pool({
    user: config.DB.USER,
    host: config.DB.HOST,
    database: config.DB.NAME,
    password: config.DB.PASSWORD,
    port: config.DB.PORT,
});

export default pool;