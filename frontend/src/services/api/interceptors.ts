import client from './client';

export function installInterceptors() {
    // Request interceptor
    client.interceptors.request.use(config => {
        const token = localStorage.getItem('pf_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // optional: handle 401s
    client.interceptors.response.use(
        r => r,
        e => {
            const s = e?.response?.status;
            if (s === 401 || s === 403) location.href = "/auth/login";
            return Promise.reject(e);
        }
    );

}