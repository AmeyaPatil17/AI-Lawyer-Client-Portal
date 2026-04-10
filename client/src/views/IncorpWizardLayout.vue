<template>
  <div class="min-h-screen bg-gray-900 text-white flex">
    <div v-if="showMobileMenu" class="fixed inset-0 z-50 flex md:hidden">
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeMobileMenu()" aria-hidden="true"></div>
      <aside class="relative w-64 bg-gray-800 h-full shadow-2xl flex flex-col" role="navigation" aria-label="Incorporation wizard steps">
        <div class="p-6 border-b border-gray-700 flex justify-between items-center">
          <h1 class="text-xl font-bold text-gray-100">Incorporation</h1>
          <button @click="closeMobileMenu()" class="text-gray-400 hover:text-white" aria-label="Close menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto mt-2" role="list">
          <div
            v-for="(step, index) in steps"
            :key="step.path"
            role="listitem"
            :tabindex="isStepNavigationDisabled(index) ? -1 : 0"
            :aria-disabled="isStepNavigationDisabled(index) ? 'true' : 'false'"
            @click="attemptNavigate(index)"
            @keydown.enter="attemptNavigate(index)"
            @keydown.space.prevent="attemptNavigate(index)"
            class="flex items-center px-6 py-4 border-l-4 transition-colors justify-between active:bg-gray-700"
            :class="[
              index === currentStepIndex ? 'border-emerald-500 bg-gray-700/50 text-white' : 'border-transparent text-gray-400',
              isStepNavigationDisabled(index) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            ]"
          >
            <div class="flex items-center">
              <span class="mr-3 text-sm font-medium">{{ index + 1 }}.</span>
              <span>{{ step.label }}</span>
            </div>
            <svg
              v-if="getStepStatusDisplay(step) === 'complete'"
              class="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-else-if="getStepStatusDisplay(step) === 'warning'"
              class="w-4 h-4 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </nav>
      </aside>
    </div>

    <aside class="w-64 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col shrink-0" role="navigation" aria-label="Incorporation wizard steps">
      <div class="p-6">
        <p class="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-1">Valiant Law</p>
        <h1 class="text-xl font-bold text-gray-100">Incorporation</h1>
        <div class="mt-3">
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Step {{ displayStepNumber }} of {{ steps.length }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center">
            <svg v-if="saveStatus === 'saving'" class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            <svg v-else-if="saveStatus === 'saved'" class="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <svg v-else-if="saveStatus === 'dirty'" class="w-3 h-3 mr-1 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
            <svg v-else-if="saveStatus === 'error'" class="w-3 h-3 mr-1 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>{{ saveStatusText }}</span>
          </div>
        </div>
      </div>

      <nav class="mt-4 flex-1 overflow-y-auto" role="list" aria-label="Wizard steps">
        <div
          v-for="(step, index) in steps"
          :key="step.path"
          role="listitem"
          :tabindex="isStepNavigationDisabled(index) ? -1 : 0"
          :aria-current="index === currentStepIndex ? 'step' : undefined"
          :aria-disabled="isStepNavigationDisabled(index) ? 'true' : 'false'"
          :aria-label="`Step ${index + 1}: ${step.label}${getStepStatusDisplay(step) === 'complete' ? ' (completed)' : getStepStatusDisplay(step) === 'warning' ? ' (needs attention)' : ''}`"
          @click="attemptNavigate(index)"
          @keydown.enter="attemptNavigate(index)"
          @keydown.space.prevent="attemptNavigate(index)"
          class="flex items-center px-6 py-3 border-l-4 transition-colors justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-gray-700/30"
          :class="[
            index === currentStepIndex ? 'border-emerald-500 bg-gray-700/50 text-white' : 'border-transparent text-gray-400',
            index < currentStepIndex && index !== currentStepIndex ? 'text-gray-300' : '',
            isStepNavigationDisabled(index) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          ]"
        >
          <div class="flex items-center">
            <span class="mr-3 text-sm font-medium">{{ index + 1 }}.</span>
            <span>{{ step.label }}</span>
          </div>
          <svg
            v-if="getStepStatusDisplay(step) === 'complete'"
            class="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="getStepStatusDisplay(step) === 'warning'"
            class="w-4 h-4 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            title="Missing critical info"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </nav>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen overflow-hidden">
      <header class="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center md:hidden shrink-0 z-10 relative shadow-md">
        <div class="flex items-center gap-3">
          <button ref="mobileMenuButtonRef" @click="openMobileMenu" class="text-gray-300 hover:text-white" aria-label="Open navigation menu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="font-bold text-white">Incorporation</h1>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">{{ progressPercent }}%</span>
          <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </header>

      <div ref="wizardContentRef" class="flex-1 p-8 overflow-y-auto relative perspective-1000" id="incorp-wizard-content">
        <div class="max-w-3xl mx-auto pb-32">
          <div v-if="isBootstrapping" class="space-y-4 animate-pulse">
            <div class="h-10 rounded-xl bg-gray-800/60"></div>
            <div class="h-32 rounded-xl bg-gray-800/40"></div>
            <div class="h-32 rounded-xl bg-gray-800/40"></div>
          </div>
          <div
            v-else-if="bootstrapError"
            class="rounded-2xl border border-red-500/20 bg-red-900/10 p-6 text-left shadow-xl"
            role="alert"
          >
            <div class="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-200">
              Unable to load draft
            </div>
            <h2 class="mt-4 text-2xl font-semibold text-white">We could not load your incorporation matter.</h2>
            <p class="mt-3 text-sm leading-6 text-gray-300">{{ bootstrapError }}</p>
            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                id="incorp-wizard-retry"
                type="button"
                class="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                @click="retryBootstrap"
              >
                Retry
              </button>
              <button
                type="button"
                class="rounded-xl border border-gray-600 px-5 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800/70 hover:text-white"
                @click="router.push('/incorp-triage')"
              >
                Back to Setup
              </button>
            </div>
          </div>
          <router-view v-else v-slot="{ Component }">
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

        <div
          class="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-4 z-40"
          :class="isAISidebarVisible ? 'lg:right-80' : 'lg:right-0'"
        >
          <div class="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button
              @click="markUnsure"
              class="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-yellow-400 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentStep?.context === 'review' || !canInteract"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>I'm Not Sure</span>
            </button>

            <div class="hidden sm:flex items-center text-xs text-gray-500">
              <svg v-if="saveStatus === 'saving'" class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <svg v-else-if="saveStatus === 'saved'" class="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <svg v-else-if="saveStatus === 'dirty'" class="w-3 h-3 mr-1 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
              <svg v-else-if="saveStatus === 'error'" class="w-3 h-3 mr-1 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{{ saveStatusText }}</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="!isFirstStep"
                @click="prevStep"
                :disabled="!canInteract"
                class="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                @click="triggerComponentNext"
                :disabled="primaryActionDisabled"
                class="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                :class="{ 'opacity-50 cursor-not-allowed': primaryActionDisabled }"
              >
                <svg v-if="primaryActionLoading" class="w-4 h-4 mr-2 inline-block animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                {{ primaryActionLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <aside
      v-if="isDesktopAIMounted"
      class="border-l border-gray-700 bg-gray-800 shrink-0 overflow-hidden w-80 h-screen hidden lg:flex flex-col"
      aria-label="AI legal assistant sidebar"
    >
      <ErrorBoundary fallbackMessage="AI Chat is temporarily unavailable">
        <AIGuide :embedded="true" instance-role="embedded" />
      </ErrorBoundary>
    </aside>

    <button
      ref="mobileAIButtonRef"
      class="fixed bottom-6 right-6 z-40 flex lg:hidden items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform duration-300"
      @click="openMobileAI"
      aria-label="Open AI legal assistant"
      :aria-expanded="showMobileAI"
    >
      <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <span
        v-if="aiChatStore.chatState.unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-gray-900 font-bold"
        :aria-label="`${aiChatStore.chatState.unreadCount} unread AI messages`"
      >
        {{ aiChatStore.chatState.unreadCount }}
      </span>
    </button>

    <teleport to="body">
      <transition name="sheet">
        <div
          v-if="showMobileAI"
          class="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
          role="dialog"
          aria-label="AI legal assistant"
          aria-modal="true"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeMobileAI()" aria-hidden="true" />
          <div class="sheet-panel relative h-[50vh] bg-gray-800 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl border-t border-gray-700">
            <div
              class="flex justify-center pt-3 pb-1 shrink-0 cursor-pointer"
              @click="closeMobileAI()"
              role="button"
              aria-label="Close AI assistant"
              tabindex="0"
              @keydown.enter="closeMobileAI()"
            >
              <div class="w-10 h-1 bg-gray-600 rounded-full" aria-hidden="true" />
            </div>
            <div class="flex-1 overflow-hidden">
              <ErrorBoundary fallbackMessage="AI Chat is temporarily unavailable">
                <AIGuide :embedded="true" instance-role="embedded" />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <div v-if="showValidationDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="closeValidationDialog" aria-hidden="true"></div>
      <div class="bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
        <div class="flex items-start space-x-4">
          <div class="bg-yellow-500/10 p-3 rounded-full shrink-0">
            <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white mb-2">Review Required</h3>
            <p class="text-gray-300 text-sm mb-6">{{ validationError }}</p>

            <div class="flex flex-col gap-3">
              <button
                @click="askAIForHelp"
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>Help Me Fix This (AI)</span>
              </button>
              <div class="flex space-x-3 mt-2">
                <button
                  @click="closeValidationDialog"
                  class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  @click="proceedNavigation"
                  :disabled="!canInteract"
                  class="flex-1 py-2 border border-gray-600 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade-slide">
      <div
        v-if="showCelebration"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.049 2.927C9.349 2.005 10.652 2.005 10.952 2.927l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" /></svg>
        <span class="font-medium">{{ celebrationMessage }}</span>
      </div>
    </transition>

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
            @click="handleSaveAndExit"
            :disabled="!canInteract"
            class="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>

    <div class="fixed bottom-24 right-4 lg:right-[340px] flex gap-2 z-30">
      <button
        @click="undo"
        :disabled="!canUndo || !canInteract"
        class="p-2 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm border border-gray-600 transition-all"
        title="Undo (Ctrl+Z)"
      >
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
      </button>
      <button
        @click="redo"
        :disabled="!canRedo || !canInteract"
        class="p-2 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm border border-gray-600 transition-all"
        title="Redo (Ctrl+Y)"
      >
        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"></path></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AIGuide from '../components/AIGuide.vue';
