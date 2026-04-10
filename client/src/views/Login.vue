<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4 relative overflow-hidden">
    <!-- Decorative glows -->
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
        <h1 class="text-2xl font-bold text-white">Welcome Back</h1>
      </div>

      <!-- Session-expired banner -->
      <div
        v-if="sessionExpired"
        role="alert"
        class="mb-5 flex items-start gap-2 bg-blue-900/30 border border-blue-500/40 rounded-xl px-4 py-3 text-sm text-blue-200"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Your session has expired. Please sign in again.
      </div>

      <!-- Role toggle -->
      <div
        role="tablist"
        aria-label="Select account type"
        class="flex bg-gray-900/60 rounded-xl p-1 mb-6 border border-gray-700/40"
      >
        <button
          id="tab-client"
          role="tab"
          type="button"
          :aria-selected="selectedRole === 'client'"
          @click="selectedRole = 'client'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="selectedRole === 'client' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'"
        >
          Client
        </button>
        <button
          id="tab-lawyer"
          role="tab"
          type="button"
          :aria-selected="selectedRole === 'lawyer'"
          @click="selectedRole = 'lawyer'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="selectedRole === 'lawyer' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'"
        >
          Lawyer
        </button>
      </div>

      <!-- Dynamic subtitle -->
      <p class="text-sm text-center text-gray-400 mb-1 -mt-2">
        <span v-if="selectedRole === 'client'">Sign in to your Valiant Law account</span>
        <span v-else>Sign in to the Valiant Law lawyer console</span>
      </p>
      <p class="text-xs text-center text-gray-600 mb-5">Your account type is determined automatically.</p>

      <form @submit.prevent="handleLogin" class="space-y-5" novalidate aria-label="Sign in form">

        <!-- Email -->
        <div>
          <label for="login-email" class="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
          <input
            id="login-email"
            ref="emailInputRef"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full bg-gray-900/80 border rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
            :class="emailError ? 'border-red-500/60 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'"
            @blur="validateEmail"
            :aria-describedby="emailError ? 'login-email-error' : undefined"
            :aria-invalid="!!emailError"
          />
          <p v-if="emailError" id="login-email-error" class="mt-1.5 text-xs text-red-400" role="alert">{{ emailError }}</p>
        </div>

        <!-- Password -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label for="login-password" class="block text-sm font-medium text-gray-400">Password</label>
            <router-link
              to="/forgot-password"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </router-link>
          </div>
          <div class="relative">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              class="w-full bg-gray-900/80 border border-gray-600 rounded-lg p-3 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
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
        </div>

        <!-- Remember Me -->
        <div class="flex items-center gap-2.5">
          <input
            id="remember-me"
            v-model="rememberMe"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer"
          />
          <label for="remember-me" class="text-sm text-gray-400 cursor-pointer select-none">
            Remember me on this device
          </label>
        </div>

        <!-- Rate-limit lockout banner -->
        <div
          v-if="rateLimitLocked"
          role="alert"
          class="flex items-center gap-2 bg-amber-900/30 border border-amber-600/40 rounded-xl px-4 py-3 text-sm text-amber-200"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Too many attempts. Please try again in
          <strong class="tabular-nums">{{ lockoutCountdown }}s</strong>
        </div>

        <!-- Auth error banner -->
        <div
          v-if="errorMessage"
          role="alert"
          aria-live="assertive"
          class="text-red-400 text-sm text-center bg-red-900/10 border border-red-500/20 rounded-lg py-2 px-3"
        >
          {{ errorMessage }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading || rateLimitLocked"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
          aria-label="Sign in to your account"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>{{ isLoading ? 'Signing in…' : rateLimitLocked ? `Locked (${lockoutCountdown}s)` : 'Sign In' }}</span>
        </button>
      </form>

      <!-- Footer links -->
      <div v-if="selectedRole === 'client'" class="mt-6 text-center text-sm text-gray-500">
        Don't have an account?
        <router-link to="/register" class="text-blue-400 hover:text-blue-300 ml-1 font-medium transition-colors">Get Started</router-link>
      </div>
      <div v-else class="mt-6 text-center text-sm text-gray-600">
        Need access? Contact your Valiant Law administrator.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';

// ── Meta: noindex for login page ─────────────────────────────────────────────
onMounted(() => {
  document.title = 'Sign In — Valiant Law';

  // noindex: login page should not be indexed by search engines
  let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!metaRobots) {
    metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    document.head.appendChild(metaRobots);
  }
  metaRobots.content = 'noindex, nofollow';

  // Meta description for link-preview context (Slack, Teams, email)
  let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = 'Sign in to your secure Valiant Law client portal to manage your estate planning and legal documents.';

  // Session-expired detection
  if (route.query.expired === '1') {
    sessionExpired.value = true;
    router.replace({ query: {} }); // Clean the URL
  }
});

