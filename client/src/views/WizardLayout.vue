<template>
  <div class="min-h-screen bg-gray-900 text-white flex">
    <!-- Mobile Sidebar / Drawer -->
    <div v-if="showMobileMenu" class="fixed inset-0 z-50 flex md:hidden">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="showMobileMenu = false"></div>
        
        <!-- Drawer -->
        <aside class="relative w-64 bg-gray-800 h-full shadow-2xl flex flex-col transform transition-transform duration-300">
             <div class="p-6 border-b border-gray-700 flex justify-between items-center">
                <h1 class="text-xl font-bold text-gray-100">Intake Menu</h1>
                <button @click="showMobileMenu = false" class="text-gray-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             </div>
             
             <nav class="flex-1 overflow-y-auto mt-2">
                 <div 
                   v-for="(step, index) in steps" 
                   :key="index"
                   @click="navigateToStep(index)"
                   class="flex items-center px-6 py-4 border-l-4 transition-colors justify-between cursor-pointer active:bg-gray-700"
                   :class="[
                     index === currentStepIndex ? 'border-blue-500 bg-gray-700/50 text-white' : 'border-transparent text-gray-400',
                   ]"
                 >
                   <div class="flex items-center">
                       <span class="mr-3 text-sm font-medium">{{ index + 1 }}.</span>
                       <span>{{ step.label }}</span>
                   </div>
                   <div v-if="getStepStatus(step) === 'complete'" class="text-green-500 text-xs">✅</div>
                 </div>
             </nav>
        </aside>
    </div>

    <!-- Sidebar (Desktop) -->
    <aside class="w-64 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col shrink-0" role="navigation" aria-label="Intake wizard steps">
      <div class="p-6">
        <!-- W7: Valiant Law branding -->
        <p class="text-xs font-semibold text-blue-400/70 uppercase tracking-widest mb-1">Valiant Law</p>
        <h1 class="text-xl font-bold text-gray-100">Intake Wizard</h1>
        <!-- Progress Bar -->
        <div class="mt-3">
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Step {{ currentStepIndex + 1 }} of {{ steps.length }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" 
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
        </div>
        <!-- Save Status & Time Estimate (G7) -->
        <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center">
            <svg v-if="saveStatus === 'saving'" class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            <svg v-else-if="saveStatus === 'saved'" class="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>{{ saveStatusText }}</span>
          </div>
          <div class="flex items-center text-gray-400" title="Estimated time remaining">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>~{{ estimatedTimeRemaining }}</span>
          </div>
        </div>
      </div>
      <nav class="mt-4 flex-1 overflow-y-auto" role="list" aria-label="Wizard steps">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          role="listitem"
          :tabindex="0"
          @click="navigateToStep(index)"
          @keydown.enter="navigateToStep(index)"
          @keydown.space.prevent="navigateToStep(index)"
          :aria-current="index === currentStepIndex ? 'step' : undefined"
          :aria-label="`Step ${index + 1}: ${step.label}${getStepStatus(step) === 'complete' ? ' (completed)' : ''}`"
          class="flex items-center px-6 py-3 border-l-4 transition-colors justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-gray-700/30"
          :class="[
            index === currentStepIndex ? 'border-blue-500 bg-gray-700/50 text-white' : 'border-transparent text-gray-400',
            index < currentStepIndex && index !== currentStepIndex ? 'text-gray-300' : ''
          ]"
        >
          <div class="flex items-center">
              <span class="mr-3 text-sm font-medium">{{ index + 1 }}.</span>
              <span>{{ step.label }}</span>
          </div>
          <!-- Smart Status Icon: v-else-if prevents both icons rendering simultaneously (Bug #2) -->
          <div v-if="getStepStatus(step) === 'complete'" class="text-green-500 text-xs" aria-hidden="true">✅</div>
          <div v-else-if="getStepStatus(step) === 'warning'" class="text-yellow-500 text-xs" title="Missing critical info" aria-hidden="true">⚠️</div>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen overflow-hidden">
      <!-- Mobile Header -->
      <header class="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center md:hidden shrink-0 z-10 relative shadow-md">
         <div class="flex items-center gap-3">
             <button @click="showMobileMenu = true" class="text-gray-300 hover:text-white">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
             </button>
             <h1 class="font-bold text-white">Intake Wizard</h1>
         </div>
         <div class="flex items-center gap-2">
             <span class="text-sm text-gray-400">{{ progressPercent }}%</span>
             <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
               <div class="h-full bg-blue-500 transition-all" :style="{ width: progressPercent + '%' }"></div>
             </div>
         </div>
      </header>

      <div class="flex-1 p-8 overflow-y-auto relative perspective-1000" id="wizard-content">
        <div class="max-w-3xl mx-auto pb-32">
           <router-view v-slot="{ Component }">
              <transition :name="transitionName" mode="out-in" @after-enter="scrollToTop">
                <ErrorBoundary fallbackMessage="This wizard step encountered an error. Please try again or go to a different step.">
                  <component
                    :is="Component"
                    ref="activeStepRef"
                    :key="$route.path + '-' + undoIteration"
                    @next="nextStep"
                    @prev="prevStep"
                  />
                </ErrorBoundary>
              </transition>
           </router-view>
        </div>
        
        <!-- Floating Action Bar -->
        <!-- Bug #17 fix: right offset is conditional on AI sidebar visibility -->
        <div
          class="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-4 z-40"
          :class="isAISidebarVisible ? 'lg:right-80' : 'lg:right-0'"
        >
          <div class="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <!-- Left: I'm Not Sure Button (Bug #1: disabled only on Review step, not by position) -->
            <button 
              @click="markUnsure"
              class="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50 rounded-lg transition-colors"
              :disabled="currentStep?.context === 'review'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>I'm Not Sure</span>
            </button>
            
            <!-- Center: Save Indicator (Mobile) -->
            <div class="hidden sm:flex items-center text-xs text-gray-500">
              <svg v-if="saveStatus === 'saving'" class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <svg v-else-if="saveStatus === 'saved'" class="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>{{ saveStatusText }}</span>
            </div>
            
            <!-- Right: Navigation Buttons -->
            <div class="flex items-center gap-2">
              <button
                v-if="!isFirstStep"
                @click="prevStep"
                class="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                @click="triggerComponentNext"
                :disabled="primaryActionDisabled"
                class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                :class="{ 'opacity-50 cursor-not-allowed': primaryActionDisabled }"
              >
                <span v-if="primaryActionLoading" class="mr-2 inline-block animate-spin">...</span>
                {{ primaryActionLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Right Sidebar (AI Chat — desktop only) -->
    <aside 
      class="border-l border-gray-700 bg-gray-800 shrink-0 overflow-hidden w-80 h-screen hidden lg:flex flex-col"
      aria-label="AI legal assistant sidebar"
    >
        <ErrorBoundary fallbackMessage="AI Chat is temporarily unavailable">
            <AIGuide :embedded="true" instance-role="embedded" />
        </ErrorBoundary>
    </aside>

    <!-- Mobile AI Floating Button (shown below lg breakpoint, wizard pages only) -->
    <button
      class="fixed bottom-6 right-6 z-40 flex lg:hidden items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform duration-300"
      @click="showMobileAI = true"
      aria-label="Open AI legal assistant"
      :aria-expanded="showMobileAI"
    >
      <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <!-- Unread badge -->
      <span
        v-if="aiChatStore.chatState.unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-gray-900 font-bold"
        aria-label="Unread AI messages"
      >
        {{ aiChatStore.chatState.unreadCount }}
      </span>
    </button>

    <!-- Mobile AI Bottom-Sheet Drawer -->
    <teleport to="body">
      <transition name="sheet">
        <div
          v-if="showMobileAI"
          class="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
          role="dialog"
          aria-label="AI legal assistant"
          aria-modal="true"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showMobileAI = false"
            aria-hidden="true"
          />

          <!-- Sheet Panel (class name required for CSS transition selector — Bug #21) -->
          <div class="sheet-panel relative h-[50vh] bg-gray-800 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl border-t border-gray-700">
            <!-- Drag handle -->
            <div
              class="flex justify-center pt-3 pb-1 shrink-0 cursor-pointer"
              @click="showMobileAI = false"
              role="button"
              aria-label="Close AI assistant"
              tabindex="0"
              @keydown.enter="showMobileAI = false"
            >
              <div class="w-10 h-1 bg-gray-600 rounded-full" aria-hidden="true" />
            </div>

            <!-- AIGuide in embedded mode fills the remaining space -->
            <div class="flex-1 overflow-hidden">
              <ErrorBoundary fallbackMessage="AI Chat is temporarily unavailable">
                <AIGuide :embedded="true" instance-role="embedded" />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Validation Dialog Modal -->
    <div v-if="showValidationDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="showValidationDialog = false"></div>
        
        <!-- Modal -->
        <div class="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
            <div class="flex items-start space-x-4">
                <div class="bg-yellow-500/10 p-3 rounded-full shrink-0">
                    <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">AI Guard Notice</h3>
                    <p class="text-gray-300 text-sm mb-6">{{ validationError }}</p>
                    
                    <div class="flex flex-col gap-3">
                         <button 
                            @click="askAIForHelp"
                            class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
                         >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            <span>Help Me Fix This (AI)</span>
                         </button>

                         <div class="flex space-x-3 mt-2">
                             <button 
                                @click="showValidationDialog = false" 
                                class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                             >
                                 Back to Edit
                             </button>
                             <button 
                                @click="proceedNavigation" 
                                class="flex-1 py-2 border border-gray-600 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                             >
                                 Proceed Anyway
                             </button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- E2: Step Completion Celebration Toast -->
    <transition name="fade-slide">
      <div 
        v-if="showCelebration" 
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce"
      >
        <span class="text-xl">🎉</span>
        <span class="font-medium">{{ celebrationMessage }}</span>
      </div>
    </transition>

    <!-- E5: Session Timeout Warning Modal -->
    <div v-if="showTimeoutWarning" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div class="bg-gray-800 border border-yellow-500/50 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">Session Timeout Warning</h3>
            <p class="text-yellow-400 text-sm">Your session will expire soon</p>
          </div>
        </div>
        <p class="text-gray-300 mb-4">
          Your session will expire in <span class="font-bold text-yellow-400">{{ timeoutCountdown }}</span> seconds. 
          Your progress will be automatically saved.
        </p>
        <div class="flex gap-3">
          <button 
            @click="extendSession" 
            class="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-medium transition-colors"
          >
            Keep Me Logged In
          </button>
          <button 
            @click="router.push('/dashboard')" 
            class="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>

    <!-- E4: Floating Undo/Redo Controls -->
    <div class="fixed bottom-24 right-4 lg:right-[340px] flex gap-2 z-30">
      <button 
        @click="undo" 
        :disabled="!canUndo"
        class="p-2 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm border border-gray-600 transition-all"
        title="Undo (Ctrl+Z)"
      >
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
      </button>
      <button 
        @click="redo" 
        :disabled="!canRedo"
        class="p-2 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm border border-gray-600 transition-all"
        title="Redo (Ctrl+Y)"
      >
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"></path></svg>
      </button>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AIGuide from '../components/AIGuide.vue';
import { useIntakeStore } from '../stores/intake';
import { useAiChatStore } from '../stores/aiChat';
import { useIntakeValidation } from '../composables/useIntakeValidation';
import { useIntakeSteps, type WizardStep } from '../composables/useIntakeSteps';
import type { IntakeData } from '../types/intake';
import ErrorBoundary from '../components/common/ErrorBoundary.vue';
import { useToast } from '../composables/useToast';

type ActiveWizardStep = {
    commitStep?: (flush?: boolean) => Promise<void> | void;
    hasPendingChanges?: () => boolean;
    validateLocal?: () => string | null;
    afterCommitContinue?: () => Promise<boolean> | boolean;
    triggerPrimaryAction?: () => Promise<void> | void;
    getPrimaryActionState?: () => {
        disabled?: boolean;
        loading?: boolean;
        label?: string;
    };
};

const router = useRouter();
const intakeStore = useIntakeStore();
const aiChatStore = useAiChatStore();
const { getStepStatus: getStatus, validateStep, isStepComplete } = useIntakeValidation();
const { steps, currentStepIndex, getNextStep, getPrevStep, isFirstStep, isLastStep, currentStep } = useIntakeSteps();
const { showToast } = useToast();

const undoIteration = ref(0);
const activeStepRef = ref<ActiveWizardStep | null>(null);
let undoTimeout: ReturnType<typeof setTimeout> | null = null;

watch(() => intakeStore.intakeData, () => {
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        pushUndoState();
    }, 1000);
}, { deep: true });

const transitionName = ref('slide-right');
const showMobileMenu = ref(false);
const showMobileAI   = ref(false);

// Bug #17: Track AI sidebar visibility reactively (always visible at ≥lg breakpoint)
const isAISidebarVisible = ref(window.matchMedia('(min-width: 1024px)').matches);
let _mediaQuery: MediaQueryList | null = null;
let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

const commitActiveStep = async (flush = false) => {
    const activeStep = activeStepRef.value;
    if (!activeStep?.commitStep) return;
    if (flush && activeStep.hasPendingChanges && !activeStep.hasPendingChanges()) return;
    await activeStep.commitStep(flush);
};

const primaryActionState = computed(() =>
    activeStepRef.value?.getPrimaryActionState?.() ?? {}
);

const primaryActionDisabled = computed(() => Boolean(primaryActionState.value.disabled));
const primaryActionLoading = computed(() => Boolean(primaryActionState.value.loading));
const primaryActionLabel = computed(() => {
    if (primaryActionState.value.label) {
        return primaryActionState.value.label;
    }

    return isLastStep.value ? 'Submit' : 'Continue';
});

// E1: Keyboard Navigation
const handleKeydown = (e: KeyboardEvent) => {
    // Only handle if not in input/textarea/select
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // Bug #20 fix: Do NOT call nextStep() on Enter inside inputs.
        // Child components own their own submit/advance logic.
        return;
    }

    if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        void triggerComponentNext();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        void prevStep();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    startSessionTimer();
    // Bug #17: Listen for breakpoint changes so isAISidebarVisible stays accurate
    _mediaQuery = window.matchMedia('(min-width: 1024px)');
    mediaQueryListener = (e) => { isAISidebarVisible.value = e.matches; };
    _mediaQuery.addEventListener('change', mediaQueryListener);
    // Wizard step persistence: restore last step on mount via store
    const savedStep = intakeStore.currentStep;
    if (savedStep && router.currentRoute.value.path === '/wizard') {
        router.replace(`/wizard/${savedStep}`);
    }
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    clearSessionTimer();
    clearInterval(saveTickInterval);  // Bug #13: clear timestamp refresh interval
    if (_mediaQuery && mediaQueryListener) {
        _mediaQuery.removeEventListener('change', mediaQueryListener);
    }
});