import { useIncorpIntakeStore } from '../stores/incorpIntake';
import { useAiChatStore } from '../stores/aiChat';
import { useIncorpSteps, type IncorpWizardStep } from '../composables/useIncorpSteps';
import { useIncorpValidation } from '../composables/useIncorpValidation';
import type { IncorporationData } from '../stores/incorpTypes';
import ErrorBoundary from '../components/common/ErrorBoundary.vue';
import { useToast } from '../composables/useToast';

const router = useRouter();
const route = useRoute();
const incorpStore = useIncorpIntakeStore();
const aiChatStore = useAiChatStore();
const { steps, currentStepIndex, getNextStep, getPrevStep, isFirstStep, isLastStep, currentStep } = useIncorpSteps();
const { getBlockingIssues, getStepStatus, validateStep, isStepComplete } = useIncorpValidation();
const { showToast } = useToast();

type ActiveIncorpStep = {
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

type PendingAdvanceState = {
    phase: 'afterLocal' | 'afterShared';
    targetIndex: number | null;
} | null;

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const getDesktopMatch = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width: 1024px)').matches;

const wizardContentRef = ref<HTMLElement | null>(null);
const mobileMenuButtonRef = ref<HTMLElement | null>(null);
const mobileAIButtonRef = ref<HTMLElement | null>(null);
const activeStepRef = ref<ActiveIncorpStep | null>(null);
const isBootstrapping = ref(true);
const isActionInFlight = ref(false);
const isRestoringHistory = ref(false);
const undoIteration = ref(0);
const transitionName = ref('slide-right');
const showMobileMenu = ref(false);
const showMobileAI = ref(false);
const isAISidebarVisible = ref(getDesktopMatch());
const showValidationDialog = ref(false);
const validationError = ref('');
const validationContext = ref('');
const pendingAdvance = ref<PendingAdvanceState>(null);
const showCelebration = ref(false);
const celebrationMessage = ref('');
const showTimeoutWarning = ref(false);
const timeoutCountdown = ref(120);
const bootstrapError = ref('');
const saveStatus = ref<SaveStatus>('idle');
const lastSaveTime = ref<Date | null>(null);
const saveTimeTick = ref(0);
const hasSaveError = ref(false);
const undoStack = ref<any[]>([]);
const redoStack = ref<any[]>([]);
const lastOverlayTriggerRef = ref<HTMLElement | null>(null);

