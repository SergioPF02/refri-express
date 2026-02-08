import { API_URL } from '../config';
import { Preferences } from '@capacitor/preferences';

const getHeaders = async (isMultipart = false): Promise<HeadersInit> => {
    const headers: Record<string, string> = {};
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    const { value } = await Preferences.get({ key: 'refri_user' });
    if (value) {
        const user = JSON.parse(value);
        if (user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
    }
    return headers;
};

const handleErrors = async (res: Response) => {
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        const error: any = new Error(data.error || `Error ${res.status}`);
        error.status = res.status;
        throw error;
    } catch (e: any) {
        if (e.status) throw e;
        const error: any = new Error(text || `Error ${res.status}`);
        error.status = res.status;
        throw error;
    }
};

export const api = {
    get: async (endpoint: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}${endpoint}`, { headers });
        if (!res.ok) await handleErrors(res);
        return res.json();
    },
    post: async (endpoint: string, body: any) => {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (!res.ok) await handleErrors(res);
        return res.json();
    },
    put: async (endpoint: string, body: any) => {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });
        if (!res.ok) await handleErrors(res);
        return res.json();
    },
    delete: async (endpoint: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        if (!res.ok) await handleErrors(res);
        return res.json();
    },
    upload: async (endpoint: string, formData: FormData) => {
        const headers = await getHeaders(true); // IsMultipart=true prevents adding Content-Type: application/json
        // Fetch automatically sets Content-Type to multipart/form-data with boundary when body is FormData
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT', // Or POST depending on usage
            headers,
            body: formData
        });
        if (!res.ok) await handleErrors(res);
        return res.json();
    }
};
