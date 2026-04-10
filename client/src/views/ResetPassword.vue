<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4 relative overflow-hidden">
    <div aria-hidden="true" class="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[80px] pointer-events-none" />
    <div aria-hidden="true" class="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none" />

    <div class="max-w-md w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700/60 animate-slide-up">

      <!-- Branding -->
      <div class="flex flex-col items-center mb-6">
        <div aria-hidden="true" class="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-blue-400/80 uppercase tracking-widest mb-1">Valiant Law</p>
        <h1 class="text-2xl font-bold text-white">Set New Password</h1>
      </div>

      <!-- Invalid / expired token state -->
      <div v-if="tokenError" role="alert" class="flex flex-col items-center gap-3 py-6 text-center">
        <div class="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
          <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-white font-semibold text-lg">Link Invalid or Expired</h2>
        <p class="text-gray-400 text-sm max-w-xs">This reset link has expired or already been used. Please request a new one.</p>
        <router-link to="/forgot-password" class="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
          Request New Link
        </router-link>
      </div>

      <!-- Success state -->
      <div v-else-if="success" role="status" class="flex flex-col items-center gap-3 py-6 text-center">
        <div class="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
          <svg class="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-white font-semibold text-lg">Password Updated!</h2>
        <p class="text-gray-400 text-sm max-w-xs">Your password has been changed. You can now sign in with your new password.</p>
        <router-link to="/login" class="mt-4 inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
          Sign In
        </router-link>
      </div>

      <!-- Reset form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5" novalidate aria-label="Reset password form">

        <!-- New password -->
        <div>
          <label for="reset-password" class="block text-sm font-medium text-gray-400 mb-2">New Password</label>
          <div class="relative">
            <input
              id="reset-password"
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              placeholder="••••••••"
              class="w-full bg-gray-900/80 border border-gray-600 rounded-lg p-3 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              :aria-describedby="'reset-password-rules'"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>

          <!-- Password strength bar -->
          <div id="reset-password-rules" v-if="newPassword" class="mt-2 space-y-1.5">
            <div class="flex gap-1 h-1">
              <div
                v-for="i in 4"
                :key="i"
                class="flex-1 rounded-full transition-all duration-300"
                :class="strength.score >= i ? strength.barColor : 'bg-gray-700'"
              />
            </div>
            <p class="text-xs" :class="strength.color">{{ strength.label }}</p>
            <ul class="text-xs text-gray-500 space-y-0.5 mt-1">
              <li :class="strength.rules.minLength    ? 'text-green-400' : ''">{{ strength.rules.minLength    ? '✓' : '·' }} At least 8 characters</li>
              <li :class="strength.rules.hasUppercase ? 'text-green-400' : ''">{{ strength.rules.hasUppercase ? '✓' : '·' }} Uppercase letter</li>
              <li :class="strength.rules.hasLowercase ? 'text-green-400' : ''">{{ strength.rules.hasLowercase ? '✓' : '·' }} Lowercase letter</li>
              <li :class="strength.rules.hasNumber    ? 'text-green-400' : ''">{{ strength.rules.hasNumber    ? '✓' : '·' }} Number</li>
              <li :class="strength.rules.hasSpecial   ? 'text-green-400' : ''">{{ strength.rules.hasSpecial   ? '✓' : '·' }} Special character (!@#$…)</li>
            </ul>
          </div>
        </div>

        <!-- Confirm password -->
        <div>
          <label for="reset-confirm" class="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
          <input
            id="reset-confirm"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            placeholder="••••••••"
            class="w-full bg-gray-900/80 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p v-if="confirmError" class="mt-1.5 text-xs text-red-400" role="alert">{{ confirmError }}</p>
        </div>

        <div v-if="errorMessage" role="alert" aria-live="assertive" class="text-red-400 text-sm text-center bg-red-900/10 border border-red-500/20 rounded-lg py-2 px-3">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading || !strength.meetsPolicy"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          aria-label="Set new password"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>{{ isLoading ? 'Updating…' : 'Set New Password' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePasswordStrength } from '../composables/usePasswordStrength';
import { useToast } from '../composables/useToast';
import api from '../api';

onMounted(() => {
  document.title = 'Reset Password — Valiant Law';
  // Validate token exists in route params on load
  if (!route.params.token) {
    tokenError.value = true;
  }
});

const route  = useRoute();
const router = useRouter();
const { showToast } = useToast();

const newPassword     = ref('');
const confirmPassword = ref('');
const confirmError    = ref('');
const showPassword    = ref(false);
const isLoading       = ref(false);
const errorMessage    = ref('');
const success         = ref(false);
const tokenError      = ref(false);

const { strength } = usePasswordStrength(newPassword);

const handleSubmit = async () => {
  confirmError.value   = '';
  errorMessage.value   = '';

  if (!strength.value.meetsPolicy) {
    errorMessage.value = 'Please ensure your password meets all requirements.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    confirmError.value = 'Passwords do not match.';
    return;
  }

  isLoading.value = true;

  try {
    await api.post('/auth/reset-password', {
      token:       route.params.token as string,
      newPassword: newPassword.value,
    });
    success.value = true;
    showToast('Password updated! You can now sign in with your new password.', 'success');
    // Redirect to login after a brief pause so the user can see the success state
    setTimeout(() => router.push('/login'), 2000);
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 400) {
      // Invalid or expired token, or policy failure
      const msg = error.response?.data?.message || '';
      if (msg.includes('invalid') || msg.includes('expired')) {
        tokenError.value = true;
      } else {
        errorMessage.value = msg || 'Password does not meet requirements.';
      }
    } else {
      errorMessage.value = 'Unable to connect. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.5s ease-out forwards;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