onUnmounted(() => {
  // Reset robots meta when navigating away
  const metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (metaRobots) metaRobots.content = 'index, follow';
  clearLockout();
});

// ── Stores / router ──────────────────────────────────────────────────────────

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();
const { showToast } = useToast();

// ── Reactive state ───────────────────────────────────────────────────────────

const selectedRole   = ref<'client' | 'lawyer'>('client');
const email          = ref('');
const password       = ref('');
const isLoading      = ref(false);
const errorMessage   = ref('');
const showPassword   = ref(false);
const rememberMe     = ref(false);        // Q3 decision: unchecked by default
const sessionExpired = ref(false);
const emailInputRef  = ref<HTMLInputElement | null>(null);

// ── Rate-limit lockout ───────────────────────────────────────────────────────

const rateLimitLocked    = ref(false);
const lockoutCountdown   = ref(0);
let lockoutInterval: ReturnType<typeof setInterval> | null = null;

function startLockout(seconds = 60) {
  rateLimitLocked.value  = true;
  lockoutCountdown.value = seconds;
  lockoutInterval = setInterval(() => {
    lockoutCountdown.value--;
    if (lockoutCountdown.value <= 0) clearLockout();
  }, 1000);
}

function clearLockout() {
  rateLimitLocked.value = false;
  lockoutCountdown.value = 0;
  if (lockoutInterval) {
    clearInterval(lockoutInterval);
    lockoutInterval = null;
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const emailError = ref('');
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.value.trim();
  // Bug 7 fix: reject empty email early instead of wasting a server round-trip
  if (!trimmed) {
    emailError.value = 'Email address is required.';
  } else if (!emailRegex.test(trimmed)) {
    emailError.value = 'Please enter a valid email address.';
  } else {
    emailError.value = '';
  }
};

// ── Submit ───────────────────────────────────────────────────────────────────

const handleLogin = async () => {
  // Bug 8 fix: prevent double-click from firing parallel API calls
  if (isLoading.value || rateLimitLocked.value) return;

  validateEmail();
  if (emailError.value) return;

  isLoading.value   = true;
  errorMessage.value = '';

  try {
    // Bug 6 fix: trim + lowercase email to avoid mismatches from copy-paste whitespace
    await authStore.login(
      { email: email.value.trim().toLowerCase(), password: password.value },
      rememberMe.value   // persistent = rememberMe
    );

    // Role-mismatch info toast
    const actuallyLawyer = authStore.isLawyer;
    if (selectedRole.value === 'lawyer' && !actuallyLawyer) {
      showToast('You signed in as a client. Redirecting to client dashboard.', 'info');
    } else if (selectedRole.value === 'client' && actuallyLawyer) {
      showToast('Lawyer account detected. Redirecting to lawyer console.', 'info');
    }

    // Bug 2 fix: consume stored redirect intent with open-redirect hardening.
    // Only allow paths that start with a single '/' (no protocol-relative '//evil.com')
    const intendedPath = localStorage.getItem('redirectAfterLogin');
    localStorage.removeItem('redirectAfterLogin'); // always clean up
    if (intendedPath && intendedPath.startsWith('/') && !intendedPath.startsWith('//')) {
      router.push(intendedPath);
      return;
    }

    // Role-based default redirect
    router.push(authStore.isLawyer ? '/lawyer' : '/dashboard');

  } catch (error: any) {
    const status = error.response?.status;
    const msg    = error.response?.data?.message || 'Invalid email or password.';

    if (status === 429) {
      // Rate-limited: parse retry-after header if available
      const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '60', 10);
      startLockout(retryAfter);
      errorMessage.value = '';
    } else if (status >= 500 || !error.response) {
      showToast('Unable to connect. Please try again.', 'error');
    } else {
      errorMessage.value = msg;
      // Move focus to email field for immediate correction
      emailInputRef.value?.focus();
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
