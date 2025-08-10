import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:3000/api',
    withCredentials: false,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;