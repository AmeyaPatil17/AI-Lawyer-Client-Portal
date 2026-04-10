<template>
  <div class="min-h-screen bg-gray-900 text-white p-6 md:p-12 relative overflow-hidden font-sans">

    <!-- Dynamic Background (decorative) -->
    <div aria-hidden="true" class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div class="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[80px]"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[80px]"></div>
    </div>

    <div class="max-w-6xl mx-auto">

      <!-- Header -->
      <header class="flex flex-col md:flex-row md:items-center justify-between mb-12 animate-slide-up">
        <div>
          <p class="text-xs font-semibold text-blue-400/70 uppercase tracking-widest mb-1">Valiant Law Client Portal</p>
          <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
            Welcome Back{{ userName ? `, ${userName}` : '' }}
          </h1>
          <p class="text-gray-400 mt-2 text-lg transition-all duration-500">{{ smartGreeting }}</p>
        </div>
      </header>

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <SkeletonLoader variant="card" :lines="4" />
          <SkeletonLoader variant="card" :lines="4" />
        </div>
        <div class="space-y-6">
          <SkeletonLoader variant="card" :lines="6" />
        </div>
      </div>

      <!-- Fetch Error State -->
      <div
        v-else-if="fetchError"
        class="flex flex-col items-center justify-center py-20 text-center"
        role="alert"
      >
        <div class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-white font-semibold text-lg mb-2">Unable to Load Dashboard</h2>
        <p class="text-gray-400 text-sm mb-6 max-w-xs">We couldn't reach the server. Check your connection and try again.</p>
        <button
          id="dashboard-retry-btn"
          @click="fetchIntakes"
          class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>

      <!-- Main Content -->
      <main v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- ── Main Column ─────────────────────────────────────── -->
        <div class="lg:col-span-2 space-y-8 animate-slide-up" style="animation-delay: 100ms">

          <!-- ══ SECTION: Zero-State Hero ══ -->
          <section
            v-if="activeIntakes.length === 0"
            aria-label="Get started"
            class="glass-panel rounded-2xl border border-blue-500/20 p-10 text-center relative overflow-hidden"
          >
            <!-- Background glow -->
            <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-transparent pointer-events-none"></div>

            <div class="relative z-10">
              <div aria-hidden="true" class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/20 flex items-center justify-center mb-5">
                <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-white mb-2">Start Your Legal Journey</h2>
              <p class="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
                Choose a service below. Our team reviews every submission, then a Valiant Law lawyer reaches out to finalize your documents.
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <router-link
                  id="hero-cta-estate"
                  to="/triage"
                  class="flex items-center gap-3 p-4 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-400/50 rounded-xl transition-all group"
                >
                  <div class="w-9 h-9 bg-violet-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                  <div class="text-left">
                    <p class="text-white font-semibold text-sm">Wills &amp; Estates</p>
                    <p class="text-violet-300/70 text-xs">Protect your legacy</p>
                  </div>
                </router-link>
                <router-link
                  id="hero-cta-incorp"
                  to="/incorp-triage"
                  class="flex items-center gap-3 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl transition-all group"
                >
                  <div class="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div class="text-left">
                    <p class="text-white font-semibold text-sm">Incorporation</p>
                    <p class="text-emerald-300/70 text-xs">Start your business</p>
                  </div>
                </router-link>
              </div>
            </div>
          </section>

          <!-- ══ SECTION: Active Submissions ══ -->
          <section v-if="activeIntakes.length > 0" aria-label="Your active submissions">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Your Active Submissions</h2>

            <!-- Intake Cards -->
            <div
              v-for="intake in activeIntakes"
              :key="intake._id"
              class="glass-panel p-6 rounded-2xl border shadow-2xl relative overflow-hidden group transition-colors mb-6"
              :class="intake.type === 'incorporation'
                ? 'border-emerald-500/20 hover:border-emerald-500/40'
                : 'border-violet-500/20 hover:border-violet-500/40'"
            >
              <!-- Background accent -->
              <div
                aria-hidden="true"
                class="absolute right-0 top-0 w-48 h-48 bg-gradient-to-br from-transparent rounded-bl-full -z-10"
                :class="intake.type === 'incorporation' ? 'from-emerald-500/5' : 'from-violet-500/5'"
              ></div>

              <!-- Card Header -->
              <div class="flex items-start gap-4 mb-4">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  :class="intake.type === 'incorporation'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-violet-500/15 text-violet-400'"
                >
                  <svg v-if="intake.type === 'incorporation'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <p
                        class="text-xs font-semibold uppercase tracking-widest mb-0.5"
                        :class="intake.type === 'incorporation' ? 'text-emerald-400' : 'text-violet-400'"
                      >
                        {{ intake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning' }}
                      </p>
                      <h3 class="text-lg font-bold text-white">
                        {{ getProgress(intake) === 100 ? 'Questionnaire Complete' : 'Resume Questionnaire' }}
                      </h3>
                      <!-- Last updated timestamp -->
                      <p
                        class="text-xs text-gray-500 mt-0.5"
                        :title="formatAbsoluteDate(intake.updatedAt)"
                      >
                        Updated {{ formatRelativeTime(intake.updatedAt) }}
                      </p>
                    </div>

                    <!-- Status Badge + Flag Badges -->
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                      <div
                        class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                        :class="statusBadgeClass(intake.status)"
                      >
                        <span
                          class="w-2 h-2 rounded-full"
                          :class="[statusDotClass(intake.status), intake.status === 'started' ? 'animate-pulse' : '']"
                        ></span>
                        <span>{{ statusLabel(intake.status) }}</span>
                      </div>

                      <!-- Hard flag badge -->
                      <button
                        v-if="hardFlagCount(intake) > 0"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-900/40 border border-red-500/40 text-red-300 hover:bg-red-900/60 transition-colors"
                        :aria-label="`${hardFlagCount(intake)} critical flag${hardFlagCount(intake) > 1 ? 's' : ''} — click for details`"
                        @click="toggleFlags(intake._id)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        {{ hardFlagCount(intake) }} Critical
                      </button>

                      <!-- Soft flag badge -->
                      <button
                        v-if="softFlagCount(intake) > 0"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-900/40 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60 transition-colors"
                        :aria-label="`${softFlagCount(intake)} attention item${softFlagCount(intake) > 1 ? 's' : ''} — click for details`"
                        @click="toggleFlags(intake._id)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ softFlagCount(intake) }} Attention
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progress Bar (only show when in-progress) -->
              <div v-if="intake.status === 'started'" class="mb-5">
                <div class="flex justify-between text-xs mb-2">
                  <span class="text-gray-400">Completion Status</span>
                  <span
                    class="font-mono"
                    :class="intake.type === 'incorporation' ? 'text-emerald-300' : 'text-violet-300'"
                  >{{ getProgress(intake) }}%</span>
                </div>
                <div
                  class="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  :aria-valuenow="getProgress(intake)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`${intake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning'} questionnaire completion: ${getProgress(intake)}%`"
                >
                  <div
                    class="h-2 rounded-full transition-all duration-1000 ease-out"
                    :class="intake.type === 'incorporation'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-400'
                      : 'bg-gradient-to-r from-violet-500 to-blue-500'"
                    :style="{ width: getProgress(intake) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Submitted/Reviewing/Completed banner -->
              <div
                v-else
                class="mb-5 px-4 py-3 rounded-lg text-sm"
                :class="statusBannerClass(intake.status)"
              >
                {{ statusBannerMessage(intake.status) }}
                <!-- G4: lifecycle timestamps -->
                <span v-if="intake.submittedAt && intake.status === 'submitted'" class="block text-xs opacity-60 mt-1">
                  Submitted {{ formatRelativeTime(intake.submittedAt) }}
                </span>
                <span v-if="intake.completedAt && intake.status === 'completed'" class="block text-xs opacity-60 mt-1">
                  Completed {{ formatRelativeTime(intake.completedAt) }}
                </span>
              </div>

              <!-- ── Flag Details Panel (toggled by badge click) ── -->
              <div
                v-if="expandedFlagsId === intake._id && hasAnyFlags(intake)"
                class="mb-5 rounded-xl border border-gray-700/60 bg-gray-800/60 divide-y divide-gray-700/40 overflow-hidden"
              >
                <div class="px-4 py-2.5 flex items-center justify-between">
                  <p class="text-xs font-semibold text-gray-300 uppercase tracking-wider">Review Flags</p>
                  <button
                    @click="expandedFlagsId = null"
                    class="text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Close flag details"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <div
                  v-for="flag in intake.flags"
                  :key="flag.code"
                  class="px-4 py-3"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="mt-0.5 shrink-0 w-2 h-2 rounded-full"
                      :class="flag.type === 'hard' ? 'bg-red-400' : 'bg-amber-400'"
                      aria-hidden="true"
                    ></span>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-semibold" :class="flag.type === 'hard' ? 'text-red-300' : 'text-amber-300'">
                        {{ flag.code }}
                      </p>
                      <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ flag.message }}</p>
                      <!-- GAP 1b: AI Explain Flag -->
                      <div class="mt-2">
                        <button
                          v-if="!flagExplanation[`${intake._id}:${flag.code}`]"
                          :id="`explain-flag-${intake._id}-${flag.code}`"
                          @click="explainFlag(intake, flag.code)"
                          :disabled="flagExplaining[`${intake._id}:${flag.code}`]"
                          class="inline-flex items-center gap-1 text-xs font-medium text-blue-400/80 hover:text-blue-300 disabled:opacity-50 disabled:cursor-wait transition-colors"
                        >
                          <svg v-if="!flagExplaining[`${intake._id}:${flag.code}`]" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.346a3.857 3.857 0 01-5.381 0l-.345-.346z"/>
                          </svg>
                          <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          {{ flagExplaining[`${intake._id}:${flag.code}`] ? 'Asking AI…' : 'Explain this flag' }}
                        </button>
                        <p
                          v-else
                          class="text-xs text-gray-300 leading-relaxed mt-1 pl-3 border-l border-blue-500/30"
                        >
                          {{ flagExplanation[`${intake._id}:${flag.code}`] }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── AI Summary Panel ── -->
              <div
                v-if="intake.status !== 'started'"
                class="mb-5"
              >
                <!-- Not yet loaded -->
                <button
                  v-if="!summaryState[intake._id]"
                  :id="`summary-btn-${intake._id}`"
                  @click="fetchSummary(intake)"
                  :disabled="summaryLoading[intake._id]"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-wait transition-colors"
                >
                  <svg v-if="!summaryLoading[intake._id]" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.346a3.857 3.857 0 01-5.381 0l-.345-.346z"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {{ summaryLoading[intake._id] ? 'Generating summary…' : 'View AI Summary' }}
                </button>

                <!-- Summary loaded -->
                <div
                  v-else
                  class="rounded-xl border border-blue-500/20 bg-blue-900/10 p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.346a3.857 3.857 0 01-5.381 0l-.345-.346z"/>
                      </svg>
                      AI Summary
                    </p>
                    <button
                      @click="summaryState[intake._id] = ''"
                      class="text-gray-500 hover:text-gray-300 transition-colors text-xs"
                      aria-label="Dismiss AI summary"
                    >Hide</button>
                  </div>
                  <p class="text-xs text-gray-300 leading-relaxed">{{ summaryState[intake._id] }}</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap gap-3 pt-4 border-t border-gray-700/50">
                <!-- Primary CTA -->
                <!-- Bug 6 fix: use router-link so middle-click / Ctrl+click works correctly -->
                <router-link
                  :to="getResumeLink(intake)"
                  :id="`intake-action-${intake._id}`"
                  @click="setIntakeStorage(intake)"
                  class="px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors"
                  :class="intake.type === 'incorporation'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-violet-600 hover:bg-violet-500'"
                  :aria-label="`${ctaLabel(intake)} — ${intake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning'}`"
                >
                  {{ ctaLabel(intake) }}
                </router-link>

                <!-- DOCX Download (reviewing / completed only) -->
                <a
                  v-if="intake.status === 'reviewing' || intake.status === 'completed'"
                  :id="`doc-download-${intake._id}`"
                  :href="`/api/intake/${intake._id}/doc`"
                  download
                  class="inline-flex items-center gap-1.5 px-4 py-2 text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-500 transition-all"
                  :aria-label="`Download ${intake.type === 'incorporation' ? 'incorporation' : 'will'} documents`"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Download Documents
                </a>

                <!-- Start Over (only for 'started' drafts) -->
                <button
                  v-if="intake.status === 'started'"
                  :id="`intake-reset-${intake._id}`"
                  @click="confirmReset(intake)"
                  :disabled="resettingId === intake._id"
                  class="px-4 py-2 text-gray-400 hover:text-red-400 text-sm font-medium rounded-lg border border-gray-700 hover:border-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="`Start over with ${intake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning'} questionnaire`"
                >
                  {{ resettingId === intake._id ? 'Resetting…' : 'Start Over' }}
                </button>
              </div>
            </div>
          </section>

          <!-- ══ SECTION: Start a New Service ══ -->
          <section aria-label="Start a new service">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Start a New Service</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <!-- Estate Planning CTA -->
              <div
                class="glass-panel p-5 rounded-2xl border transition-colors group"
                :class="hasActiveIntakeOfType('will')
                  ? 'border-gray-700 opacity-60 cursor-not-allowed'
                  : 'border-gray-700 hover:border-violet-500/40'"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-8 h-8 bg-violet-500/15 rounded-lg flex items-center justify-center" :class="!hasActiveIntakeOfType('will') && 'group-hover:scale-110 transition-transform'">
                    <svg class="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                  <h3 class="font-semibold text-white text-sm">Wills &amp; Estates</h3>
                </div>
                <p class="text-xs text-gray-400 mb-4 line-clamp-2">Protect your family and outline your lasting legacy with a legally-binding will.</p>
                <p v-if="hasActiveIntakeOfType('will')" class="text-xs text-amber-400/80 font-medium">
                  You already have an active will intake.
                </p>
                <router-link
                  v-else
                  id="cta-estate"
                  to="/triage"
                  class="inline-flex items-center text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Begin Intake
                  <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
              </div>

              <!-- Incorporation CTA -->
              <div
                class="glass-panel p-5 rounded-2xl border transition-colors group"
                :class="hasActiveIntakeOfType('incorporation')
                  ? 'border-gray-700 opacity-60 cursor-not-allowed'
                  : 'border-gray-700 hover:border-emerald-500/40'"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center" :class="!hasActiveIntakeOfType('incorporation') && 'group-hover:scale-110 transition-transform'">
                    <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <h3 class="font-semibold text-white text-sm">Incorporation</h3>
                </div>
                <p class="text-xs text-gray-400 mb-4 line-clamp-2">Incorporate your new business under provincial (OBCA) or federal laws.</p>
                <p v-if="hasActiveIntakeOfType('incorporation')" class="text-xs text-amber-400/80 font-medium">
                  You already have an active incorporation intake.
                </p>
                <router-link
                  v-else
                  id="cta-incorp"
                  to="/incorp-triage"
                  class="inline-flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Begin Intake
                  <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
              </div>
            </div>
          </section>

          <!-- ══ Dynamic "How It Works" Timeline ══ -->
          <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm mt-8">
            <h3 class="text-lg font-semibold mb-5 text-gray-200">Your Progress</h3>
            <ol role="list" class="space-y-5">

              <!-- Step 1: Account Created -->
              <li class="flex gap-4" role="listitem">
                <div class="flex flex-col items-center" aria-hidden="true">
                  <div class="w-8 h-8 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center text-green-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div class="w-0.5 h-full bg-gray-700 my-2"></div>
                </div>
                <div class="pb-1">
                  <h4 class="text-sm font-medium text-white">Account Created</h4>
                  <p class="text-xs text-gray-500">Your secure portal account is set up.</p>
                </div>
              </li>

              <!-- Step 2: Submit Information -->
              <li class="flex gap-4" role="listitem">
                <div class="flex flex-col items-center" aria-hidden="true">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="timelineStep2Class"
                  >
                    <svg v-if="journeyStep >= 2" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span v-else class="text-xs font-mono">2</span>
                  </div>
                  <div class="w-0.5 h-full bg-gray-700 my-2 opacity-40"></div>
                </div>
                <div class="pb-1">
                  <h4 class="text-sm font-medium text-white">Submit Information</h4>
                  <p class="text-xs text-gray-500">Choose a service and securely complete its questionnaire.</p>
                </div>
              </li>

              <!-- Step 3: Lawyer Review -->
              <li class="flex gap-4" role="listitem" :class="journeyStep < 2 ? 'opacity-50' : ''">
                <div aria-hidden="true">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="timelineStep3Class"
                  >
                    <svg v-if="journeyStep >= 3" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span v-else class="text-xs font-mono">3</span>
                  </div>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-white">Lawyer Review</h4>
                  <p class="text-xs text-gray-500">A Valiant Law lawyer finalises your documents and reaches out.</p>
                </div>
              </li>

            </ol>
          </div>

        </div>

        <!-- ── Sidebar ─────────────────────────────────────────── -->
        <aside class="space-y-6 animate-slide-up" style="animation-delay: 200ms" aria-label="Status and activity">

          <!-- What's Next Panel -->
          <div class="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 backdrop-blur-sm">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">What's Next</h3>

            <!-- G2: AI Insight loading skeleton -->
            <div
              v-if="aiInsightLoading"
              class="space-y-2 animate-pulse"
              role="status"
              aria-busy="true"
              aria-label="Loading AI insight"
            >
              <div class="h-3 bg-gray-700 rounded w-3/4"></div>
              <div class="h-3 bg-gray-700 rounded w-full"></div>
              <div class="h-3 bg-gray-700 rounded w-5/6"></div>
            </div>

            <!-- G2: AI Insight (live) -->
            <div v-else-if="aiInsight" class="flex items-start gap-3">
              <div class="p-2 rounded-lg shrink-0" :class="whatsNextIconBg">
                <svg class="w-5 h-5" :class="whatsNextIconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="whatsNextIcon" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-white mb-1">Your Next Step</p>
                <p class="text-xs text-gray-300 leading-relaxed">{{ aiInsight.insight }}</p>
                <router-link
                  v-if="aiInsightActionLink"
                  :to="aiInsightActionLink"
                  id="ai-insight-link"
                  class="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {{ aiInsightActionLabel }}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
              </div>
            </div>

            <!-- Fallback: hardcoded What's Next -->
            <div v-else class="flex items-start gap-3">
              <div class="p-2 rounded-lg shrink-0" :class="whatsNextIconBg">
                <svg class="w-5 h-5" :class="whatsNextIconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="whatsNextIcon" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-white mb-1">{{ whatsNext.title }}</p>
                <p class="text-xs text-gray-400 leading-relaxed">{{ whatsNext.body }}</p>
                <router-link
                  v-if="whatsNext.link"
                  :to="whatsNext.link"
                  class="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {{ whatsNext.linkLabel }}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
              </div>
            </div>
          </div>

          <!-- Recent Activity Panel -->
          <div class="bg-gray-800/60 border border-gray-700/60 rounded-xl p-5 backdrop-blur-sm">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Recent Activity</h3>

            <div v-if="recentActivity.length === 0" class="text-center py-4">
              <p class="text-xs text-gray-600">No activity yet. Start a service to begin.</p>
            </div>

            <!-- GAP 4: aria-live so screen readers announce new activity events (e.g. after Socket.IO update) -->
            <ol
              v-else
              role="list"
              aria-live="polite"
              aria-label="Recent account activity"
              class="space-y-4"
            >
              <li
                v-for="(event, i) in recentActivity"
                :key="i"
                role="listitem"
                class="flex items-start gap-3"
              >
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  :class="event.dotClass"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0">
                  <p class="text-xs text-gray-300 leading-snug">{{ event.label }}</p>
                  <p class="text-xs text-gray-600 mt-0.5">{{ event.time }}</p>
                </div>
              </li>
            </ol>
          </div>

          <!-- Secure Portal Info -->
          <div class="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 p-5 rounded-xl">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-indigo-100 text-sm">Secure Portal</h4>
                <p class="text-xs text-indigo-300/80 mt-1 leading-relaxed">
                  All your data is encrypted at rest and in transit. Questions? Use the Help menu or contact our team.
                </p>
              </div>
            </div>
          </div>

        </aside>

      </main>
    </div>

    <!-- Reset Confirmation Dialog -->
    <!-- Bug 5 fix: Escape key closes, click-outside closes, focus moved into dialog -->
    <!-- GAP 4: Focus trap with @keydown.tab to cycle between Cancel and Confirm -->
    <div
      v-if="resetConfirmIntake"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="`Confirm reset for ${resetConfirmIntake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning'}`"
      @keydown.esc="closeResetConfirm"
      @keydown.tab.prevent="trapFocus"
      @click.self="closeResetConfirm"
    >
      <div class="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slide-up">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-white font-bold text-base">Start Over?</h2>
        </div>
        <p class="text-gray-400 text-sm mb-6">
          This will permanently delete your
          <strong class="text-white">{{ resetConfirmIntake.type === 'incorporation' ? 'Business Incorporation' : 'Wills & Estate Planning' }}</strong>
          draft and all progress. This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <button
            id="reset-confirm-btn"
            ref="confirmBtnRef"
            @click="handleReset"
            :disabled="resettingId !== null"
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {{ resettingId ? 'Deleting…' : 'Yes, Start Over' }}
          </button>
          <button
            id="reset-cancel-btn"
            ref="cancelBtnRef"
            @click="closeResetConfirm"
            class="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';
// Bug 1+2 fix: we import the validation functions directly (not the composables)
// that tie themselves to a global store. We keep the composables only for their
// isStepComplete helper — passing intake.data explicitly each time.
import { useClientMatterRouting } from '../composables/useClientMatterRouting';
import { useToast } from '../composables/useToast';
import SkeletonLoader from '../components/common/SkeletonLoader.vue';
import api from '../api';
import type { ClientIntake } from '../types/clientIntake';
import { formatRelativeTime, formatAbsoluteDate } from '../utils/formatRelativeTime';

// ── Meta ──────────────────────────────────────────────────────────────────────
let socket: Socket | null = null;

onMounted(() => {
  document.title = 'Dashboard — Valiant Law';

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
  metaDesc.content = 'Manage your estate planning and legal services on the Valiant Law secure client portal.';

  fetchIntakes();

  // G7: Real-time status updates via Socket.IO
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
      : (import.meta.env.PROD ? '' : 'http://localhost:3000');
    socket = io(baseUrl, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.on('connect', () => socket!.emit('join_client_room'));
    socket.on('intake_status_changed', () => {
      // Fix (GAP 3b): show an in-app toast so status changes are not silent
      showToast('Your matter status has been updated.', 'success');
      fetchIntakes();
    });
  }
});

onUnmounted(() => {
  socket?.disconnect();
});

// ── Stores / Router ────────────────────────────────────────────────────────────
const authStore = useAuthStore();
const { showToast } = useToast();
const router = useRouter();
const {
  activateMatter,
  clearMatterSelection,
  getDashboardCtaLabel,
  getMatterLink,
  getProgress,
} = useClientMatterRouting();

// ── State ─────────────────────────────────────────────────────────────────────
const userName      = computed(() => authStore.user?.name || authStore.user?.email?.split('@')[0] || '');
const userEmail     = computed(() => authStore.user?.email || '');
const isLoading     = ref(true);
const fetchError    = ref(false);
const activeIntakes = ref<ClientIntake[]>([]);
const recentActivityRaw = ref<any[]>([]);
const resettingId   = ref<string | null>(null);
const resetConfirmIntake = ref<ClientIntake | null>(null);
const cancelBtnRef  = ref<HTMLButtonElement | null>(null);
const confirmBtnRef = ref<HTMLButtonElement | null>(null);
const previousFocus = ref<HTMLElement | null>(null);

// Feature 1: Flag panel — which intake's flag list is currently expanded
const expandedFlagsId = ref<string | null>(null);

// Feature 2: AI Summary — per-intake loading + content
const summaryLoading = ref<Record<string, boolean>>({});
const summaryState   = ref<Record<string, string>>({});

// GAP 1b: AI Explain Flag — per `intakeId:flagCode` key
const flagExplaining  = ref<Record<string, boolean>>({});
const flagExplanation = ref<Record<string, string>>({});

// Bug 5 fix: move focus into modal when it opens
watch(resetConfirmIntake, (val) => {
  if (val) nextTick(() => cancelBtnRef.value?.focus());
});

// GAP 4: Focus trap — cycle Tab/Shift+Tab between Cancel and Confirm
const trapFocus = (e: KeyboardEvent) => {
  const els = [cancelBtnRef.value, confirmBtnRef.value].filter(Boolean) as HTMLButtonElement[];
  if (els.length < 2) return;
  const idx = els.indexOf(document.activeElement as HTMLButtonElement);
  const next = e.shiftKey ? (idx - 1 + els.length) % els.length : (idx + 1) % els.length;
  els[next]?.focus();
};

// ── Composables ────────────────────────────────────────────────────────────────
// Using only the validation helpers — NOT the step-list composables (useIntakeSteps /
// useIncorpSteps) which internally read from the global intake store and therefore
// evaluate conditional steps against stale store data instead of each intake's own data.

// ── Bug 1+2 fix: Standalone step definitions ────────────────────────────────────
// These mirror BASE_STEPS in useIntakeSteps / useIncorpSteps but are evaluated
// against each intake's own data so conditional steps (e.g. Guardians) are always
// correct regardless of global store state.
// ── State (G2: AI Insight) ─────────────────────────────────────────────────────
const aiInsight = ref<{ insight: string; step: string } | null>(null);
const aiInsightLoading = ref(false);
const getMatterActivityTimestamp = (intake: ClientIntake): number => {
  const updatedAt = Date.parse(intake.updatedAt || '');
  if (Number.isFinite(updatedAt)) return updatedAt;

  const createdAt = Date.parse(intake.createdAt || '');
  if (Number.isFinite(createdAt)) return createdAt;

  return 0;
};

const aiTargetMatter = computed<ClientIntake | null>(() => {
  const startedMatters = activeIntakes.value
    .filter((intake) => intake.status === 'started')
    .sort((a, b) => getMatterActivityTimestamp(b) - getMatterActivityTimestamp(a));

  return startedMatters[0] ?? null;
});

const aiInsightActionLink = computed(() =>
  aiTargetMatter.value ? getMatterLink(aiTargetMatter.value) : null
);

const aiInsightActionLabel = computed(() => {
  if (!aiTargetMatter.value) return '';
  return getProgress(aiTargetMatter.value) === 100 ? 'Review & Submit' : 'Resume Now';
});

// ── Data Fetching ──────────────────────────────────────────────────────────────
const fetchIntakes = async () => {
  isLoading.value  = true;
  fetchError.value = false;
  try {
    const res = await api.get('/intake/me');
    activeIntakes.value = res.data as ClientIntake[];
    // Pre-populate summaryState from cached aiSummary field (avoids a round-trip for already-generated summaries)
    for (const intake of activeIntakes.value) {
      if (intake.aiSummary && !summaryState.value[intake._id]) {
        summaryState.value[intake._id] = intake.aiSummary;
      }
    }
    fetchActivityLogs();
    // G2: fetch AI insight for the first in-progress intake
    fetchAIInsight();
  } catch {
    fetchError.value = true;
    showToast('Failed to load dashboard. Please refresh.', 'error');
  } finally {
    isLoading.value = false;
  }
};

const fetchActivityLogs = async () => {
  try {
    const res = await api.get('/auth/activity');
    recentActivityRaw.value = res.data;
  } catch (e) {
    // Ignore fetch errors so it doesn't break dashboard
  }
};

// G2: AI Insight — GET /intake/:id/insight
const fetchAIInsight = async () => {
  const active = aiTargetMatter.value;
  aiInsight.value = null;
  if (!active) return;
  aiInsightLoading.value = true;
  try {
    const res = await api.get(`/intake/${active._id}/insight`);
    aiInsight.value = res.data;
  } catch {
    // Silent — falls back to hardcoded whatsNext panel
  } finally {
    aiInsightLoading.value = false;
  }
};

// Feature 2: AI Summary — POST /intake/:id/summary
const fetchSummary = async (intake: ClientIntake) => {
  if (summaryLoading.value[intake._id]) return;
  summaryLoading.value[intake._id] = true;
  try {
    const res = await api.post(`/intake/${intake._id}/summary`, {});
    summaryState.value[intake._id] = res.data.summary || '';
  } catch {
    showToast('Could not generate summary. Please try again.', 'error');
  } finally {
    summaryLoading.value[intake._id] = false;
  }
};

// ── Resume Link ────────────────────────────────────────────────────────────────
const getResumeLink = (intake: ClientIntake): string => getMatterLink(intake);

/** Sets localStorage/store when a client clicks Resume on an intake card. */
const setIntakeStorage = (intake: ClientIntake) => activateMatter(intake);

// ── Reset / Start Over ─────────────────────────────────────────────────────────
const closeResetConfirm = () => {
  resetConfirmIntake.value = null;
  nextTick(() => {
    if (previousFocus.value) {
      previousFocus.value.focus();
      previousFocus.value = null;
    }
  });
};

const confirmReset = (intake: ClientIntake) => {
  previousFocus.value = document.activeElement as HTMLElement | null;
  resetConfirmIntake.value = intake;
};

const handleReset = async () => {
  const intake = resetConfirmIntake.value;
  if (!intake) return;

  resettingId.value = intake._id;
  try {
    await api.delete(`/intake/${intake._id}`);
    clearMatterSelection(intake.type);
    showToast('Intake reset. You can start fresh whenever you\'re ready.', 'success');
    await fetchIntakes();
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Could not reset intake. Please try again.';
    showToast(msg, 'error');
  } finally {
    resettingId.value = null;
    closeResetConfirm();
  }
};

// ── Intake Guard ───────────────────────────────────────────────────────────────
const hasActiveIntakeOfType = (type: 'will' | 'incorporation'): boolean => {
  return activeIntakes.value.some(i => i.type === type && i.status !== 'completed');
};

// ── GAP 3c: Logout ─────────────────────────────────────────────────────────────
const handleLogout = () => {
  socket?.disconnect();
  authStore.logout();
  router.push('/login');
};

// ── GAP 1b: AI Explain Flag ────────────────────────────────────────────────────
const explainFlag = async (intake: ClientIntake, flagCode: string) => {
  const key = `${intake._id}:${flagCode}`;
  if (flagExplaining.value[key]) return;
  flagExplaining.value[key] = true;
  try {
    const res = await api.post(`/intake/${intake._id}/explain-flag`, { flagCode });
    flagExplanation.value[key] = res.data.explanation || res.data.message || '';
  } catch {
    flagExplanation.value[key] = 'Unable to load AI explanation. Please try again later.';
  } finally {
    flagExplaining.value[key] = false;
  }
};

// ── Feature 1: Flag Helpers ──────────────────────────────────────────────────
const hardFlagCount = (intake: ClientIntake): number =>
  (intake.flags || []).filter(f => f.type === 'hard').length;

const softFlagCount = (intake: ClientIntake): number =>
  (intake.flags || []).filter(f => f.type === 'soft').length;

const hasAnyFlags = (intake: ClientIntake): boolean =>
  (intake.flags?.length ?? 0) > 0;

const toggleFlags = (id: string) => {
  expandedFlagsId.value = expandedFlagsId.value === id ? null : id;
};

// ── Status Helpers ─────────────────────────────────────────────────────────────
const statusLabel = (status: ClientIntake['status']): string => ({
  started:    'In Progress',
  submitted:  'Under Review',
  reviewing:  'Lawyer Reviewing',
  completed:  'Completed',
} as const)[status] ?? 'In Progress';

const statusBadgeClass = (status: ClientIntake['status']): string => ({
  started:   'bg-blue-900/30 border-blue-500/30 text-blue-300',
  submitted: 'bg-amber-900/30 border-amber-500/30 text-amber-300',
  reviewing: 'bg-purple-900/30 border-purple-500/30 text-purple-300',
  completed: 'bg-green-900/30 border-green-500/30 text-green-300',
} as const)[status] ?? 'bg-gray-800 border-gray-600 text-gray-400';

const statusDotClass = (status: ClientIntake['status']): string => ({
  started:   'bg-blue-400',
  submitted: 'bg-amber-400',
  reviewing: 'bg-purple-400',
  completed: 'bg-green-400',
} as const)[status] ?? 'bg-gray-500';

const statusBannerClass = (status: ClientIntake['status']): string => ({
  submitted: 'bg-amber-900/20 border border-amber-500/20 text-amber-300',
  reviewing: 'bg-purple-900/20 border border-purple-500/20 text-purple-300',
  completed: 'bg-green-900/20 border border-green-500/20 text-green-300',
} as const)[status as string] ?? '';

const statusBannerMessage = (status: ClientIntake['status']): string => ({
  submitted: 'Your submission has been received and is queued for review.',
  reviewing: 'A Valiant Law lawyer is actively reviewing your matter.',
  completed: 'Your matter has been finalised. Your lawyer will be in contact.',
} as const)[status as string] ?? '';

const ctaLabel = (intake: ClientIntake): string => getDashboardCtaLabel(intake);



// ── Smart Greeting ─────────────────────────────────────────────────────────────
// ── Bug 4 fix: smart greeting checks status not just progress ─────────────────
const smartGreeting = computed(() => {
  if (activeIntakes.value.length === 0) return 'Welcome to Valiant Law. Start a new legal service below.';
  // An intake is "done" from the client's perspective if it's past 'started'
  // (submitted/reviewing/completed) OR the questionnaire is 100% complete.
  const doneCount = activeIntakes.value.filter(
    i => i.status !== 'started' || getProgress(i) === 100
  ).length;
  if (doneCount === activeIntakes.value.length) return 'All your active submissions are complete or under review.';
  return `You have ${activeIntakes.value.length} active service${activeIntakes.value.length > 1 ? 's' : ''} in progress.`;
});

// ── Dynamic Timeline ───────────────────────────────────────────────────────────
/** 1 = account created (always), 2 = submitted at least one, 3 = reviewing/completed */
const journeyStep = computed(() => {
  if (activeIntakes.value.some(i => i.status === 'completed' || i.status === 'reviewing')) return 3;
  if (activeIntakes.value.some(i => i.status === 'submitted' || i.status === 'started')) return 2;
  return 1;
});

const timelineStep2Class = computed(() =>
  journeyStep.value >= 2
    ? 'bg-green-900/50 border border-green-500/50 text-green-400'
    : 'bg-blue-600 border border-blue-400 shadow-lg shadow-blue-500/20 text-white'
);

const timelineStep3Class = computed(() =>
  journeyStep.value >= 3
    ? 'bg-green-900/50 border border-green-500/50 text-green-400'
    : 'bg-gray-800 border border-gray-600 text-gray-400'
);

// ── Sidebar: What's Next ───────────────────────────────────────────────────────
interface WhatsNextConfig {
  title: string; body: string; link?: string; linkLabel?: string;
}

const whatsNext = computed((): WhatsNextConfig => {
  const intakes = activeIntakes.value;
  if (intakes.some(i => i.status === 'completed')) {
    return {
      title:     'Matter Finalised',
      body:      'Your documents are complete. Your Valiant Law lawyer will be in contact to finalize next steps.',
    };
  }
  if (intakes.some(i => i.status === 'reviewing')) {
    return {
      title:     'Under Lawyer Review',
      body:      'A Valiant Law lawyer is actively reviewing your submission. No action needed from you.',
    };
  }
  if (intakes.some(i => i.status === 'submitted')) {
    return {
      title:     'Submission Received',
      body:      "Your questionnaire is with our team. We'll assign a lawyer shortly.",
    };
  }
  if (intakes.some(i => i.status === 'started')) {
    const incomplete = aiTargetMatter.value ?? intakes.find(i => i.status === 'started')!;
    const prog = getProgress(incomplete);
    // Bug 7 fix: if the questionnaire is 100% done, prompt to review & submit
    if (prog === 100) {
      return {
        title:     'Ready to Submit',
        body:      'You\'ve completed the questionnaire. Review your answers and submit to Valiant Law.',
        link:      getResumeLink(incomplete),
        linkLabel: 'Review & Submit',
      };
    }
    return {
      title:     'Continue Your Questionnaire',
      body:      'You have an active intake in progress. Resume where you left off.',
      link:      getResumeLink(incomplete),
      linkLabel: 'Resume Now',
    };
  }
  return {
    title:     'Start a Legal Service',
    body:      'Choose a service below to begin. Our team reviews every submission.',
    link:      '/triage',
    linkLabel: 'Begin Wills & Estates',
  };
});

const whatsNextIcon = computed(() => {
  const icons: Record<string, string> = {
    completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    reviewing: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    submitted: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    started:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    default:   'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  const topStatus = ['completed', 'reviewing', 'submitted', 'started'].find(s =>
    activeIntakes.value.some(i => i.status === s)
  ) ?? 'default';
  return icons[topStatus];
});

const whatsNextIconBg = computed(() => {
  if (activeIntakes.value.some(i => i.status === 'completed')) return 'bg-green-500/15';
  if (activeIntakes.value.some(i => i.status === 'reviewing')) return 'bg-purple-500/15';
  if (activeIntakes.value.some(i => i.status === 'submitted')) return 'bg-amber-500/15';
  return 'bg-blue-500/15';
});

const whatsNextIconColor = computed(() => {
  if (activeIntakes.value.some(i => i.status === 'completed')) return 'text-green-400';
  if (activeIntakes.value.some(i => i.status === 'reviewing')) return 'text-purple-400';
  if (activeIntakes.value.some(i => i.status === 'submitted')) return 'text-amber-400';
  return 'text-blue-400';
});

// ── Sidebar: Recent Activity ───────────────────────────────────────────────────
// G3: Enriched activity feed — produce distinct timeline events from lifecycle timestamps
interface ActivityEvent { label: string; time: string; rawDate: string; dotClass: string; }

const recentActivity = computed((): ActivityEvent[] => {
  const sortedRaw = [...recentActivityRaw.value].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sortedRaw.map(log => {
      let label = 'Account activity';
      let dotClass = 'bg-gray-500/60 border border-gray-400/40';

      if (log.action === 'user.login') {
          label = 'Logged in successfully';
          dotClass = 'bg-blue-500/60 border border-blue-400/40';
      } else if (log.action === 'intake.create') {
          label = 'New intake started';
      } else if (log.action === 'intake.update') {
          label = 'Intake drafted';
          dotClass = 'bg-blue-500/60 border border-blue-400/40';
      } else if (log.action === 'intake.submit') {
          label = 'Intake submitted for review';
          dotClass = 'bg-amber-500/60 border border-amber-400/40';
      } else if (log.action === 'intake.status_change') {
          const newStatus = log.metadata?.newStatus || 'updated';
          label = `Matter status changed to ${newStatus}`;
          dotClass = 'bg-purple-500/60 border border-purple-400/40';
      } else if (log.action === 'intake.doc_downloaded') {
          label = 'Legal documents downloaded';
          dotClass = 'bg-green-500/60 border border-green-400/40';
      } else if (log.action === 'user.password_reset') {
          label = 'Password reset successful';
      } else if (log.action === 'intake.reset') {
          label = 'An intake was reset and deleted';
          dotClass = 'bg-red-500/60 border border-red-400/40';
      }

      return {
          label,
          time: formatRelativeTime(log.createdAt),
          rawDate: log.createdAt,
          dotClass
      };
  });
});
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
