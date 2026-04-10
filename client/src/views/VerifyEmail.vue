<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 border-t-4 border-blue-500 p-4">
    <div class="max-w-md w-full glass-panel rounded-2xl p-8 relative overflow-hidden backdrop-blur-xl">
      <div class="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-indigo-900/10 opacity-50 z-0"></div>

      <div class="relative z-10 text-center">
        <h2 class="text-3xl font-bold text-white tracking-tight mb-2">Email Verification</h2>

        <div v-if="loading" class="mt-8 flex flex-col items-center justify-center text-gray-400">
          <div class="w-8 h-8 rounded-full border-2 border-t-blue-500 border-r-blue-500 border-b-blue-800 border-l-blue-800 animate-spin mb-4"></div>
          <p>Verifying your email address...</p>
        </div>

        <div v-else-if="success" class="mt-8 text-center text-green-400">
          <svg class="w-16 h-16 mx-auto mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-medium mb-6">Your email has been successfully verified.</p>
          <button type="button" class="btn-primary w-full shadow-lg shadow-blue-500/20" @click="goToLogin">
            Proceed to Login
          </button>
        </div>

        <div v-else class="mt-8 text-center text-red-400">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-medium mb-2">Verification Failed</p>
          <p class="text-sm text-red-200/80 mb-6">{{ errorMsg }}</p>
          <button type="button" class="btn-secondary w-full" @click="goToLogin">
            Return to Login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const success = ref(false);
const errorMsg = ref('');

const goToLogin = () => {
  router.push('/login');
};

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    loading.value = false;
    errorMsg.value = 'Invalid verification link. The token is missing.';
    return;
  }

  try {
    const { data } = await api.post('/auth/verify-email', { token });
    success.value = true;
    errorMsg.value = '';
  } catch (err: any) {
    success.value = false;
    errorMsg.value = err.response?.data?.message || 'The verification link has expired or is invalid.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.glass-panel {
  background: rgba(31, 41, 55, 0.7);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-lg transition-all border border-blue-500/50 shadow-md;
}

.btn-secondary {
  @apply bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all border border-gray-600;
}
</style>