let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let warningTimer: ReturnType<typeof setTimeout> | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let saveTickInterval: ReturnType<typeof setInterval> | null = null;
let mediaQueryList: MediaQueryList | null = null;
let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

const displayStepNumber = computed(() => currentStepIndex.value >= 0 ? currentStepIndex.value + 1 : 1);
const canInteract = computed(() => !isBootstrapping.value && !isActionInFlight.value);
const isDesktopAIMounted = computed(() => isAISidebarVisible.value);
const hasBlockingIssues = computed(() =>
    getBlockingIssues(incorpStore.incorpData as IncorporationData).length > 0
);
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);
const hasPendingStepChanges = () => Boolean(activeStepRef.value?.hasPendingChanges?.());

const syncSaveStatus = () => {
    if (incorpStore.isSaving || isActionInFlight.value) {
        saveStatus.value = 'saving';
        return;
    }
    if (hasSaveError.value || Boolean(incorpStore.lastSaveError)) {
        saveStatus.value = 'error';
        return;
    }
    if (hasPendingStepChanges()) {
        saveStatus.value = 'dirty';
        return;
    }
    if (lastSaveTime.value) {
        saveStatus.value = 'saved';
        return;
    }
    saveStatus.value = 'idle';
};

const markSaveSuccess = () => {
    hasSaveError.value = false;
    lastSaveTime.value = new Date();
    syncSaveStatus();
};

