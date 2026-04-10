<template>
  <div class="min-h-screen bg-gray-900 text-white p-8 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div class="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl opacity-20"></div>
    </div>

    <div class="max-w-7xl mx-auto animate-fade-in">
      <div class="mb-10 flex justify-between items-start">
        <div>
          <h1 class="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            Valiant Law <span class="text-white/60 text-2xl font-light">- Lawyer Console</span>
          </h1>
          <p class="text-gray-400 mt-1">Manage and review client intakes with a portfolio-wide queue.</p>
        </div>
        
        <div class="relative">
          <button type="button" class="relative p-2 rounded-full hover:bg-gray-800 transition-colors border border-gray-700 bg-gray-900 shadow text-gray-400 hover:text-white" @click="toggleNotifications">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <span v-if="unreadNotificationsCount > 0" class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-gray-900">
              {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
            </span>
          </button>
          
          <div v-if="notificationsOpen" class="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
            <div class="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
              <span class="font-semibold text-white">Notifications</span>
              <button v-if="notifications.length > 0" type="button" class="text-xs text-blue-400 hover:text-blue-300 transition-colors" @click="clearNotifications">Mark all read</button>
            </div>
            <div class="max-h-80 overflow-y-auto">
              <div v-if="notifications.length === 0" class="px-4 py-8 text-center text-gray-500 text-sm">
                No new notifications
              </div>
              <div v-for="notif in notifications" :key="notif.id" class="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer" :class="!notif.read ? 'bg-indigo-900/10' : ''" @click="notif.read = true; if(notif.intakeId) { viewMatter(notif.intakeId); notificationsOpen = false; }">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 mt-0.5">
                    <span class="inline-block w-2 h-2 rounded-full" :class="notif.read ? 'bg-gray-600' : 'bg-blue-500'"></span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-200" :class="!notif.read ? 'font-medium' : ''">{{ notif.message }}</p>
                    <p class="text-xs text-gray-500 mt-1">{{ notif.timeAgo }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <span class="text-green-400 text-xs font-semibold uppercase tracking-wider">Est. Portfolio Value</span>
          <div class="text-3xl font-bold mt-2 text-white">{{ formatMoney(summary.portfolioValue) }}</div>
          <div class="text-xs text-gray-500 mt-1">Across {{ portfolioMatterCount }} files</div>
        </div>

        <button
          id="pipeline-card"
          type="button"
          class="glass-panel p-6 rounded-2xl relative overflow-hidden text-left transition-all hover:-translate-y-1"
          :class="query.statusGroup === 'pipeline' ? 'ring-2 ring-yellow-500 bg-yellow-900/10' : ''"
          @click="setStatusGroup('pipeline')"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Pipeline</span>
              <div class="text-3xl font-bold mt-2 text-white">{{ pipelineCount }} <span class="text-sm font-normal text-gray-400">Active</span></div>
            </div>
            <div class="text-right text-xs space-y-1 text-gray-400">
              <div>{{ summary.submitted }} New</div>
              <div>{{ summary.reviewing }} Review</div>
            </div>
          </div>
        </button>

        <button
          id="risk-card"
          type="button"
          class="glass-panel p-6 rounded-2xl relative overflow-hidden text-left transition-all hover:-translate-y-1"
          :class="query.flaggedOnly ? 'ring-2 ring-red-500 bg-red-900/10' : ''"
          @click="toggleFlaggedOnly"
        >
          <span class="text-red-400 text-xs font-semibold uppercase tracking-wider">Risk Watch</span>
          <div class="text-3xl font-bold mt-2 text-white">{{ summary.flaggedMatters }}</div>
          <div class="mt-2 w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div class="bg-red-500 h-full" :style="{ width: `${riskWatchPercent}%` }"></div>
          </div>
        </button>

        <button
          id="completed-card"
          type="button"
          class="glass-panel p-6 rounded-2xl relative overflow-hidden text-left transition-all hover:-translate-y-1"
          :class="query.statusGroup === 'completed' ? 'ring-2 ring-blue-500 bg-blue-900/10' : ''"
          @click="setStatusGroup('completed')"
        >
          <span class="text-blue-400 text-xs font-semibold uppercase tracking-wider">Completed</span>
          <div class="text-3xl font-bold mt-2 text-white">{{ summary.completed }}</div>
          <div class="text-xs text-gray-500 mt-1">Files closed</div>
        </button>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <button
            id="view-active"
            type="button"
            class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="query.statusGroup === 'active' ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'"
            @click="setStatusGroup('active')"
          >
            Active Matters
          </button>
          <button
            id="view-pipeline"
            type="button"
            class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="query.statusGroup === 'pipeline' ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300' : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'"
            @click="setStatusGroup('pipeline')"
          >
            Review Queue
          </button>
          <button
            id="view-completed"
            type="button"
            class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
            :class="query.statusGroup === 'completed' ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'"
            @click="setStatusGroup('completed')"
          >
            Completed History
          </button>
        </div>

        <div class="text-sm text-gray-400 flex items-center gap-3">
          <span v-if="query.flaggedOnly" class="flex items-center bg-gray-800 px-3 py-1 rounded-full text-white text-xs">
            Flagged Only
            <button type="button" class="ml-2 text-gray-400 hover:text-red-400" @click="toggleFlaggedOnly">x</button>
          </span>
          <span>Showing {{ rows.length }} of {{ pagination.total }} matters</span>
        </div>
      </div>

      <div class="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div class="relative w-full max-w-3xl flex flex-col md:flex-row md:items-center gap-3">
          <div class="relative flex-1">
            <input
              id="lawyer-search"
              v-model="query.search"
              type="text"
              placeholder="Search clients by name, email, or ID..."
              class="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-4 pl-10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @input="handleSearchInput"
            />
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <div class="w-full md:w-48">
            <select
              id="lawyer-type-filter"
              v-model="query.type"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @change="handleTypeChange"
            >
              <option value="all">All File Types</option>
              <option value="will">Estate Plans</option>
              <option value="incorporation">Incorporations</option>
            </select>
          </div>

          <div class="w-full md:w-44">
            <select
              id="lawyer-sort"
              v-model="query.sort"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @change="handleSortChange"
            >
              <option value="recent">Sort: Recent</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>
      </div>

      <div class="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
        <div
          v-if="fetchError"
          class="mx-5 mt-5 rounded-xl border border-amber-500/30 bg-amber-900/10 px-4 py-3 text-sm text-amber-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          role="alert"
        >
          <div>
            <p class="font-medium">Unable to refresh the lawyer queue.</p>
            <p class="text-xs text-amber-200/80 mt-1">The latest view may be stale until the next successful refresh.</p>
          </div>
          <button
            id="lawyer-dashboard-retry"
            type="button"
            class="px-4 py-2 rounded-lg border border-amber-400/40 text-amber-100 hover:bg-amber-500/10 transition-colors"
            @click="fetchRows"
          >
            Retry
          </button>
        </div>

        <div class="overflow-x-auto w-full">
          <table class="w-full text-left border-collapse min-w-[940px]">
            <thead class="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50">
              <tr>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Details</th>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Matter Highlights</th>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk Profile</th>
                <th class="p-5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              <tr v-if="loading && rows.length === 0" class="text-center">
                <td colspan="6" class="p-10"><SkeletonLoader variant="table" :lines="5" /></td>
              </tr>
              <tr v-else-if="fetchError && rows.length === 0" class="text-center">
                <td colspan="6" class="p-16 text-gray-300">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <span class="text-lg font-semibold">Unable to load the lawyer queue.</span>
                    <span class="text-sm text-gray-400">Retry to restore the latest matters and portfolio metrics.</span>
                    <button id="lawyer-empty-retry" type="button" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors" @click="fetchRows">Try Again</button>
                  </div>
                </td>
              </tr>
              <tr v-else-if="rows.length === 0" class="text-center">
                <td colspan="6" class="p-16 text-gray-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-lg font-semibold text-gray-300">{{ emptyState.title }}</span>
                    <span class="text-sm opacity-80">{{ emptyState.body }}</span>
                  </div>
                </td>
              </tr>
              <tr v-for="(intake, index) in rows" :key="intake._id" class="group hover:bg-gray-700/30 transition-all duration-200 animate-slide-up" :style="{ animationDelay: `${index * 40}ms` }">
                <td class="p-5">
                  <div class="font-medium text-white group-hover:text-blue-400 transition-colors">{{ intake.clientId?.email || intake.clientEmail || 'Unknown client' }}</div>
                  <div v-if="intake.clientId?.name" class="text-xs text-gray-400 mt-0.5">{{ intake.clientId.name }}</div>
                  <div class="text-xs text-gray-500 font-mono mt-1 opacity-60">ID: {{ intake._id }}</div>
                </td>
                <td class="p-5">
                  <div class="text-sm text-gray-300">{{ intake.highlights || 'Standard Intake' }}</div>
                  <div class="text-xs text-gray-500 mt-1">Updated {{ formatDate(intake.updatedAt || intake.createdAt) }}</div>
                </td>
                <td class="p-5">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full" :class="priorityBarClass(intake.priorityScore)" :style="{ width: `${priorityBarWidth(intake.priorityScore)}%` }"></div>
                    </div>
                    <span class="text-xs font-mono text-gray-400">{{ intake.priorityScore || 0 }}</span>
                  </div>
                </td>
                <td class="p-5">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border" :class="statusBadgeClass(intake.status)">{{ statusLabel(intake.status) }}</span>
                </td>
                <td class="p-5">
                  <div v-if="intake.flags.length > 0" class="flex flex-wrap gap-1">
                    <span v-for="flag in intake.flags" :key="flag.code" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border" :class="flagBadgeClass(flag)" :title="flag.message">{{ formatFlagLabel(flag.code) }}</span>
                  </div>
                  <span v-else class="text-gray-500 text-xs">No flags</span>
                </td>
                <td class="p-5 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      v-if="intake.status === 'submitted'"
                      type="button"
                      :disabled="updatingStatusById === intake._id"
                      class="text-xs font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="updateStatus(intake._id, 'reviewing')"
                    >
                      <span v-if="updatingStatusById === intake._id" class="mr-1 inline-block animate-spin">o</span>
                      Mark Reviewing
                    </button>
                    <button
                      v-if="intake.status === 'reviewing'"
                      type="button"
                      :disabled="updatingStatusById === intake._id"
                      class="text-xs font-medium text-green-400 hover:text-green-300 border border-green-900 hover:border-green-500 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="updateStatus(intake._id, 'completed')"
                    >
                      <span v-if="updatingStatusById === intake._id" class="mr-1 inline-block animate-spin">o</span>
                      Mark Completed
                    </button>
                    <button type="button" class="text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded transition-colors" @click="openQuickView(intake)">Quick View</button>
                    <button type="button" class="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline decoration-blue-500/30 decoration-2 underline-offset-4 transition-all" @click="viewMatter(intake._id)">Review -></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-gray-800/80 px-5 py-3 border-t border-gray-700/50 flex items-center justify-between">
          <span class="text-sm text-gray-400">Showing page {{ pagination.page }} of {{ pagination.totalPages }} ({{ pagination.total }} matched matters)</span>
          <div class="flex space-x-2">
            <button type="button" :disabled="pagination.page <= 1 || loading" class="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors" @click="changePage(pagination.page - 1)">Prev</button>
            <button type="button" :disabled="pagination.page >= pagination.totalPages || loading" class="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors" @click="changePage(pagination.page + 1)">Next</button>
          </div>
        </div>
      </div>

      <transition name="slide-right">
        <div v-if="drawerOpen" class="fixed inset-y-0 right-0 w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl z-[65] p-6 overflow-y-auto transform transition-transform">
          <div class="flex justify-between items-start mb-6">
            <div class="min-w-0">
              <h3 class="text-xl font-bold text-white truncate">{{ selectedDrawerTitle }}</h3>
              <p class="text-sm text-gray-400 mt-1">{{ selectedDrawerSubtitle }}</p>
              <div class="flex space-x-3 mt-3">
                <button type="button" class="text-xs uppercase font-bold tracking-wider pb-1 border-b-2 transition-colors" :class="drawerTab === 'risk' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'" @click="drawerTab = 'risk'">Risk Profile</button>
                <button type="button" class="text-xs uppercase font-bold tracking-wider pb-1 border-b-2 transition-colors" :class="drawerTab === 'chat' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'" @click="drawerTab = 'chat'">AI Associate</button>
                <button type="button" class="text-xs uppercase font-bold tracking-wider pb-1 border-b-2 transition-colors" :class="drawerTab === 'notes' ? 'text-blue-400 border-blue-400' : 'text-gray-500 border-transparent hover:text-gray-300'" @click="drawerTab = 'notes'">Notes</button>
              </div>
            </div>
            <button type="button" class="text-gray-500 hover:text-white" @click="closeQuickView">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div v-if="selectedIntakeLoading" class="space-y-4 animate-fade-in">
            <div class="h-6 w-2/3 bg-gray-800 rounded animate-pulse"></div>
            <div class="h-20 bg-gray-800/70 rounded-lg animate-pulse"></div>
            <div class="h-20 bg-gray-800/70 rounded-lg animate-pulse"></div>
            <div class="h-20 bg-gray-800/70 rounded-lg animate-pulse"></div>
          </div>

          <div v-else-if="selectedIntakeError" class="bg-amber-900/10 border border-amber-500/20 p-4 rounded-lg text-amber-100 animate-fade-in">
            <p class="font-medium">Unable to load full matter detail.</p>
            <p class="text-sm text-amber-200/80 mt-1">Retry to restore notes, copilot context, and matter actions.</p>
            <button type="button" class="mt-3 px-4 py-2 rounded-lg border border-amber-400/40 hover:bg-amber-500/10 transition-colors" @click="retryQuickView">Retry</button>
          </div>

          <template v-else-if="selectedIntake">
            <div v-if="drawerTab === 'risk'" class="mb-6 animate-fade-in">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Risk Assessment</h4>
              <div v-if="selectedIntake.flags.length > 0" class="space-y-2">
                <div v-for="flag in selectedIntake.flags" :key="flag.code" class="bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-start gap-3">
                  <span class="mt-0.5 text-sm font-semibold" :class="flagIconClass(flag)">{{ flagIcon(flag) }}</span>
                  <div>
                    <p class="text-sm font-semibold text-gray-200">{{ formatFlagLabel(flag.code) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ flag.message }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="bg-green-900/10 border border-green-500/20 p-4 rounded-lg text-green-400 text-sm">No automatic risk flags detected for this matter.</div>
            </div>

            <div v-if="drawerTab === 'notes'" class="mb-6 h-[400px] animate-fade-in relative">
              <CaseNotes :intakeId="selectedIntake._id" :initialNotes="selectedIntake.notes || []" />
            </div>

            <div v-if="drawerTab === 'chat'" class="mb-6 flex flex-col h-[400px] animate-fade-in">
              <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-3">
                <div v-for="(msg, i) in chatHistory" :key="i" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
                  <div class="inline-block px-3 py-2 rounded-lg text-sm max-w-[85%]" :class="msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'">{{ msg.content }}</div>
                </div>
                <div v-if="chatLoading" class="text-left">
                  <div class="inline-block px-3 py-2 rounded-lg bg-gray-700 text-gray-400 text-xs animate-pulse">Thinking...</div>
                </div>
              </div>
              <div class="relative">
                <input v-model="chatInput" type="text" placeholder="Ask about this matter..." class="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 pr-10 text-white focus:border-blue-500 focus:outline-none text-sm" @keydown.enter="sendMessage" />
                <button type="button" class="absolute right-2 top-2.5 text-blue-400 hover:text-white p-1" @click="sendMessage">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex gap-3 mt-8">
              <button type="button" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors border border-blue-500 py-3" @click="viewMatter(selectedIntake._id)">Open Full File</button>
              <button
                v-if="canNudgeSelected"
                type="button"
                :disabled="nudgingMatterId === selectedIntake._id"
                class="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors border border-gray-700 px-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send reminder email"
                @click="sendNudge"
              >
                <span v-if="nudgingMatterId === selectedIntake._id" class="animate-spin">o</span>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>

            <div class="mt-8 text-xs text-gray-600 font-mono">ID: {{ selectedIntake._id }}</div>
          </template>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="drawerOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" @click="closeQuickView"></div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import api from '../api';
import { useToast } from '../composables/useToast';
import SkeletonLoader from '../components/common/SkeletonLoader.vue';
import CaseNotes from '../components/CaseNotes.vue';

type IntakeStatus = 'started' | 'submitted' | 'reviewing' | 'completed';
type IntakeType = 'will' | 'incorporation';
type StatusGroup = 'active' | 'pipeline' | 'completed' | 'all';
type SortOrder = 'recent' | 'priority';

interface IntakeFlag {
  type: 'hard' | 'soft';
  message: string;
  code: string;
}

interface IntakeDataSummary {
  personalProfileName?: string;
  spouseName?: string | null;
  childrenCount?: number;
  businessOwner?: boolean;
  hasForeignWill?: boolean;
  assetTotal?: number;
  jurisdiction?: string;
  proposedName?: string;
}

interface IntakeRow {
  id: string;
  _id: string;
  status: IntakeStatus;
  type: IntakeType;
  flags: IntakeFlag[];
  priorityScore: number;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  clientEmail?: string;
  clientId?: { email?: string; name?: string };
  dataSummary?: IntakeDataSummary;
  highlights: string;
}

interface IntakeDetail extends IntakeRow {
  data: Record<string, any>;
  notes: Array<{ text: string; author: string; createdAt: string | Date }>;
  logicWarnings: Array<{ code: string; message: string; severity?: string }>;
}

interface LawyerSummary {
  portfolioValue: number;
  started: number;
  submitted: number;
  reviewing: number;
  completed: number;
  flaggedMatters: number;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LawyerIntakeResponse {
  data: Array<Record<string, any>>;
  pagination: PaginationState;
  summary: LawyerSummary;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AppNotification {
  id: string;
  intakeId?: string;
  message: string;
  date: Date;
  timeAgo: string;
  read: boolean;
}

const router = useRouter();
const { showToast } = useToast();

const summary = ref<LawyerSummary>({
  portfolioValue: 0,
  started: 0,
  submitted: 0,
  reviewing: 0,
  completed: 0,
  flaggedMatters: 0,
});

const query = reactive({
  page: 1,
  limit: 20,
  search: '',
  type: 'all',
  statusGroup: 'active' as StatusGroup,
  flaggedOnly: false,
  sort: 'recent' as SortOrder,
});

const rows = ref<IntakeRow[]>([]);
const pagination = ref<PaginationState>({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
});
const loading = ref(true);
const fetchError = ref(false);
const updatingStatusById = ref<string | null>(null);

const selectedIntakeId = ref<string | null>(null);
const selectedRowSummary = ref<IntakeRow | null>(null);
const selectedIntake = ref<IntakeDetail | null>(null);
const selectedIntakeLoading = ref(false);
const selectedIntakeError = ref(false);
const drawerTab = ref<'risk' | 'chat' | 'notes'>('risk');

const chatInput = ref('');
const chatHistory = ref<ChatMessage[]>([]);
const chatLoading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const nudgingMatterId = ref<string | null>(null);

const socket = ref<any>(null);
const globalChatCache = new Map<string, ChatMessage[]>();

let fetchRequestId = 0;
let detailRequestId = 0;
let chatRequestId = 0;
let socketRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let notificationTimer: ReturnType<typeof setInterval> | null = null;

const notifications = ref<AppNotification[]>([]);
const notificationsOpen = ref(false);
const unreadNotificationsCount = computed(() => notifications.value.filter((n) => !n.read).length);

const toggleNotifications = () => {
  notificationsOpen.value = !notificationsOpen.value;
};
const clearNotifications = () => {
  notifications.value.forEach((n) => n.read = true);
};

const updateNotificationTimes = () => {
  const now = new Date();
  for (const n of notifications.value) {
    const diffMin = Math.round((now.getTime() - n.date.getTime()) / 60000);
    if (diffMin < 1) n.timeAgo = 'Just now';
    else if (diffMin < 60) n.timeAgo = `${diffMin}m ago`;
    else n.timeAgo = `${Math.floor(diffMin / 60)}h ago`;
  }
};

const portfolioMatterCount = computed(
  () => summary.value.started + summary.value.submitted + summary.value.reviewing + summary.value.completed
);
const pipelineCount = computed(() => summary.value.submitted + summary.value.reviewing);
const riskWatchPercent = computed(() => {
  if (!portfolioMatterCount.value) return 0;
  return Math.round((summary.value.flaggedMatters / portfolioMatterCount.value) * 100);
});
const drawerOpen = computed(() => selectedIntakeId.value !== null);
const canNudgeSelected = computed(() => {
  if (!selectedIntake.value) return false;
  return selectedIntake.value.status === 'started' && !selectedIntake.value.data?.submitted;
});
const selectedDrawerTitle = computed(
  () => selectedIntake.value?.highlights || selectedRowSummary.value?.highlights || 'Matter Summary'
);
const selectedDrawerSubtitle = computed(() => {
  if (selectedIntake.value) {
    return `${selectedIntake.value.clientEmail || 'Unknown client'} - ${statusLabel(selectedIntake.value.status)}`;
  }
  if (selectedRowSummary.value) {
    return `${selectedRowSummary.value.clientId?.email || selectedRowSummary.value.clientEmail || 'Unknown client'} - ${statusLabel(selectedRowSummary.value.status)}`;
  }
  return 'Loading matter detail...';
});

const emptyState = computed(() => {
  if (query.statusGroup === 'completed') {
    return {
      title: 'No completed matters match this view',
      body: 'Completed files will appear here when they are moved out of the active queue.',
    };
  }

  if (query.statusGroup === 'pipeline') {
    return {
      title: 'No matters are awaiting review',
      body: 'Submitted and reviewing files will appear here when they enter the legal review queue.',
    };
  }

  if (query.flaggedOnly) {
    return {
      title: 'No flagged matters match this view',
      body: 'Try clearing the flagged filter or broadening the current search.',
    };
  }

  if (query.search || query.type !== 'all') {
    return {
      title: 'No matters found',
      body: 'Try clearing your filters or search terms.',
    };
  }

  return {
    title: 'No active matters found',
    body: 'Client intakes will appear here once they enter the active lawyer queue.',
  };
});

const statusLabel = (status: IntakeStatus): string => ({
  started: 'Draft In Progress',
  submitted: 'Submitted',
  reviewing: 'Lawyer Reviewing',
  completed: 'Completed',
}[status] ?? 'Unknown');

const statusBadgeClass = (status: IntakeStatus): string => ({
  started: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  submitted: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
  reviewing: 'bg-blue-900/30 text-blue-300 border-blue-700/50',
  completed: 'bg-green-900/30 text-green-300 border-green-700/50',
}[status] ?? 'bg-gray-800 text-gray-400 border-gray-700');

const priorityBarWidth = (score?: number) => Math.max(0, Math.min(score || 0, 100));
const priorityBarClass = (score?: number) => {
  if ((score || 0) >= 60) return 'bg-red-500';
  if ((score || 0) >= 30) return 'bg-yellow-500';
  return 'bg-green-500';
};

const flagBadgeClass = (flag: IntakeFlag) =>
  flag.type === 'hard'
    ? 'bg-red-900/30 text-red-400 border-red-900/50'
    : 'bg-orange-900/30 text-orange-300 border-orange-900/50';

const flagIcon = (flag: IntakeFlag) => (flag.type === 'hard' ? '!' : 'i');
const flagIconClass = (flag: IntakeFlag) => (flag.type === 'hard' ? 'text-red-400' : 'text-orange-300');

const formatFlagLabel = (code: string) =>
  code.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value || 0);

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString();
};

const computeHighlights = (intake: Partial<IntakeRow> & { data?: Record<string, any> }): string => {
  if (intake.aiSummary) return `AI: ${intake.aiSummary}`;

  const summaryData = intake.dataSummary || {};
  if (intake.type === 'incorporation') {
    const proposedName = summaryData.proposedName || intake.data?.preIncorporation?.proposedName;
    const jurisdiction = summaryData.jurisdiction || intake.data?.preIncorporation?.jurisdiction;
    const parts = [jurisdiction, proposedName]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.toUpperCase());
    return parts.join(' | ') || 'Incorporation Intake';
  }

  const spouseName = summaryData.spouseName || intake.data?.family?.spouseName;
  const childrenCount = typeof summaryData.childrenCount === 'number'
    ? summaryData.childrenCount
    : intake.data?.family?.children?.length || 0;
  const businessOwner = typeof summaryData.businessOwner === 'boolean' ? summaryData.businessOwner : false;
  const hasForeignWill = typeof summaryData.hasForeignWill === 'boolean'
    ? summaryData.hasForeignWill
    : intake.data?.priorWills?.hasForeignWill === 'yes';

  const parts: string[] = [];
  if (spouseName) parts.push('Married');
  if (childrenCount > 0) parts.push(`${childrenCount} Children`);
  if (businessOwner) parts.push('Business Owner');
  if (hasForeignWill) parts.push('Foreign Will');
  return parts.join(' | ') || 'Standard Intake';
};

const normalizeRow = (intake: Record<string, any>): IntakeRow => {
  const normalizedType = intake.type === 'incorporation' ? 'incorporation' : 'will';
  const normalizedId = String(intake.id || intake._id);
  const flags = Array.isArray(intake.flags) ? intake.flags : [];

  return {
    ...intake,
    id: normalizedId,
    _id: normalizedId,
    type: normalizedType,
    status: (intake.status || 'started') as IntakeStatus,
    flags,
    priorityScore: intake.priorityScore || 0,
    highlights: computeHighlights({ ...intake, type: normalizedType, flags }),
    createdAt: intake.createdAt || new Date().toISOString(),
    updatedAt: intake.updatedAt || new Date().toISOString(),
  };
};

const normalizeDetail = (intake: Record<string, any>, fallback: IntakeRow | null): IntakeDetail => {
  const row = normalizeRow({
    ...fallback,
    ...intake,
    clientId: fallback?.clientId,
    clientEmail: intake.clientEmail || fallback?.clientId?.email || fallback?.clientEmail,
    dataSummary: fallback?.dataSummary,
  });

  return {
    ...row,
    data: intake.data || {},
    notes: Array.isArray(intake.notes) ? intake.notes : [],
    logicWarnings: Array.isArray(intake.logicWarnings) ? intake.logicWarnings : [],
  };
};

const buildQueryString = () => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  params.set('statusGroup', query.statusGroup);
  params.set('sort', query.sort);

  const trimmedSearch = query.search.trim();
  if (trimmedSearch) params.set('search', trimmedSearch);
  if (query.type !== 'all') params.set('type', query.type);
  if (query.flaggedOnly) params.set('flaggedOnly', 'true');
  return params.toString();
};

const scrollChatToBottom = () => {
  void nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const fetchRows = async () => {
  const requestId = ++fetchRequestId;
  loading.value = true;
  fetchError.value = false;

  try {
    const response = await api.get(`/lawyer/intakes?${buildQueryString()}`);
    if (requestId !== fetchRequestId) return;

    const payload = response.data as LawyerIntakeResponse;
    if (!Array.isArray(payload?.data) || !payload?.pagination || !payload?.summary) {
      throw new Error('Invalid lawyer intake payload');
    }

    rows.value = payload.data.map((intake) => normalizeRow(intake));
    pagination.value = {
      page: payload.pagination.page,
      limit: payload.pagination.limit,
      total: payload.pagination.total,
      totalPages: payload.pagination.totalPages,
    };
    summary.value = payload.summary;
  } catch (error) {
    if (requestId !== fetchRequestId) return;
    fetchError.value = true;
    console.error('Failed to fetch intakes:', error);
    showToast('Failed to load intakes. Retry to refresh the lawyer queue.', 'error');
  } finally {
    if (requestId === fetchRequestId) {
      loading.value = false;
    }
  }
};

const fetchSelectedIntake = async (id: string) => {
  const requestId = ++detailRequestId;
  selectedIntakeLoading.value = true;
  selectedIntakeError.value = false;

  try {
    const response = await api.get(`/lawyer/intake/${id}`);
    if (requestId !== detailRequestId || selectedIntakeId.value !== id) return;

    selectedIntake.value = normalizeDetail(response.data, selectedRowSummary.value);
    const cachedChat = globalChatCache.get(id);
    chatHistory.value = cachedChat
      ? [...cachedChat]
      : [{
          role: 'assistant',
          content: `Hello. I can analyze ${selectedIntake.value.clientEmail || 'this matter'} for you.`,
        }];
    scrollChatToBottom();
  } catch (error) {
    if (requestId !== detailRequestId || selectedIntakeId.value !== id) return;
    selectedIntake.value = null;
    selectedIntakeError.value = true;
    console.error('Failed to fetch intake detail:', error);
  } finally {
    if (requestId === detailRequestId && selectedIntakeId.value === id) {
      selectedIntakeLoading.value = false;
    }
  }
};

const updateQuery = (patch: Partial<typeof query>, resetPage = true) => {
  Object.assign(query, patch);
  if (resetPage) query.page = 1;
  void fetchRows();
};

const handleSearchInput = () => {
  query.page = 1;
  void fetchRows();
};

const handleTypeChange = () => updateQuery({}, true);
const handleSortChange = () => updateQuery({}, true);
const setStatusGroup = (statusGroup: StatusGroup) => updateQuery({ statusGroup }, true);
const toggleFlaggedOnly = () => updateQuery({ flaggedOnly: !query.flaggedOnly }, true);

const changePage = (page: number) => {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.page) return;
  query.page = page;
  void fetchRows();
};

const updateStatus = async (id: string, newStatus: IntakeStatus) => {
  updatingStatusById.value = id;
  try {
    await api.patch(`/lawyer/intake/${id}/status`, { status: newStatus });
    showToast('Matter status updated.', 'success');
    await fetchRows();
    if (selectedIntakeId.value === id) {
      await fetchSelectedIntake(id);
    }
  } catch (error) {
    console.error('Failed to update status:', error);
    showToast('Failed to update status.', 'error');
  } finally {
    updatingStatusById.value = null;
  }
};

const viewMatter = (id: string) => {
  router.push(`/lawyer/matter/${id}`);
};

const openQuickView = (intake: IntakeRow) => {
  if (selectedIntakeId.value && selectedIntake.value) {
    globalChatCache.set(selectedIntakeId.value, [...chatHistory.value]);
  }

  selectedIntakeId.value = intake._id;
  selectedRowSummary.value = intake;
  selectedIntake.value = null;
  selectedIntakeError.value = false;
  selectedIntakeLoading.value = true;
  drawerTab.value = 'risk';
  chatInput.value = '';
  chatHistory.value = [];
  chatLoading.value = false;
  nudgingMatterId.value = null;
  void fetchSelectedIntake(intake._id);
};

const closeQuickView = () => {
  chatRequestId += 1;
  if (selectedIntakeId.value && selectedIntake.value) {
    globalChatCache.set(selectedIntakeId.value, [...chatHistory.value]);
  }
  selectedIntakeId.value = null;
  selectedRowSummary.value = null;
  selectedIntake.value = null;
  selectedIntakeLoading.value = false;
  selectedIntakeError.value = false;
  chatInput.value = '';
  chatHistory.value = [];
  chatLoading.value = false;
  nudgingMatterId.value = null;
  drawerTab.value = 'risk';
};

const retryQuickView = () => {
  if (selectedIntakeId.value) {
    void fetchSelectedIntake(selectedIntakeId.value);
  }
};

const sendMessage = async () => {
  if (!selectedIntake.value || !chatInput.value.trim() || chatLoading.value) return;

  const intakeId = selectedIntake.value._id;
  const message = chatInput.value.trim();
  const requestId = ++chatRequestId;

  chatHistory.value.push({ role: 'user', content: message });
  chatInput.value = '';
  chatLoading.value = true;
  scrollChatToBottom();

  try {
    const response = await api.post('/intake/lawyer/copilot/chat', { intakeId, message });
    if (requestId !== chatRequestId || selectedIntakeId.value !== intakeId) return;
    chatHistory.value.push({ role: 'assistant', content: response.data.reply });
  } catch (error) {
    if (requestId !== chatRequestId || selectedIntakeId.value !== intakeId) return;
    console.error('Chat error:', error);
    chatHistory.value.push({
      role: 'assistant',
      content: "I'm having trouble connecting to the knowledge base right now.",
    });
  } finally {
    if (requestId === chatRequestId && selectedIntakeId.value === intakeId) {
      chatLoading.value = false;
      scrollChatToBottom();
    }
  }
};

const sendNudge = async () => {
  if (!selectedIntake.value) return;

  const intakeId = selectedIntake.value._id;
  nudgingMatterId.value = intakeId;
  try {
    await api.post(`/lawyer/intake/${intakeId}/nudge`);
    showToast('Reminder email sent to client.', 'success');
    if (selectedIntakeId.value === intakeId) {
      await fetchSelectedIntake(intakeId);
    }
  } catch (error) {
    console.error('Failed to send reminder:', error);
    showToast('Failed to send reminder.', 'error');
  } finally {
    if (nudgingMatterId.value === intakeId) {
      nudgingMatterId.value = null;
    }
  }
};

const belongsToCurrentView = (updatedIntake: Record<string, any>) => {
  const normalizedId = String(updatedIntake.id || updatedIntake._id || '');
  const normalizedStatus = (updatedIntake.status || 'started') as IntakeStatus;
  const normalizedType = updatedIntake.type === 'incorporation' ? 'incorporation' : 'will';
  const flagged = typeof updatedIntake.flagCount === 'number'
    ? updatedIntake.flagCount > 0
    : Array.isArray(updatedIntake.flags) && updatedIntake.flags.length > 0;

  if (query.type !== 'all' && query.type !== normalizedType) return false;
  if (query.flaggedOnly && !flagged) return false;
  if (query.statusGroup === 'completed' && normalizedStatus !== 'completed') return false;
  if (query.statusGroup === 'pipeline' && !['submitted', 'reviewing'].includes(normalizedStatus)) return false;
  if (query.statusGroup === 'active' && !['started', 'submitted', 'reviewing'].includes(normalizedStatus)) return false;

  const trimmedSearch = query.search.trim().toLowerCase();
  if (!trimmedSearch) return true;

  return [
    String(updatedIntake.clientEmail || '').toLowerCase(),
    normalizedId.toLowerCase(),
  ].some((value) => value.includes(trimmedSearch));
};

const scheduleSocketRefresh = (updatedIntake: Record<string, any>) => {
  const wasVisible = rows.value.some((row) => row._id === String(updatedIntake.id || updatedIntake._id || ''));
  if (belongsToCurrentView(updatedIntake)) {
    showToast(wasVisible ? 'A matter in this view was updated.' : 'A new matter entered this view.', 'success');
  }
  
  notifications.value.unshift({
    id: `notif-${Date.now()}-${Math.random()}`,
    intakeId: String(updatedIntake.id || updatedIntake._id || ''),
    message: `${updatedIntake.clientEmail || 'A matter'} has been updated to "${statusLabel(updatedIntake.status as IntakeStatus)}".`,
    date: new Date(),
    timeAgo: 'Just now',
    read: false,
  });
  if (notifications.value.length > 50) notifications.value.pop();

  if (socketRefreshTimer) return;
  socketRefreshTimer = setTimeout(() => {
    socketRefreshTimer = null;
    void fetchRows();
    if (selectedIntakeId.value) {
      void fetchSelectedIntake(selectedIntakeId.value);
    }
  }, 250);
};

onMounted(() => {
  document.title = 'Lawyer Console - Valiant Law';

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
  metaDesc.content = 'Valiant Law secure dashboard for managing client intakes and legal services.';

  void fetchRows();

  const socketURL = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');
  const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');

  socket.value = io(socketURL, { auth: { token } });
  socket.value.on('connect', () => {
    socket.value.emit('join_lawyer_room');
  });
  socket.value.on('intake_updated', (updatedIntake: Record<string, any>) => {
    scheduleSocketRefresh(updatedIntake);
  });
  
  notificationTimer = setInterval(updateNotificationTimes, 60000);
});

onUnmounted(() => {
  if (socketRefreshTimer) {
    clearTimeout(socketRefreshTimer);
    socketRefreshTimer = null;
  }
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out forwards;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
