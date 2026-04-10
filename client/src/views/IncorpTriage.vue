<template>
  <div class="relative flex min-h-screen flex-col justify-center overflow-hidden bg-gray-900 p-6 font-sans text-white md:p-12">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="animate-pulse-slow absolute right-[-5%] top-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-900/20 blur-[80px]"></div>
      <div class="animate-pulse-slow animation-delay-2000 absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-teal-900/10 blur-[80px]"></div>
    </div>

    <div class="mx-auto w-full max-w-2xl animate-fade-in-up">
      <header class="mb-12 text-center">
        <h2 class="mb-4 bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-sm md:text-5xl">
          Business Incorporation
        </h2>
        <p class="text-lg font-light text-gray-400 md:text-xl">
          Start a new incorporation, resume your draft, or check the status of an existing matter.
        </p>
      </header>

      <section class="card-glass rounded-3xl border border-gray-700/60 p-8 shadow-2xl shadow-emerald-900/10">
        <div v-if="isBootstrapping" class="space-y-4 animate-pulse" aria-label="Loading incorporation status">
          <div class="h-5 w-32 rounded-full bg-gray-700/60"></div>
          <div class="h-9 w-80 rounded-xl bg-gray-700/40"></div>
          <div class="h-4 w-full rounded bg-gray-700/30"></div>
          <div class="h-4 w-5/6 rounded bg-gray-700/30"></div>
          <div class="mt-8 h-14 w-full rounded-2xl bg-gray-700/40"></div>
        </div>

        <div v-else-if="bootstrapError" class="space-y-6">
          <div class="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-200">
            Unable to load status
          </div>
          <div>
            <h3 class="text-2xl font-semibold text-white">We could not load your incorporation matter.</h3>
            <p class="mt-3 text-sm leading-6 text-gray-300">{{ bootstrapError }}</p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
              @click="retryBootstrap"
            >
              Retry
            </button>
            <button
              type="button"
              class="rounded-2xl border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800/70 hover:text-white"
              @click="goToDashboard"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div v-else class="space-y-8">
          <div class="space-y-4">
            <div
              class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              :class="statusBadgeClass"
            >
              {{ statusBadge }}
            </div>

            <div>
              <h3 class="text-3xl font-semibold text-white">{{ headline }}</h3>
              <p class="mt-3 text-base leading-7 text-gray-300">{{ description }}</p>
            </div>
          </div>

          <div
            v-if="showMatterDetails"
            class="rounded-2xl border border-gray-700/70 bg-gray-900/40 p-5"
            data-testid="incorp-triage-summary"
          >
            <div class="mb-2 text-sm font-semibold uppercase tracking-widest text-gray-500">Current matter</div>
            <p class="text-sm leading-6 text-gray-300">{{ matterSummary }}</p>
          </div>

          <div class="space-y-3">
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-emerald-900/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isSubmitting"
              @click="handlePrimaryAction"
            >
              <svg
                v-if="isSubmitting"
                class="h-5 w-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>{{ primaryActionLabel }}</span>
            </button>

            <button
              v-if="mode !== 'status'"
              type="button"
              class="w-full rounded-2xl border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800/70 hover:text-white"
              @click="goToDashboard"
            >
              Go to Dashboard
            </button>

            <p
              v-if="actionError"
              class="rounded-xl border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {{ actionError }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useIncorpIntakeStore } from '../stores/incorpIntake';

type LauncherMode = 'start' | 'resume' | 'status';

const router = useRouter();
const incorpStore = useIncorpIntakeStore();

const isBootstrapping = ref(true);
const isSubmitting = ref(false);
const bootstrapError = ref('');
const actionError = ref('');

const mode = computed<LauncherMode>(() => {
    if (!incorpStore.currentStatus || incorpStore.currentStatus === 'completed') {
        return 'start';
    }
    if (incorpStore.currentStatus === 'started') {
        return 'resume';
    }
    return 'status';
});

