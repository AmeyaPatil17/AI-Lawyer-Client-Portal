<template>
  <div class="min-h-screen bg-gray-900 text-white p-6 md:p-12 font-sans relative overflow-hidden flex flex-col justify-center">
    <!-- Dynamic Background -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div class="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[80px]"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[80px]"></div>
    </div>

    <div class="max-w-2xl mx-auto w-full">

      <!-- T2: Valiant Law branding -->
      <header class="mb-10 text-center">
        <div class="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-widest">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          Valiant Law
        </div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 mb-4">
          Wills &amp; Estate Planning
        </h1>
        <p class="text-gray-400 text-lg font-light">A few quick questions to help us tailor our services to your needs.</p>
      </header>

      <div class="space-y-8">

        <!-- Question 1: Residency -->
        <section
          class="bg-gray-800/40 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-blue-500/30 transition-colors group"
          role="group"
          aria-labelledby="q1-label"
        >
          <label id="q1-label" class="block text-xl font-medium mb-6 text-gray-100 group-hover:text-blue-200 transition-colors">
            Do you currently reside in Ontario?
          </label>
          <div class="flex gap-4">
            <button
              @click="setResidency(true)"
              :aria-pressed="triageStore.triageData.ontarioResidency === true"
              class="flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 border backdrop-blur-sm"
              :class="triageStore.triageData.ontarioResidency === true
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
                : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'"
            >Yes</button>
            <button
              @click="setResidency(false)"
              :aria-pressed="triageStore.triageData.ontarioResidency === false"
              class="flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 border backdrop-blur-sm"
              :class="triageStore.triageData.ontarioResidency === false
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
                : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'"
            >No</button>
          </div>
        </section>

        <!-- T9: Non-Ontario blocker -->
        <transition name="slide-up">
          <div
            v-if="triageStore.triageData.ontarioResidency === false"
            class="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6 text-center"
          >
            <svg class="w-8 h-8 text-amber-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
            <h3 class="text-amber-300 font-semibold mb-2">Not Available in Your Jurisdiction</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Our estate planning service currently covers Ontario residents only. Please <a href="https://valiantlaw.ca" target="_blank" class="text-blue-400 hover:text-blue-300 underline">contact Valiant Law</a> directly for assistance in other provinces.</p>
          </div>
        </transition>

        <!-- Question 2: Marital Status -->
        <transition name="slide-up">
          <section
            v-if="triageStore.triageData.ontarioResidency === true"
            class="bg-gray-800/40 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-colors group"
            aria-labelledby="q2-label"
          >
            <label id="q2-label" class="block text-xl font-medium mb-6 text-gray-100 group-hover:text-purple-200 transition-colors">
              What is your marital status?
            </label>
            <div class="relative">
              <select
                v-model="maritalStatus"
                class="w-full text-lg py-3 pl-4 pr-10 appearance-none bg-gray-900/80 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer hover:border-purple-500/50 transition-colors focus:ring-2 focus:ring-purple-500/20"
              >
                <option disabled value="">Select an option...</option>
                <option value="single">Single (Never Married)</option>
                <option value="married">Married</option>
                <option value="commonLaw">Common Law</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </section>
        </transition>

        <!-- Question 3: Minors -->
        <transition name="slide-up">
          <section
            v-if="maritalStatus"
            class="bg-gray-800/40 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-indigo-500/30 transition-colors group"
            role="group"
            aria-labelledby="q3-label"
          >
            <label id="q3-label" class="block text-xl font-medium mb-6 text-gray-100 group-hover:text-indigo-200 transition-colors">
              Do you have any children under 18?
            </label>
            <div class="flex gap-4">
              <button
                @click="setMinors(true)"
                :aria-pressed="triageStore.triageData.hasMinors === true"
                class="flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 border backdrop-blur-sm"
                :class="triageStore.triageData.hasMinors === true
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
                  : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'"
              >Yes</button>
              <button
                @click="setMinors(false)"
                :aria-pressed="triageStore.triageData.hasMinors === false"
                class="flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 border backdrop-blur-sm"
                :class="triageStore.triageData.hasMinors === false
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
                  : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'"
              >No</button>
            </div>
          </section>
        </transition>

        <!-- Submit Container -->
        <transition name="fade-scale">
          <div
            v-if="isComplete"
            class="bg-gray-800/60 backdrop-blur-xl border border-gray-700/60 border-t-4 border-t-purple-500 rounded-2xl p-8 shadow-2xl mt-12 text-center"
          >
            <h2 class="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Ready to Begin
            </h2>
            <p class="text-sm text-gray-400 mb-6 leading-relaxed">
              Your profile is ready to be built. Click below to continue to the wizard.
            </p>

            <button
              @click="handleSubmit"
              :disabled="isSubmitting"
              class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 text-lg rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="isSubmitting" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>{{ isSubmitting ? 'Starting Intake…' : 'Begin Intake' }}</span>
              <svg v-if="!isSubmitting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>
            
            <p v-if="errorMessage" class="text-red-400 text-sm text-center bg-red-900/20 py-2.5 px-3 rounded-lg border border-red-500/20 mt-4">
              {{ errorMessage }}
            </p>
          </div>
        </transition>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTriageStore } from '../stores/triage';
import { useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';
import type { AxiosError } from 'axios';

const triageStore = useTriageStore();
const router = useRouter();
const { showToast } = useToast();  // T3

const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');

// Store action wrappers
const setResidency = (val: boolean) => triageStore.setTriageAnswer('ontarioResidency', val);
const setMinors = (val: boolean) => triageStore.setTriageAnswer('hasMinors', val);

// Two-way computed for marital status
const maritalStatus = computed({
    get: () => triageStore.triageData.maritalStatus,
    set: (val: string) => triageStore.setTriageAnswer('maritalStatus', val)
});

// Show registration form when all 3 questions answered
const isComplete = computed((): boolean =>
    triageStore.triageData.ontarioResidency === true &&
    triageStore.triageData.maritalStatus !== '' &&
    triageStore.triageData.hasMinors !== null
);

const handleSubmit = async () => {
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        await triageStore.submitTriage();
        router.push('/wizard/profile');
    } catch (error: unknown) {
        const err = error as AxiosError<{ message: string }>;
        const msg = err.response?.data?.message || 'Failed to start intake. Please try again.';

        if ((err.response?.status ?? 0) >= 500 || !err.response) {
            showToast('Unable to connect. Please try again.', 'error');
        } else {
            errorMessage.value = msg;
        }
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}
</style>