const markSaveError = () => {
    hasSaveError.value = true;
    syncSaveStatus();
};

const saveStatusText = computed(() => {
    void saveTimeTick.value;
    if (saveStatus.value === 'dirty') return 'Unsaved changes';
    if (saveStatus.value === 'saving') return 'Saving...';
    if (saveStatus.value === 'error') return 'Save failed';
    if (saveStatus.value === 'saved' && lastSaveTime.value) {
        const seconds = Math.floor((Date.now() - lastSaveTime.value.getTime()) / 1000);
        if (seconds < 5) return 'Saved just now';
        if (seconds < 60) return `Saved ${seconds}s ago`;
        return `Saved ${Math.floor(seconds / 60)}m ago`;
    }
    return 'Auto-save enabled';
});

const clearSessionTimer = () => {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (warningTimer) clearTimeout(warningTimer);
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
};

const startSessionTimer = () => {
    clearSessionTimer();

    warningTimer = setTimeout(() => {
        showTimeoutWarning.value = true;
        timeoutCountdown.value = 120;
        countdownInterval = setInterval(() => {
            timeoutCountdown.value--;
            if (timeoutCountdown.value <= 0 && countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }, 1000);
    }, 13 * 60 * 1000);

    sessionTimer = setTimeout(() => {
        void handleSessionTimeout();
    }, 15 * 60 * 1000);
};

const registerUserActivity = () => {
    if (isBootstrapping.value) return;
    showTimeoutWarning.value = false;
    timeoutCountdown.value = 120;
    startSessionTimer();
    syncSaveStatus();
};

const rememberOverlayTrigger = (element?: HTMLElement | null) => {
    const activeElement = element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    lastOverlayTriggerRef.value = activeElement;
};

const restoreOverlayFocus = () => {
    const target = lastOverlayTriggerRef.value;
    lastOverlayTriggerRef.value = null;
    if (target) {
        nextTick(() => target.focus());
    }
};

const openMobileMenu = () => {
    rememberOverlayTrigger(mobileMenuButtonRef.value);
    showMobileMenu.value = true;
    registerUserActivity();
};

const closeMobileMenu = (restoreFocus = true) => {
    if (!showMobileMenu.value) return;
    showMobileMenu.value = false;
    if (restoreFocus) {
        restoreOverlayFocus();
    }
};

const openMobileAI = () => {
    rememberOverlayTrigger(mobileAIButtonRef.value);
    showMobileAI.value = true;
    registerUserActivity();
};

const closeMobileAI = (restoreFocus = true) => {
    if (!showMobileAI.value) return;
    showMobileAI.value = false;
    if (restoreFocus) {
        restoreOverlayFocus();
    }
};

const openVisibleAI = () => {
    aiChatStore.chatState.isOpen = true;
    if (isAISidebarVisible.value) {
        return;
    }
    if (!showMobileAI.value) {
        rememberOverlayTrigger();
    }
    showMobileAI.value = true;
};

const closeValidationDialog = () => {
    showValidationDialog.value = false;
    validationError.value = '';
    validationContext.value = '';
    pendingAdvance.value = null;
};

const openValidationDialog = (
    message: string,
    context: string,
    phase: NonNullable<PendingAdvanceState>['phase'],
    targetIndex: number | null
) => {
    validationError.value = message;
    validationContext.value = context;
    pendingAdvance.value = { phase, targetIndex };
    showValidationDialog.value = true;
};

const recordUndoSnapshot = () => {
    if (isRestoringHistory.value) return;

    const snapshot = JSON.stringify(incorpStore.incorpData);
    const lastSnapshot = undoStack.value.length > 0
        ? JSON.stringify(undoStack.value[undoStack.value.length - 1])
        : null;

    if (snapshot === lastSnapshot) return;

    undoStack.value.push(JSON.parse(snapshot));
    redoStack.value = [];
    if (undoStack.value.length > 10) {
        undoStack.value.shift();
    }
};

const runGuardedAction = async (
    action: () => Promise<void>,
    errorMessage: string,
    markErrorOnFailure = true
) => {
    if (!canInteract.value) return false;

    isActionInFlight.value = true;
    syncSaveStatus();
    try {
        await action();
        return true;
    } catch (error) {
        console.error(errorMessage, error);
        if (markErrorOnFailure) {
            markSaveError();
        }
        showToast(errorMessage, 'error');
        return false;
    } finally {
        isActionInFlight.value = false;
        syncSaveStatus();
    }
};

const commitActiveStep = async (flush = false) => {
    const activeStep = activeStepRef.value;
    if (!activeStep?.commitStep) return false;

    const shouldCommit = !flush || !activeStep.hasPendingChanges || activeStep.hasPendingChanges();
    if (!shouldCommit) {
        syncSaveStatus();
        return false;
    }

    await activeStep.commitStep(flush);
    markSaveSuccess();
    return true;
};

const flushActiveStepAndRecord = async () => {
    const committed = await commitActiveStep(true);
    if (committed) {
        recordUndoSnapshot();
    }
    return committed;
};

const progressPercent = computed(() => {
    let completed = 0;
    const countableSteps = steps.value.filter((step) => step.context !== 'review');
    if (countableSteps.length === 0) {
        return 0;
    }

    countableSteps.forEach((step) => {
        if (isStepComplete(step.context, incorpStore.incorpData as IncorporationData)) {
            completed++;
        }
    });
    return Math.round((completed / countableSteps.length) * 100);
});

const getStepStatusDisplay = (step: IncorpWizardStep) => {
    if (step.context === 'review') {
        return hasBlockingIssues.value ? 'warning' : 'pending';
    }
    return getStepStatus(step.context, incorpStore.incorpData as IncorporationData);
};

const resolveStepPath = (index: number | null) => {
    if (index === null || index < 0) {
        return getNextStep()?.path ?? null;
    }
    return steps.value[index]?.path ?? null;
};

const finalizeAdvance = async (targetIndex: number | null = null) => {
    const completedStep = currentStep.value;
    const targetPath = resolveStepPath(targetIndex);
    if (!targetPath) {
        closeValidationDialog();
        return;
    }

    closeValidationDialog();
    recordUndoSnapshot();

    if (completedStep && getStepStatusDisplay(completedStep) === 'complete') {
        celebrationMessage.value = `${completedStep.label} complete!`;
        showCelebration.value = true;
        if (celebrationTimer) {
            clearTimeout(celebrationTimer);
        }
        celebrationTimer = setTimeout(() => {
            showCelebration.value = false;
        }, 2000);
    }

    registerUserActivity();
    transitionName.value = 'slide-right';
    await router.push(`/incorporation/${targetPath}`);
};

const continueAdvanceAfterLocal = async (targetIndex: number | null = null) => {
    await flushActiveStepAndRecord();

    const canContinue = await activeStepRef.value?.afterCommitContinue?.();
    if (canContinue === false) {
        closeValidationDialog();
        return;
    }

    const step = currentStep.value;
    if (step?.context && step.context !== 'review') {
        const warning = validateStep(step.context, incorpStore.incorpData as IncorporationData);
        if (warning) {
            openValidationDialog(warning, step.context, 'afterShared', targetIndex);
            return;
        }
    }

    await finalizeAdvance(targetIndex);
};

const attemptAdvance = async (targetIndex: number | null = null) => {
    const step = currentStep.value;
    if (!step) return;

    await runGuardedAction(async () => {
        const localWarning = activeStepRef.value?.validateLocal?.();
        if (localWarning) {
            openValidationDialog(localWarning, step.context, 'afterLocal', targetIndex);
            return;
        }

        await continueAdvanceAfterLocal(targetIndex);
    }, 'Unable to continue right now.');
};

const isStepNavigationDisabled = (index: number) => {
    if (isBootstrapping.value || isActionInFlight.value || currentStepIndex.value === -1) {
        return true;
    }

    if (index === currentStepIndex.value) {
        return false;
    }

    return index > currentStepIndex.value + 1;
};

const attemptNavigate = async (index: number) => {
    showMobileMenu.value = false;

    const step = steps.value[index];
    if (!step || isStepNavigationDisabled(index) || currentStepIndex.value === -1) {
        return;
    }

    if (index === currentStepIndex.value) {
        return;
    }

    if (index > currentStepIndex.value) {
        await attemptAdvance(index);
        return;
    }

    await runGuardedAction(async () => {
        await flushActiveStepAndRecord();
        registerUserActivity();
        transitionName.value = 'slide-left';
        await router.push(`/incorporation/${step.path}`);
    }, 'Unable to change steps right now.');
};

const proceedNavigation = async () => {
    const state = pendingAdvance.value;
    if (!state) return;

    await runGuardedAction(async () => {
        if (state.phase === 'afterLocal') {
            await continueAdvanceAfterLocal(state.targetIndex);
            return;
        }

        await finalizeAdvance(state.targetIndex);
    }, 'Unable to continue right now.');
};

const nextStep = async () => {
    await attemptAdvance();
};

const prevStep = async () => {
    const previous = getPrevStep();
    if (!previous) return;

    await runGuardedAction(async () => {
        await flushActiveStepAndRecord();
        registerUserActivity();
        transitionName.value = 'slide-left';
        await router.push(`/incorporation/${previous.path}`);
    }, 'Unable to go back right now.');
};

const triggerComponentNext = async () => {
    if (primaryActionDisabled.value) {
        return;
    }

    if (currentStep.value?.context === 'review') {
        await runGuardedAction(async () => {
            await activeStepRef.value?.triggerPrimaryAction?.();
            registerUserActivity();
        }, 'Unable to submit right now.', false);
        return;
    }

    await attemptAdvance();
};

const askAIForHelp = async () => {
    const issue = validationError.value;
    const context = validationContext.value;

    closeValidationDialog();
    openVisibleAI();

    try {
        await aiChatStore.sendAIMessage(
            `Explain the validation issue: "${issue}" in the "${context}" section of our incorporation. How do I fix it?`,
            {
                intakeData: incorpStore.incorpData,
                contextStep: context,
                flow: 'incorporation',
            }
        );
    } catch (error) {
        console.error('Unable to open AI help', error);
        showToast('Unable to open AI help right now.', 'error');
    }
};

const markUnsure = async () => {
    const step = currentStep.value;
    if (!step || !step.context) return;

    const currentUnsure = incorpStore.incorpData.unsureFlags || [];
    const needsSave = !currentUnsure.includes(step.context);

    const saved = await runGuardedAction(async () => {
        if (needsSave) {
            await incorpStore.saveIncorpStep({
                unsureFlags: [...currentUnsure, step.context],
            });
            markSaveSuccess();
            recordUndoSnapshot();
        }
        registerUserActivity();
    }, 'Unable to save your progress right now.');

    if (!saved) {
        return;
    }

    openVisibleAI();

    try {
        await aiChatStore.sendAIMessage(
            `The user is unsure about the "${step.label}" section. Explain what's needed and why it matters for their incorporation under ${incorpStore.incorpData.preIncorporation?.jurisdiction?.toUpperCase() || 'OBCA/CBCA'}.`,
            {
                intakeData: incorpStore.incorpData,
                contextStep: step.context,
                flow: 'incorporation',
            }
        );
    } catch (error) {
        console.error('Unable to open AI help', error);
        showToast('Unable to open AI help right now.', 'error');
    }
};

const undo = async () => {
    const previousState = undoStack.value[undoStack.value.length - 1];
    if (!previousState) return;

    await runGuardedAction(async () => {
        const currentState = JSON.parse(JSON.stringify(incorpStore.incorpData));
        isRestoringHistory.value = true;
        try {
            await commitActiveStep(true);
            await incorpStore.saveIncorpStep(previousState, true);
            undoStack.value.pop();
            redoStack.value.push(currentState);
            markSaveSuccess();
            undoIteration.value++;
        } finally {
            isRestoringHistory.value = false;
        }
    }, 'Undo failed. Please try again.');
};

const redo = async () => {
    const nextState = redoStack.value[redoStack.value.length - 1];
    if (!nextState) return;

    await runGuardedAction(async () => {
        const currentState = JSON.parse(JSON.stringify(incorpStore.incorpData));
        isRestoringHistory.value = true;
        try {
            await commitActiveStep(true);
            await incorpStore.saveIncorpStep(nextState, true);
            redoStack.value.pop();
            undoStack.value.push(currentState);
            markSaveSuccess();
            undoIteration.value++;
        } finally {
            isRestoringHistory.value = false;
        }
    }, 'Redo failed. Please try again.');
};

const handleSaveAndExit = async () => {
    await runGuardedAction(async () => {
        showTimeoutWarning.value = false;
        await flushActiveStepAndRecord();
        await router.push('/dashboard');
    }, 'Unable to save and exit right now.');
};

const handleSessionTimeout = async () => {
    await runGuardedAction(async () => {
        await flushActiveStepAndRecord();
        await router.push('/dashboard');
    }, 'Unable to save your work before timeout.');
};

const extendSession = () => {
    showTimeoutWarning.value = false;
    timeoutCountdown.value = 120;
    registerUserActivity();
};

const scrollToTop = () => {
    wizardContentRef.value?.scrollTo({ top: 0, behavior: 'auto' });
};

const primaryActionState = computed(() =>
    activeStepRef.value?.getPrimaryActionState?.() ?? {}
);

const primaryActionDisabled = computed(() =>
    !canInteract.value ||
    currentStepIndex.value === -1 ||
    Boolean(primaryActionState.value.disabled)
);

const primaryActionLoading = computed(() =>
    isActionInFlight.value || Boolean(primaryActionState.value.loading)
);

const primaryActionLabel = computed(() => {
    if (primaryActionState.value.label) {
        return primaryActionState.value.label;
    }
    return isLastStep.value ? 'Submit' : 'Continue';
});

const getFallbackStepPath = () => {
    const savedStep = steps.value.find((step) => step.path === incorpStore.currentStep)?.path;
    return savedStep ?? steps.value[0]?.path ?? 'jurisdiction-name';
};

const reconcileRoute = async () => {
    const fallbackPath = getFallbackStepPath();
    if (route.path === '/incorporation') {
        await router.replace(`/incorporation/${fallbackPath}`);
        return;
    }

    if (route.path.startsWith('/incorporation/') && currentStepIndex.value === -1) {
        await router.replace(`/incorporation/${fallbackPath}`);
        return;
    }

    if (currentStep.value) {
        incorpStore.setCurrentStep(currentStep.value.path);
    }
};

const isEditableTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return Boolean(
        element.closest('input, textarea, select, button, a, [role="button"], [role="dialog"]') ||
        element.isContentEditable
    );
};