const statusBadge = computed(() => {
    if (mode.value === 'resume') return 'Draft in progress';
    if (mode.value === 'status') return incorpStore.currentStatus === 'reviewing' ? 'Lawyer review' : 'Submission received';
    if (incorpStore.currentStatus === 'completed') return 'Completed matter';
    return 'New incorporation';
});

const statusBadgeClass = computed(() => {
    if (mode.value === 'resume') {
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    }
    if (mode.value === 'status') {
        return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
    }
    return 'border-gray-600/70 bg-gray-800/70 text-gray-300';
});

const headline = computed(() => {
    if (mode.value === 'resume') return 'Resume your incorporation draft';
    if (mode.value === 'status') return 'Your incorporation matter is already in progress';
    if (incorpStore.currentStatus === 'completed') return 'Start a new incorporation matter';
    return 'Start your incorporation wizard';
});

const description = computed(() => {
    if (mode.value === 'resume') {
        return 'We found an active incorporation draft. Continue from where you left off instead of re-entering setup details.';
    }
    if (mode.value === 'status') {
        return incorpStore.currentStatus === 'reviewing'
            ? 'Your matter is currently under lawyer review. Use the dashboard to track updates and next steps.'
            : 'Your incorporation intake has been submitted. Use the dashboard to track its review status.';
    }
    if (incorpStore.currentStatus === 'completed') {
        return 'Your latest incorporation matter is complete. Start a fresh wizard if you need another corporation file.';
    }
    return 'Launch a new incorporation wizard. Jurisdiction, name details, and director-count configuration are handled inside the wizard steps.';
});

const matterSummary = computed(() => {
    if (mode.value === 'resume') {
        return `Resume path: ${incorpStore.resolveResumePath().replace('/incorporation/', '').replace(/-/g, ' ')}.`;
    }
    if (mode.value === 'status') {
        return 'Editing is locked while the matter is submitted or under review. Open the dashboard to see status, notes, and next actions.';
    }
    if (incorpStore.currentStatus === 'completed') {
        return 'The previous incorporation matter is complete and remains available from the dashboard for reference.';
    }
    return '';
});

const showMatterDetails = computed(() =>
    Boolean(incorpStore.currentStatus)
);

const primaryActionLabel = computed(() => {
    if (isSubmitting.value) {
        if (mode.value === 'resume') return 'Opening draft...';
        if (mode.value === 'status') return 'Opening dashboard...';
        return 'Starting wizard...';
    }

    if (mode.value === 'resume') return 'Resume Incorporation Draft';
    if (mode.value === 'status') return 'View Matter Status';
    return 'Start Incorporation Wizard';
});

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as any)?.response?.data?.message || fallback;

const bootstrap = async () => {
    isBootstrapping.value = true;
    bootstrapError.value = '';
    actionError.value = '';

    try {
        await incorpStore.loadCurrentIncorpMatter(true);
    } catch (error) {
        bootstrapError.value = getErrorMessage(error, 'Please check your connection and try again.');
    } finally {
        isBootstrapping.value = false;
    }
};

const goToDashboard = async () => {
    await router.push('/dashboard');
};

const handlePrimaryAction = async () => {
    if (isSubmitting.value || isBootstrapping.value) return;

    isSubmitting.value = true;
    actionError.value = '';

    try {
        if (mode.value === 'resume') {
            await router.push(incorpStore.resolveResumePath());
            return;
        }

        if (mode.value === 'status') {
            await router.push('/dashboard');
            return;
        }

        const result = await incorpStore.createIncorpIntake();
        if (!result.wasResumed) {
            incorpStore.setCurrentStep('jurisdiction-name');
            await router.push('/incorporation/jurisdiction-name');
            return;
        }

        await router.push(incorpStore.resolveResumePath());
    } catch (error) {
        actionError.value = getErrorMessage(error, 'Failed to continue incorporation. Please try again.');
    } finally {
        isSubmitting.value = false;
    }
};

const retryBootstrap = async () => {
    await bootstrap();
};

onMounted(() => {
    void bootstrap();
});
</script>

<style scoped>
.animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.15; } }
</style>
