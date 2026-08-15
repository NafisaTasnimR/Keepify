export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');

    const hasBody = Object.prototype.hasOwnProperty.call(options, 'body') && options.body != null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const defaultHeaders = {};
    if (hasBody && !isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const headers = {
        ...defaultHeaders,
        ...(options.headers || {}),
    };

    const res = await fetch(path, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        try {
            localStorage.removeItem('token');
        } catch (e) {
            // ignore
        }
        window.location.href = '/';
    }

    return res;
}
