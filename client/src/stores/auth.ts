import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';

// ============================================
// Storage helpers — abstract localStorage vs sessionStorage
// ============================================

type StorageType = 'local' | 'session';

function getStorage(type: StorageType): Storage {
    return type === 'session' ? sessionStorage : localStorage;
}

function hydrateFromStorage(key: string): string | null {
    // Check sessionStorage first (session-only login), fallback to localStorage
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

function clearFromBothStorages(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
}

// ============================================
// Store
// ============================================

export const useAuthStore = defineStore('auth', () => {
    const user     = ref<any>(JSON.parse(hydrateFromStorage('user') || 'null'));
    const token    = ref<string | null>(hydrateFromStorage('token'));
    const refreshToken = ref<string | null>(hydrateFromStorage('refreshToken'));

    const isAuthenticated = computed(() => !!token.value);
    const userRole        = computed(() => user.value?.role || null);
    const isLawyer        = computed(() => userRole.value === 'lawyer' || userRole.value === 'admin');

    /**
     * @param creds        email + password
     * @param persistent   true → localStorage (default); false → sessionStorage only
     */
    const login = async (creds: { email: string; password: string }, persistent = true) => {
        const response = await api.post('/auth/login', creds);
        setSession(response.data.token, response.data.refreshToken, response.data.user, persistent);
        return true;
    };

    const setSession = (
        newToken: string,
        newRefreshToken: string,
        newUser: any,
        persistent = true
    ) => {
        const storage = getStorage(persistent ? 'local' : 'session');

        token.value = newToken;
        if (newRefreshToken) refreshToken.value = newRefreshToken;
        user.value = newUser;

        storage.setItem('token', newToken);
        if (newRefreshToken) storage.setItem('refreshToken', newRefreshToken);
        storage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        token.value = null;
        refreshToken.value = null;
        user.value = null;
        clearFromBothStorages('token');
        clearFromBothStorages('refreshToken');
        clearFromBothStorages('user');
        clearFromBothStorages('intakeId');
        // Navigation handled by calling component
    };

    return {
        user,
        token,
        isAuthenticated,
        userRole,
        isLawyer,
        login,
        setSession,
        logout,
    };
});
