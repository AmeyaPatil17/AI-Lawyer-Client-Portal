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
        <h1 class="text-2xl font-bold text-white">Forgot Password?</h1>
        <p class="text-sm text-gray-400 mt-2 text-center">Enter your email and we'll send you a reset link.</p>
      </div>

      <!-- Success state -->
      <div
        v-if="submitted"
        role="status"
        class="flex flex-col items-center gap-3 py-6 text-center"
      >
        <div class="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
          <svg class="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-white font-semibold text-lg">Check your inbox</h2>
        <p class="text-gray-400 text-sm max-w-xs">
          If an account exists for <strong class="text-white">{{ submittedEmail }}</strong>, you'll receive a password reset link within a few minutes.
        </p>
        <p class="text-gray-500 text-xs mt-1">Don't see it? Check your spam folder.</p>
        <router-link to="/login" class="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
          ← Back to Sign In
        </router-link>
      </div>

      <!-- Form state -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5" novalidate aria-label="Forgot password form">

        <div>
          <label for="forgot-email" class="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full bg-gray-900/80 border rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
            :class="emailError ? 'border-red-500/60 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'"
            @blur="validateEmail"
            :aria-describedby="emailError ? 'forgot-email-error' : undefined"
            :aria-invalid="!!emailError"
          />
          <p v-if="emailError" id="forgot-email-error" class="mt-1.5 text-xs text-red-400" role="alert">{{ emailError }}</p>
        </div>

        <div v-if="errorMessage" role="alert" aria-live="assertive" class="text-red-400 text-sm text-center bg-red-900/10 border border-red-500/20 rounded-lg py-2 px-3">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          aria-label="Send password reset link"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>{{ isLoading ? 'Sending…' : 'Send Reset Link' }}</span>
        </button>
      </form>

      <div v-if="!submitted" class="mt-6 text-center text-sm text-gray-500">
        Remembered it?
        <router-link to="/login" class="text-blue-400 hover:text-blue-300 ml-1 font-medium transition-colors">Sign In</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api';

onMounted(() => {
  document.title = 'Forgot Password — Valiant Law';
});

const email        = ref('');
const emailError   = ref('');
const isLoading    = ref(false);
const errorMessage = ref('');
const submitted    = ref(false);
const submittedEmail = ref('');

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailError.value = email.value && !emailRegex.test(email.value)
    ? 'Please enter a valid email address.'
    : '';
};

const handleSubmit = async () => {
  validateEmail();
  if (emailError.value || !email.value) return;

  isLoading.value    = true;
  errorMessage.value = '';

  try {
    await api.post('/auth/forgot-password', { email: email.value });
    submittedEmail.value = email.value;
    submitted.value = true;
  } catch (error: any) {
    if (!error.response) {
      errorMessage.value = 'Unable to connect. Please try again.';
    } else if (error.response.status === 429) {
      errorMessage.value = 'Too many attempts. Please try again later.';
    } else {
      // Show generic message even on server error (no user enumeration)
      submittedEmail.value = email.value;
      submitted.value = true;
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
