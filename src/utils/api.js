export const API_BASE =
    process.env.NODE_ENV === "production"
        ? process.env.REACT_APP_API
        : "http://localhost:4003";


export const EMP_PROFILE_FILE_BASE =
    process.env.NODE_ENV === "production"
        ? process.env.REACT_APP_EMP_PROFILE_FILE
        : "http://localhost:4003";

export async function apiFetch(endpoint, options = {}) {
    return fetch(`${API_BASE}${endpoint}`, {
        credentials: "include",
        ...options,
    });
}