// E2: Step Completion Celebration
const showCelebration = ref(false);
const celebrationMessage = ref('');

const triggerCelebration = (stepLabel: string) => {
    celebrationMessage.value = `✨ ${stepLabel} complete!`;
    showCelebration.value = true;
    setTimeout(() => {
        showCelebration.value = false;
    }, 2000);
};

// E4: Undo/Redo Support
const undoStack = ref<any[]>([]);
const redoStack = ref<any[]>([]);
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

const pushUndoState = () => {
    // Only push if state has actually changed from last snapshot
    const snapshot = JSON.stringify(intakeStore.intakeData);
    const lastSnapshot = undoStack.value.length > 0
        ? JSON.stringify(undoStack.value[undoStack.value.length - 1])
        : null;
    if (snapshot === lastSnapshot) return;

    undoStack.value.push(JSON.parse(snapshot));
    redoStack.value = []; // Clear redo on new action
    // Keep stack manageable
    if (undoStack.value.length > 10) undoStack.value.shift();
};

const undo = async () => {
    if (!canUndo.value) return;
    await commitActiveStep(true);
    const currentState = JSON.parse(JSON.stringify(intakeStore.intakeData));
    const prevState = undoStack.value.pop();
    redoStack.value.push(currentState);
    try {
        // Bug #4 fix: pass replace=true so the full old snapshot replaces current state
        // rather than being shallow-merged (which could leave stale sections behind)
        await intakeStore.saveIntakeStep(prevState, true);
        undoIteration.value++;
    } catch {
        showToast('Undo failed. Please try again.', 'error');
    }
};