const closeTopOverlay = () => {
    if (showMobileAI.value) {
        closeMobileAI();
        return true;
    }
    if (showMobileMenu.value) {
        closeMobileMenu();
        return true;
    }
    return false;
};

const handleKeyboardActivity = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(event.key)) return;
    registerUserActivity();
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeTopOverlay()) {
        event.preventDefault();
        return;
    }

    if (event.key !== 'Enter' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
    }

    if (!canInteract.value || showMobileMenu.value || showMobileAI.value || showValidationDialog.value || showTimeoutWarning.value) {
        return;
    }

    if (isEditableTarget(event.target)) {
        return;
    }

    if ((event.key === 'Enter' || event.key === 'ArrowRight') && primaryActionDisabled.value) {
        return;
    }

    event.preventDefault();
    if (event.key === 'ArrowLeft') {
        void prevStep();
        return;
    }
    void triggerComponentNext();
};

const handlePointerActivity = () => registerUserActivity();
const handleFocusActivity = () => registerUserActivity();
const handleScrollActivity = () => registerUserActivity();

const getLoadErrorMessage = (error: unknown) =>
    (error as any)?.response?.data?.message || 'Please check your connection and try again.';

const bootstrapWizard = async (force = false) => {
    isBootstrapping.value = true;
    bootstrapError.value = '';

    try {
        await incorpStore.ensureLoaded(force);
        await reconcileRoute();
    } catch (error) {
        bootstrapError.value = getLoadErrorMessage(error);
    } finally {
        isBootstrapping.value = false;
        syncSaveStatus();
    }
};

