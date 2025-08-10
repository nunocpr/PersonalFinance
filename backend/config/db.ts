import { Pool } from 'pg';
import config from './config';

const pool = new Pool({
    user: config.DB.USER,
    host: config.DB.HOST,
    database: config.DB.NAME,
    password: config.DB.PASSWORD,
    port: config.DB.PORT,
});

// Test connection
pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('Database connection failed', err.stack);
    } else {
        console.log('Connected to database at', config.DB.HOST);
    }
});

export default pool;