const redo = async () => {
    if (!canRedo.value) return;
    await commitActiveStep(true);
    const currentState = JSON.parse(JSON.stringify(intakeStore.intakeData));
    const nextState = redoStack.value.pop();
    undoStack.value.push(currentState);
    try {
        // Bug #4 fix: same replace=true for redo
        await intakeStore.saveIntakeStep(nextState, true);
        undoIteration.value++;
    } catch {
        showToast('Redo failed. Please try again.', 'error');
    }
};

// E5: Session Timeout Warning
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 minutes before
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let warningTimer: ReturnType<typeof setTimeout> | null = null;
// W1: Store countdown interval ID so it can be properly cleared
let countdownInterval: ReturnType<typeof setInterval> | null = null;
const showTimeoutWarning = ref(false);
const timeoutCountdown = ref(120);

const startSessionTimer = () => {
    clearSessionTimer();
    
    // Warning timer
    warningTimer = setTimeout(() => {
        showTimeoutWarning.value = true;
        timeoutCountdown.value = 120;
        // W1: Store interval ID so it can be cleared on dismiss or session extend
        countdownInterval = setInterval(() => {
            timeoutCountdown.value--;
            if (timeoutCountdown.value <= 0) {
                clearInterval(countdownInterval!);
                countdownInterval = null;
            }
        }, 1000);
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);
    
    // Session timeout (auto-save and redirect)
    sessionTimer = setTimeout(async () => {
        await commitActiveStep(true);
        const payload = _buildTimeoutSavePayload();
        if (Object.keys(payload).length) {
            await intakeStore.saveIntakeStep(payload);
        }
        await router.push('/dashboard');
    }, SESSION_TIMEOUT_MS);
};

const clearSessionTimer = () => {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (warningTimer) clearTimeout(warningTimer);
    // W1: Also clear countdown interval
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
};

const extendSession = () => {
    showTimeoutWarning.value = false;
    timeoutCountdown.value = 120;
    startSessionTimer();
};

// Bug #18 fix: scope timeout auto-save to just the current step's section,
// not the entire intake. This avoids an oversized PUT and unnecessary re-validation.
const _buildTimeoutSavePayload = (): Partial<IntakeData> => {
    const ctx = currentStep.value?.context;
    if (!ctx || ctx === 'review') return {};
    const section = (intakeStore.intakeData as any)[ctx];
    if (!section) return {};
    return { [ctx]: section } as Partial<IntakeData>;
};

// Progress Calculation (based on completed steps)
const progressPercent = computed(() => {
    let completed = 0;
    // Don't count Review step in progress
    const countableSteps = steps.value.filter(s => s.context !== 'review');
    
    countableSteps.forEach(step => {
        if (step.context && isStepComplete(step.context, intakeStore.intakeData as IntakeData)) {
            completed++;
        }
    });
    
    return Math.round((completed / countableSteps.length) * 100);
});

// Save Status Tracking
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
const lastSaveTime = ref<Date | null>(null);

// Bug #13 fix: reactive tick to force saveStatusText recomputation every 15 s
const saveTimeTick = ref(0);
const saveTickInterval = setInterval(() => { saveTimeTick.value++; }, 15_000);

const saveStatusText = computed(() => {
    void saveTimeTick.value; // reactive dependency — re-runs every 15 s
    if (saveStatus.value === 'saving') return 'Saving...';
    if (saveStatus.value === 'saved' && lastSaveTime.value) {
        const seconds = Math.floor((Date.now() - lastSaveTime.value.getTime()) / 1000);
        if (seconds < 5)  return 'Saved just now';
        if (seconds < 60) return `Saved ${seconds}s ago`;
        return `Saved ${Math.floor(seconds / 60)}m ago`;
    }
    return 'Auto-save enabled';
});

// Bug #14 fix: watch isSaving (write-only) instead of isLoading (fetch + save).
// This prevents the false "Saved just now" appearing on the initial page load.
watch(() => intakeStore.isSaving, (isCurrentlySaving) => {
    if (isCurrentlySaving) {
        saveStatus.value = 'saving';
    } else if (saveStatus.value === 'saving') {
        // Only flip to 'saved' if we were actively saving (not idle)
        saveStatus.value = 'saved';
        lastSaveTime.value = new Date();
    }
});

// G7: Estimated Time Remaining — counts INCOMPLETE steps only (Bug #15 fix)
const MINUTES_PER_STEP = 2;
const estimatedTimeRemaining = computed(() => {
    const countableSteps = steps.value.filter(s => s.context !== 'review');
    // Count steps that are not yet complete, regardless of position
    const incompleteCount = countableSteps.filter(step =>
        step.context ? !isStepComplete(step.context, intakeStore.intakeData as IntakeData) : false
    ).length;

    if (incompleteCount <= 0) return '< 1 min';

    const minutes = incompleteCount * MINUTES_PER_STEP;
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
});

// Watch route to determine transition direction
watch(() => currentStepIndex.value, (newIndex, oldIndex) => {
    if (newIndex > oldIndex) transitionName.value = 'slide-right'; // Next
    else transitionName.value = 'slide-left'; // Prev
    // Persist current step via store for session recovery
    const step = steps.value[newIndex];
    if (step) intakeStore.setCurrentStep(step.path);
});

// Wrapper for template usage
const getStepStatus = (step: WizardStep) => {
    if (step.context === 'review') return 'pending'; 
    // Context is optional in WizardStep, but we know our steps have it mostly.
    // Fallback if context missing
    if (!step.context) return 'pending';
    return getStatus(step.context, intakeStore.intakeData as IntakeData);
};

const navigateToStep = async (index: number) => {
    showMobileMenu.value = false;
    const step = steps.value[index];
    if (step) {
        await commitActiveStep(true);
        await router.push(`/wizard/${step.path}`);
    }
};

const scrollToTop = () => {
    const el = document.getElementById('wizard-content');
    if (el) el.scrollTop = 0;
};

const nextStep = async () => {
  const currentStep = steps.value[currentStepIndex.value];
  if (!currentStep) return; 

  const localWarning = activeStepRef.value?.validateLocal?.();
  if (localWarning) return;

  await commitActiveStep(true);

  const canContinue = await activeStepRef.value?.afterCommitContinue?.();
  if (canContinue === false) return;
  
  // Run AI Guard
  if (currentStep.context && currentStep.context !== 'review') {
      const warning = validateStep(currentStep.context, intakeStore.intakeData as IntakeData);
      
      if (warning) {
          // Show Custom Dialog instead of confirm
          validationError.value = warning;
          validationContext.value = currentStep.context || '';
          showValidationDialog.value = true;
          return; // Block navigation until resolved
      }
  }

  await proceedNavigation();
};

const proceedNavigation = async () => {
    showValidationDialog.value = false;
    
    // E4: Push current state to undo stack before navigation
    pushUndoState();
    
    // W2: Only celebrate if the step is actually complete
    const completedStep = currentStep.value;
    if (completedStep && getStepStatus(completedStep) === 'complete') {
        triggerCelebration(completedStep.label);
    }
    
    // E5: Reset session timer on activity
    startSessionTimer();
    
    const next = getNextStep();
    if (next) {
        transitionName.value = 'slide-right';
        await router.push(`/wizard/${next.path}`);
    }
};

const triggerComponentNext = async () => {
    if (currentStep.value?.context === 'review') {
        await activeStepRef.value?.triggerPrimaryAction?.();
        return;
    }

    await nextStep();
};

const prevStep = async () => {
  // Use Composable Helper
  const prev = getPrevStep();
  if (prev) {
    await commitActiveStep(true);
    transitionName.value = 'slide-left';
    await router.push(`/wizard/${prev.path}`);
  }
};

// Validation Dialog Logic
const showValidationDialog = ref(false);
const validationError = ref('');
const validationContext = ref('');

const askAIForHelp = () => {
    showValidationDialog.value = false;
    aiChatStore.chatState.isOpen = true;
    
    const prompt = `Explain the validation error: "${validationError.value}" for the "${validationContext.value}" section. How do I fix it?`;
    aiChatStore.sendAIMessage(prompt, {
        intakeData: intakeStore.intakeData,
        contextStep: validationContext.value,
        flow: 'wills',
    });
};

// "I'm Not Sure" Feature - Creates a soft flag and offers AI help
const markUnsure = async () => {
    const step = currentStep.value;
    if (!step || !step.context) return;
    
    // Save the unsure flag to the intake data
    const currentUnsure = intakeStore.intakeData.unsureFlags || [];
    if (!currentUnsure.includes(step.context)) {
        await intakeStore.saveIntakeStep({
            unsureFlags: [...currentUnsure, step.context]
        });
    }
    
    // Open AI chat with helpful guidance
    // W6: Do NOT auto-navigate — let the user read AI guidance and decide when to proceed
    aiChatStore.chatState.isOpen = true;
    const helpPrompt = `The user is unsure about the "${step.label}" section. Explain what information is needed here and why it matters for their will. Provide simple examples if helpful.`;
    aiChatStore.sendAIMessage(helpPrompt, {
        intakeData: intakeStore.intakeData,
        contextStep: step.context,
        flow: 'wills',
    });
};
</script>

<!-- W5: CSS transitions used by slide-right/left and fade-slide -->
<style scoped>
/* Step slide transitions */
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from { opacity: 0; transform: translateX(32px); }
.slide-right-leave-to  { opacity: 0; transform: translateX(-32px); }
.slide-left-enter-from  { opacity: 0; transform: translateX(-32px); }
.slide-left-leave-to   { opacity: 0; transform: translateX(32px); }

/* Celebration toast fade */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}

/* Validation dialog slide-up */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Mobile AI bottom-sheet slide transition */
.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to   .sheet-panel {
  transform: translateY(100%);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.animate-slide-up {
  animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