const retryBootstrap = async () => {
    await bootstrapWizard(true);
};

watch(() => incorpStore.isSaving, () => {
    syncSaveStatus();
}, { immediate: true });

watch(() => route.path, async () => {
    if (route.path.startsWith('/incorporation/')) {
        if (currentStepIndex.value === -1 && !isBootstrapping.value) {
            await router.replace(`/incorporation/${getFallbackStepPath()}`);
            return;
        }
        if (currentStep.value) {
            incorpStore.setCurrentStep(currentStep.value.path);
        }
    }

    showMobileMenu.value = false;
    syncSaveStatus();
});

watch(() => currentStepIndex.value, (newIndex, oldIndex) => {
    if (newIndex === -1 || oldIndex === -1) {
        return;
    }
    transitionName.value = newIndex > oldIndex ? 'slide-right' : 'slide-left';
});

onMounted(async () => {
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyboardActivity);
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('pointerdown', handlePointerActivity, true);
        window.addEventListener('focusin', handleFocusActivity);

        if (typeof window.matchMedia === 'function') {
            mediaQueryList = window.matchMedia('(min-width: 1024px)');
            isAISidebarVisible.value = mediaQueryList.matches;
            mediaQueryListener = (event) => {
                isAISidebarVisible.value = event.matches;
                if (event.matches) {
                    closeMobileAI(false);
                }
            };
            mediaQueryList.addEventListener('change', mediaQueryListener);
        }
    }

    saveTickInterval = setInterval(() => {
        saveTimeTick.value++;
        syncSaveStatus();
    }, 15000);

    startSessionTimer();
    await nextTick();
    wizardContentRef.value?.addEventListener('scroll', handleScrollActivity, { passive: true });

    await bootstrapWizard();
});

onUnmounted(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyboardActivity);
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('pointerdown', handlePointerActivity, true);
        window.removeEventListener('focusin', handleFocusActivity);
    }

    wizardContentRef.value?.removeEventListener('scroll', handleScrollActivity);
    clearSessionTimer();

    if (saveTickInterval) {
        clearInterval(saveTickInterval);
    }
    if (celebrationTimer) {
        clearTimeout(celebrationTimer);
    }
    if (mediaQueryList && mediaQueryListener) {
        mediaQueryList.removeEventListener('change', mediaQueryListener);
    }
});
</script>

<style scoped>
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

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
</style>
