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
        (res) => res,
        (err) => {
            if (err?.response?.status === 401) {
                localStorage.removeItem("pf_token");
                // optional redirect:
                // window.location.href = "/login";
            }
            return Promise.reject(err);
        }
    );
}