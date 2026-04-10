<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4 relative overflow-hidden">
    <!-- Subtle background glow -->
    <div aria-hidden="true" class="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[80px] pointer-events-none"></div>
    <div aria-hidden="true" class="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none"></div>

    <div class="max-w-md w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700/60 animate-slide-up">

      <!-- Valiant Law branding -->
      <div class="flex flex-col items-center mb-6">
        <div aria-hidden="true" class="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-blue-400/80 uppercase tracking-widest mb-1">Valiant Law</p>
        <h1 class="text-2xl font-bold text-white">Create an Account</h1>
      </div>

      <p class="text-sm text-center text-gray-400 mb-8">
        Set up your secure client portal account
      </p>

      <form @submit.prevent="handleRegister" class="space-y-5" novalidate aria-label="Create account form">

        <!-- Email field -->
        <div>
          <label for="register-email" class="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
          <input
            id="register-email"
            ref="emailInputRef"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="w-full bg-gray-900/80 border rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
            :class="emailError ? 'border-red-500/60 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'"
            @blur="validateEmail"
            :aria-describedby="emailError ? 'register-email-error' : undefined"
            :aria-invalid="!!emailError"
          />
          <p v-if="emailError" id="register-email-error" class="mt-1.5 text-xs text-red-400" role="alert">{{ emailError }}</p>
        </div>

        <!-- Password field -->
        <div>
          <label for="register-password" class="block text-sm font-medium text-gray-400 mb-2">Password</label>
          <div class="relative">
            <input
              id="register-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              minlength="8"
              placeholder="•••••••• (min. 8 characters)"
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
          <!-- Password strength bar -->
          <div v-if="password" class="mt-2 space-y-1.5">
            <div class="flex gap-1 h-1">
              <div
                v-for="i in 4"
                :key="i"
                class="flex-1 rounded-full transition-all duration-300"
                :class="strength.score >= i ? strength.barColor : 'bg-gray-700'"
              />
            </div>
            <p class="text-xs" :class="strength.color">{{ strength.label }}</p>
          </div>
        </div>

        <!-- Bug 3 fix: Confirm password field (matches ResetPassword.vue pattern) -->
        <div>
          <label for="register-confirm-password" class="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
          <input
            id="register-confirm-password"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            placeholder="••••••••"
            class="w-full bg-gray-900/80 border rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
            :class="confirmError ? 'border-red-500/60 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'"
            :aria-describedby="confirmError ? 'register-confirm-error' : undefined"
            :aria-invalid="!!confirmError"
          />
          <p v-if="confirmError" id="register-confirm-error" class="mt-1.5 text-xs text-red-400" role="alert">{{ confirmError }}</p>
        </div>

        <!-- Bug 4 fix: Rate-limit lockout banner (same pattern as Login.vue) -->
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

        <!-- Inline error -->
        <div
          v-if="errorMessage"
          role="alert"
          aria-live="assertive"
          class="text-red-400 text-sm text-center bg-red-900/10 border border-red-500/20 rounded-lg py-2 px-3"
        >
          {{ errorMessage }}
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="isLoading || rateLimitLocked"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
          aria-label="Create your account"
        >
          <svg
            v-if="isLoading"
            class="w-4 h-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>{{ isLoading ? 'Creating Account…' : rateLimitLocked ? `Locked (${lockoutCountdown}s)` : 'Sign Up' }}</span>
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-500">
        Already have an account?
        <router-link to="/login" class="text-blue-400 hover:text-blue-300 ml-1 font-medium transition-colors">Sign in</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { usePasswordStrength } from '../composables/usePasswordStrength';
import api from '../api';

const router = useRouter();
const authStore = useAuthStore();
const { showToast } = useToast();

// ── Bug 5 fix: Meta tags (matching Login.vue, ForgotPassword.vue, ResetPassword.vue) ──
onMounted(() => {
  document.title = 'Create Account — Valiant Law';

  // noindex: register page should not be indexed for a private portal
  let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!metaRobots) {
    metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    document.head.appendChild(metaRobots);
  }
  metaRobots.content = 'noindex, nofollow';

  let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = 'Create your secure Valiant Law client portal account to begin your estate planning or business incorporation.';
});

onUnmounted(() => {
  const metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (metaRobots) metaRobots.content = 'index, follow';
  clearLockout();
});

// ── Reactive state ───────────────────────────────────────────────────────────

const email           = ref('');
const password        = ref('');
const confirmPassword = ref('');       // Bug 3 fix: confirm password field
const showPassword    = ref(false);
const isLoading       = ref(false);
const errorMessage    = ref('');
const emailError      = ref('');
const confirmError    = ref('');       // Bug 3 fix: confirm mismatch error
const emailInputRef   = ref<HTMLInputElement | null>(null);

const { strength } = usePasswordStrength(password);

// ── Bug 4 fix: Rate-limit lockout (matching Login.vue) ───────────────────────

const rateLimitLocked  = ref(false);
const lockoutCountdown = ref(0);
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

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.value.trim();
  // Bug 7 fix: reject empty email early
  if (!trimmed) {
    emailError.value = 'Email address is required.';
  } else if (!emailRegex.test(trimmed)) {
    emailError.value = 'Please enter a valid email address.';
  } else {
    emailError.value = '';
  }
};

// ── Submit ───────────────────────────────────────────────────────────────────

const handleRegister = async () => {
  // Bug 8 fix: prevent double-click from firing parallel API calls
  if (isLoading.value || rateLimitLocked.value) return;

  validateEmail();
  if (emailError.value) return;

  // Password strength policy gate
  if (!strength.value.meetsPolicy) {
    errorMessage.value = 'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.';
    return;
  }

  // Bug 3 fix: confirm password mismatch check
  confirmError.value = '';
  if (password.value !== confirmPassword.value) {
    confirmError.value = 'Passwords do not match.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    // 1. Register the user (Bug 6 fix: trim+lowercase email)
    await api.post('/auth/register', {
      email: email.value.trim().toLowerCase(),
      password: password.value,
    });
    
    // 2. Automatically log them in with the new credentials
    await authStore.login({
      email: email.value.trim().toLowerCase(),
      password: password.value,
    });
    
    // 3. Redirect to the Home hub where they can choose a service
    router.push('/');
    showToast('Account created successfully.', 'success');
  } catch (error: any) {
    const status = error.response?.status;

    if (!error.response) {
      showToast('Unable to connect. Please try again later.', 'error');
    } else if (status === 429) {
      // Bug 4 fix: rate-limit lockout with countdown
      const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '60', 10);
      startLockout(retryAfter);
      errorMessage.value = '';
    } else {
      errorMessage.value = error.response.data?.message || 'Registration failed. Please try again.';
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
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
