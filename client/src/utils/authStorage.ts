export const getStoredToken = (): string | null =>
    sessionStorage.getItem('token') || localStorage.getItem('token');

export const getStoredRefreshToken = (): string | null =>
    sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

export const hasStoredToken = (): boolean => !!getStoredToken();
