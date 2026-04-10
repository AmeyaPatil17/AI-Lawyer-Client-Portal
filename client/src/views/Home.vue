<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden">
    <div class="absolute inset-0 -z-10 pointer-events-none">
      <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-3xl"></div>
    </div>

    <main class="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col justify-center py-16">
      <div class="flex items-center justify-center gap-3 mb-12 animate-slide-up delay-75">
        <div class="h-px flex-1 bg-gray-800"></div>
        <div class="flex items-center gap-2 text-gray-500 text-sm font-medium">
          Trusted Counsel. Tech-Driven Results.
        </div>
        <div class="h-px flex-1 bg-gray-800"></div>
      </div>

      <div class="text-center animate-slide-up delay-100 mb-10">
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Valiant Law <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Client Portal</span>
        </h1>
        <p class="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed gap-2 mt-4">
          Our AI handles the data, but our lawyers handle the law. Submit your info here for an instant start, or visit us at our office to finalize your documents face-to-face. We're digital when you want speed, and personal when it matters most.
        </p>
      </div>

      <div
        v-if="isClientUser && matterStateError"
        id="home-matter-error"
        class="mb-8 rounded-2xl border border-amber-500/30 bg-amber-900/10 p-5 text-left animate-slide-up delay-200"
        role="alert"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-amber-300">We could not load your saved matters.</p>
            <p class="mt-1 text-sm text-gray-400">Retry to restore your Home service cards before starting a new intake.</p>
          </div>
          <button
            id="home-retry-btn"
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-400/10"
            @click="fetchMatterState"
          >
            Try Again
          </button>
        </div>
      </div>

      <div v-if="showClientServiceCards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up delay-200 mb-8">
        <router-link
          to="/login"
          class="glass-panel group p-7 rounded-2xl border border-gray-700/60 hover:border-sky-500/40 transition-all hover:bg-gray-800/60 text-left flex flex-col h-full"
        >
          <div class="flex items-start gap-4 flex-1">
            <div class="w-11 h-11 bg-sky-500/15 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
            </div>
            <div class="min-w-0 flex flex-col h-full">
              <h2 class="text-lg font-semibold text-white mb-1">Residential Real Estate</h2>
              <p class="text-gray-400 text-sm leading-relaxed flex-1">
                Seamless Closings. Provide your transaction details and property info to activate our real estate engine. Our AI coordinates the paperwork at lightning speed, while our firm's lawyers personally oversee every title search and transfer. Digital for the pace. In-person for the handshake.
              </p>
              <div class="mt-4 shrink-0">
                <span class="inline-flex items-center gap-1 text-sky-400 text-sm font-medium group-hover:gap-2 transition-all">
                  Begin intake
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </router-link>

        <div
          v-if="!incorpCard.disabled"
          data-testid="home-incorp-card"
          class="glass-panel group p-7 rounded-2xl border text-left flex flex-col h-full transition-all border-gray-700/60 hover:border-emerald-500/40 hover:bg-gray-800/60"
        >
          <div class="flex items-start gap-4 flex-1">
            <div class="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="min-w-0 flex flex-col h-full">
              <h2 class="text-lg font-semibold text-white mb-1">Business Incorporation</h2>
              <p class="text-gray-400 text-sm leading-relaxed flex-1">
                Structure Your Success. Provide your company details below to begin the incorporation process. We handle both Provincial (Ontario) and Federal filings, combining AI-driven efficiency with the accountability of a local legal team.
              </p>
              <div class="mt-4 shrink-0">
                <router-link
                  :to="incorpCard.to"
                  custom
                  v-slot="{ href }"
                >
                  <a
                    id="home-incorp-cta"
                    :href="href"
                    class="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium transition-all group-hover:gap-2"
                    @click="handlePrimaryCardClick($event, incorpCard, 'incorporation')"
                  >
                    {{ incorpCard.ctaLabel }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </router-link>
                <p v-if="incorpCard.helperText" class="mt-2 text-xs text-emerald-300/70">
                  {{ incorpCard.helperText }}
                </p>
                <p v-if="incorpCard.otherMatterCount > 0" class="mt-1 text-xs text-emerald-200/60">
                  {{ getOtherMatterText(incorpCard) }}
                </p>
                <router-link
                  v-if="incorpCard.summaryLink && incorpCard.latestCompletedMatter"
                  :to="incorpCard.summaryLink"
                  custom
                  v-slot="{ href: summaryHref }"
                >
                  <a
                    id="home-incorp-summary-link"
                    :href="summaryHref"
                    class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200"
                    @click="handleSummaryLinkClick($event, incorpCard.latestCompletedMatter)"
                  >
                    {{ incorpCard.summaryLinkLabel }}
                  </a>
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          data-testid="home-incorp-card"
          id="home-incorp-cta"
          aria-disabled="true"
          tabindex="-1"
          class="glass-panel group p-7 rounded-2xl border text-left flex flex-col h-full transition-all border-gray-700/60 bg-gray-900/40 opacity-70 cursor-not-allowed"
        >
          <div class="flex items-start gap-4 flex-1">
            <div class="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="min-w-0 flex flex-col h-full">
              <h2 class="text-lg font-semibold text-white mb-1">Business Incorporation</h2>
              <p class="text-gray-400 text-sm leading-relaxed flex-1">
                Structure Your Success. Provide your company details below to begin the incorporation process. We handle both Provincial (Ontario) and Federal filings, combining AI-driven efficiency with the accountability of a local legal team.
              </p>
              <div class="mt-4 shrink-0">
                <span class="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium opacity-70">
                  {{ incorpCard.ctaLabel }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <p v-if="incorpCard.helperText" class="mt-2 text-xs text-emerald-300/70">
                  {{ incorpCard.helperText }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!estateCard.disabled"
          data-testid="home-estate-card"
          class="glass-panel group p-7 rounded-2xl border text-left flex flex-col h-full transition-all border-gray-700/60 hover:border-violet-500/40 hover:bg-gray-800/60"
        >
          <div class="flex items-start gap-4 flex-1">
            <div class="w-11 h-11 bg-violet-500/15 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="min-w-0 flex flex-col h-full">
              <h2 class="text-lg font-semibold text-white mb-1">Wills &amp; Estate Planning</h2>
              <p class="text-gray-400 text-sm leading-relaxed flex-1">
                Plan for What Matters. Share your family's unique needs to initiate your estate strategy. Our team of lawyers will review your goals and reach out to finalize your Will and Power of Attorney in person.
              </p>
              <div class="mt-4 shrink-0">
                <router-link
                  :to="estateCard.to"
                  custom
                  v-slot="{ href }"
                >
                  <a
                    id="home-estate-cta"
                    :href="href"
                    class="inline-flex items-center gap-1 text-violet-400 text-sm font-medium transition-all group-hover:gap-2"
                    @click="handlePrimaryCardClick($event, estateCard, 'will')"
                  >
                    {{ estateCard.ctaLabel }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </router-link>
                <p v-if="estateCard.helperText" class="mt-2 text-xs text-violet-300/70">
                  {{ estateCard.helperText }}
                </p>
                <p v-if="estateCard.otherMatterCount > 0" class="mt-1 text-xs text-violet-200/60">
                  {{ getOtherMatterText(estateCard) }}
                </p>
                <router-link
                  v-if="estateCard.summaryLink && estateCard.latestCompletedMatter"
                  :to="estateCard.summaryLink"
                  custom
                  v-slot="{ href: summaryHref }"
                >
                  <a
                    id="home-estate-summary-link"
                    :href="summaryHref"
                    class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                    @click="handleSummaryLinkClick($event, estateCard.latestCompletedMatter)"
                  >
                    {{ estateCard.summaryLinkLabel }}
                  </a>
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          data-testid="home-estate-card"
          id="home-estate-cta"
          aria-disabled="true"
          class="glass-panel group p-7 rounded-2xl border text-left flex flex-col h-full transition-all border-gray-700/60 bg-gray-900/40 opacity-70 cursor-not-allowed"
        >
          <div class="flex items-start gap-4 flex-1">
            <div class="w-11 h-11 bg-violet-500/15 rounded-xl flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="min-w-0 flex flex-col h-full">
              <h2 class="text-lg font-semibold text-white mb-1">Wills &amp; Estate Planning</h2>
              <p class="text-gray-400 text-sm leading-relaxed flex-1">
                Plan for What Matters. Share your family's unique needs to initiate your estate strategy. Our team of lawyers will review your goals and reach out to finalize your Will and Power of Attorney in person.
              </p>
              <div class="mt-4 shrink-0">
                <span class="inline-flex items-center gap-1 text-violet-400 text-sm font-medium opacity-70">
                  {{ estateCard.ctaLabel }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <p v-if="estateCard.helperText" class="mt-2 text-xs text-violet-300/70">
                  {{ estateCard.helperText }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center animate-slide-up delay-300">
        <template v-if="authStore.isAuthenticated">
          <router-link
            :to="dashboardRoute"
            class="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors font-medium text-sm group"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to your dashboard
          </router-link>
        </template>
        <template v-else>
          <p class="text-gray-600 text-sm">
            Already submitted your intake?
            <router-link to="/login" class="text-gray-400 hover:text-white transition-colors ml-1">Sign in to your account -&gt;</router-link>
          </p>
        </template>
      </div>

      <div class="mt-12 p-5 rounded-2xl border border-gray-800/80 bg-gray-900/40 animate-slide-up delay-400">
        <p class="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">What to expect</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
          <div class="flex items-start gap-2.5">
            <div class="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-violet-400 text-xs font-bold">1</span>
            </div>
            <span>Complete the intake form - takes about 10-15 minutes</span>
          </div>
          <div class="flex items-start gap-2.5">
            <div class="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-violet-400 text-xs font-bold">2</span>
            </div>
            <span>Our team reviews your submission and prepares your documents</span>
          </div>
          <div class="flex items-start gap-2.5">
            <div class="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-violet-400 text-xs font-bold">3</span>
            </div>
            <span>A Valiant Law lawyer contacts you to confirm and finalise</span>
          </div>
        </div>
      </div>
    </main>

    <footer class="border-t border-gray-800/50 py-6 px-6">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
        <span>&copy; {{ new Date().getFullYear() }} Valiant Law Professional Corporation. All rights reserved.</span>
        <div class="flex items-center gap-4">
          <a href="https://valiantlaw.ca" target="_blank" rel="noopener noreferrer" class="hover:text-gray-500 transition-colors">valiantlaw.ca</a>
          <span class="text-gray-800">Mississauga &amp; Toronto, Ontario</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isNavigationFailure, useRouter } from 'vue-router';
import api from '../api';
import { useClientMatterRouting, type HomeCardModel } from '../composables/useClientMatterRouting';
import { useAuthStore } from '../stores/auth';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { useIntakeStore } from '../stores/intake';
import type { ClientIntake } from '../types/clientIntake';

type ServiceType = ClientIntake['type'];

type ServiceCardState = HomeCardModel & {
  disabled: boolean;
};

type DraftSnapshot =
  | {
    type: 'will';
    currentIntakeId: string | null;
    currentStep: string;
    intakeData: Record<string, any>;
    dataVersion: number | undefined;
    isInitialized: boolean;
  }
  | {
    type: 'incorporation';
    currentIncorpId: string | null;
    currentStep: string;
    incorpData: Record<string, any>;
    intakeFlags: Array<{ type?: 'hard' | 'soft'; message: string; code: string }>;
    logicWarnings: Array<{ code: string; message: string; severity?: 'warning' | 'info' }>;
    hasLoaded: boolean;
  }
  | null;

const authStore = useAuthStore();
const router = useRouter();
const estateStore = useIntakeStore();
const incorpStore = useIncorpIntakeStore();
const {
  activateMatter,
  getMatterLink,
  resolveHomeCard,
} = useClientMatterRouting();

const serviceIntakes = ref<ClientIntake[]>([]);
const isMatterStateLoading = ref(false);
const matterStateLoaded = ref(false);
const matterStateError = ref(false);
let matterStateRequestId = 0;

const isClientUser = computed(() => authStore.isAuthenticated && authStore.user?.role === 'client');
const showClientServiceCards = computed(() => !authStore.isAuthenticated || isClientUser.value);

const clientIdentity = computed(() => {
  if (!isClientUser.value) return null;
  const user = authStore.user as Record<string, unknown> | null;
  return String(user?.id ?? user?._id ?? user?.email ?? JSON.stringify(user));
});

const dashboardRoute = computed(() => {
  const role = authStore.user?.role;
  if (role === 'admin') return '/admin';
  if (role === 'lawyer') return '/lawyer';
  return '/dashboard';
});

const invalidateMatterRequests = () => {
  matterStateRequestId += 1;
};

const fetchMatterState = async () => {
  const requestId = ++matterStateRequestId;

  if (!isClientUser.value) {
    if (requestId !== matterStateRequestId) return;
    serviceIntakes.value = [];
    isMatterStateLoading.value = false;
    matterStateError.value = false;
    matterStateLoaded.value = true;
    return;
  }

  isMatterStateLoading.value = true;
  matterStateError.value = false;
  matterStateLoaded.value = false;

  try {
    const response = await api.get('/intake/me');
    if (requestId !== matterStateRequestId) return;
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid matter payload');
    }
    serviceIntakes.value = response.data;
  } catch {
    if (requestId !== matterStateRequestId) return;
    serviceIntakes.value = [];
    matterStateError.value = true;
  } finally {
    if (requestId !== matterStateRequestId) return;
    isMatterStateLoading.value = false;
    matterStateLoaded.value = true;
  }
};

const deepClone = <T>(value: T): T => {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
};

const snapshotDraftState = (type: ServiceType): DraftSnapshot => {
  if (type === 'incorporation') {
    return {
      type,
      currentIncorpId: incorpStore.currentIncorpId,
      currentStep: incorpStore.currentStep,
      incorpData: deepClone(incorpStore.incorpData),
      intakeFlags: deepClone(incorpStore.intakeFlags),
      logicWarnings: deepClone(incorpStore.logicWarnings),
      hasLoaded: incorpStore.hasLoaded,
    };
  }

  return {
    type,
    currentIntakeId: estateStore.currentIntakeId,
    currentStep: estateStore.currentStep,
    intakeData: deepClone(estateStore.intakeData),
    dataVersion: estateStore.dataVersion,
    isInitialized: estateStore.isInitialized,
  };
};

const restoreDraftState = (snapshot: DraftSnapshot) => {
  if (!snapshot) return;

  if (snapshot.type === 'incorporation') {
    incorpStore.currentIncorpId = snapshot.currentIncorpId;
    incorpStore.currentStep = snapshot.currentStep;
    incorpStore.incorpData = snapshot.incorpData;
    incorpStore.intakeFlags = snapshot.intakeFlags;
    incorpStore.logicWarnings = snapshot.logicWarnings;
    incorpStore.hasLoaded = snapshot.hasLoaded;

    if (snapshot.currentIncorpId) {
      localStorage.setItem('incorpIntakeId', snapshot.currentIncorpId);
    } else {
      localStorage.removeItem('incorpIntakeId');
    }

    localStorage.setItem('incorpWizardStep', snapshot.currentStep);
    return;
  }

  estateStore.currentIntakeId = snapshot.currentIntakeId;
  estateStore.currentStep = snapshot.currentStep;
  estateStore.intakeData = snapshot.intakeData;
  estateStore.dataVersion = snapshot.dataVersion;
  estateStore.isInitialized = snapshot.isInitialized;

  if (snapshot.currentIntakeId) {
    localStorage.setItem('intakeId', snapshot.currentIntakeId);
  } else {
    localStorage.removeItem('intakeId');
  }

  localStorage.setItem('wizardStep', snapshot.currentStep);
};

const resetServiceDraftState = (type: ServiceType) => {
  if (type === 'incorporation') {
    incorpStore.resetDraftState();
    return;
  }

  estateStore.resetDraftState();
};

const isPlainLeftClick = (event: MouseEvent) =>
  event.button === 0
  && !event.metaKey
  && !event.ctrlKey
  && !event.shiftKey
  && !event.altKey
  && !event.defaultPrevented;

const navigateWithPreparedState = async (
  event: MouseEvent,
  to: string,
  type: ServiceType,
  onPlainClick: () => void,
  onModifiedClick?: () => void,
) => {
  if (!isPlainLeftClick(event)) {
    onModifiedClick?.();
    return;
  }

  event.preventDefault();
  const snapshot = snapshotDraftState(type);

  try {
    onPlainClick();
    const failure = await router.push(to);
    if (failure && isNavigationFailure(failure)) {
      throw failure;
    }
  } catch {
    restoreDraftState(snapshot);
  }
};

watch(
  clientIdentity,
  (identity) => {
    invalidateMatterRequests();

    if (identity) {
      void fetchMatterState();
      return;
    }

    serviceIntakes.value = [];
    isMatterStateLoading.value = false;
    matterStateError.value = false;
    matterStateLoaded.value = true;
  },
  { immediate: true }
);

const buildServiceCard = (
  type: ServiceType,
  startRoute: string,
): ServiceCardState => {
  if (!authStore.isAuthenticated) {
    return {
      disabled: false,
      ...resolveHomeCard([], type, startRoute),
    };
  }

  if (!isClientUser.value) {
    return {
      disabled: true,
      ...resolveHomeCard([], type, startRoute),
    };
  }

  if (isMatterStateLoading.value || !matterStateLoaded.value) {
    return {
      primaryMatter: null,
      otherMatterCount: 0,
      hasOtherActiveMatters: false,
      latestCompletedMatter: null,
      ctaLabel: 'Loading...',
      helperText: 'Checking your saved progress.',
      to: startRoute,
      summaryLink: null,
      summaryLinkLabel: null,
      disabled: true,
    };
  }

  if (matterStateError.value) {
    return {
      primaryMatter: null,
      otherMatterCount: 0,
      hasOtherActiveMatters: false,
      latestCompletedMatter: null,
      ctaLabel: 'Unavailable',
      helperText: 'Retry to restore your saved intake.',
      to: startRoute,
      summaryLink: null,
      summaryLinkLabel: null,
      disabled: true,
    };
  }

  return {
    disabled: false,
    ...resolveHomeCard(serviceIntakes.value, type, startRoute),
  };
};

const estateCard = computed(() => buildServiceCard('will', '/triage'));
const incorpCard = computed(() => buildServiceCard('incorporation', '/incorp-triage'));

const getOtherMatterText = (card: ServiceCardState) => {
  if (!card.otherMatterCount) return '';

  if (!card.hasOtherActiveMatters) {
    const noun = card.otherMatterCount === 1 ? 'completed matter' : 'completed matters';
    const verb = card.otherMatterCount === 1 ? 'is' : 'are';
    return `${card.otherMatterCount} other ${noun} ${verb} still available from prior filings.`;
  }

  const noun = card.otherMatterCount === 1 ? 'matter' : 'matters';
  const verb = card.otherMatterCount === 1 ? 'is' : 'are';
  return `${card.otherMatterCount} other ${noun} ${verb} also on file.`;
};

const handlePrimaryCardClick = async (
  event: MouseEvent,
  card: ServiceCardState,
  type: ServiceType,
) => {
  if (card.disabled) {
    event.preventDefault();
    return;
  }

  if (card.primaryMatter) {
    await navigateWithPreparedState(
      event,
      card.to,
      type,
      () => activateMatter(card.primaryMatter as ClientIntake),
      () => activateMatter(card.primaryMatter as ClientIntake),
    );
    return;
  }

  await navigateWithPreparedState(
    event,
    card.to,
    type,
    () => resetServiceDraftState(type),
    () => resetServiceDraftState(type),
  );
};

const handleSummaryLinkClick = async (
  event: MouseEvent,
  matter: ClientIntake | null,
) => {
  if (!matter) return;
  await navigateWithPreparedState(
    event,
    getMatterLink(matter),
    matter.type,
    () => activateMatter(matter),
    () => activateMatter(matter),
  );
};
</script>
