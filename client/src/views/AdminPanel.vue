<template>
  <div class="min-h-screen bg-gray-900 pb-12 font-sans text-gray-200">
    <div class="sticky top-0 z-30 border-b border-gray-700 bg-gray-800 shadow-lg">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
          <div>
            <h1 class="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-3xl font-bold text-transparent">
              System Administration
            </h1>
            <p class="mt-1 text-sm text-gray-400">Manage users, intakes, and monitor system health</p>
          </div>

          <div class="flex gap-2 rounded-lg border border-gray-700 bg-gray-900/50 p-1.5">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :id="`admin-tab-${tab.id}`"
              type="button"
              class="rounded-md px-4 py-2 text-sm font-medium transition-all"
              :class="activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'"
              @click="setActiveTab(tab.id)"
            >
              {{ tab.name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div v-if="activeTab === 'dashboard'" class="space-y-6">
        <div class="flex justify-end">
          <button
            id="admin-dashboard-refresh"
            type="button"
            class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="dashboardState.loading"
            @click="fetchDashboard(true)"
          >
            Refresh Dashboard
          </button>
        </div>

        <div v-if="dashboardState.loading && !dashboardState.stats" class="flex justify-center p-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>

        <div
          v-else-if="dashboardState.error"
          id="admin-dashboard-error"
          class="rounded-xl border border-red-800/70 bg-red-950/30 p-6"
        >
          <h2 class="text-lg font-semibold text-white">Unable to load system stats.</h2>
          <p class="mt-2 text-sm text-red-200">{{ dashboardState.error }}</p>
          <button
            type="button"
            class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
            @click="fetchDashboard(true)"
          >
            Retry
          </button>
        </div>

        <div v-else-if="dashboardStats" class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div class="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
            <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Users</h3>
            <div class="mb-4 text-4xl font-bold text-white">{{ dashboardStats.users.total }}</div>
            <div class="space-y-2 text-sm text-gray-300">
              <div class="flex justify-between">
                <span class="text-gray-500">Active:</span>
                <span>{{ dashboardStats.users.active }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Disabled:</span>
                <span>{{ dashboardStats.users.disabled }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Clients:</span>
                <span>{{ dashboardStats.users.byRole.client }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Lawyers:</span>
                <span>{{ dashboardStats.users.byRole.lawyer }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Admins:</span>
                <span>{{ dashboardStats.users.byRole.admin }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
            <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Matter Pipeline</h3>
            <div class="mb-4 text-4xl font-bold text-white">{{ dashboardStats.intakes.total }}</div>
            <div class="space-y-2 text-sm text-gray-300">
              <div class="flex justify-between">
                <span class="text-gray-500">Started:</span>
                <span>{{ dashboardStats.intakes.byStatus.started }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-yellow-500">Submitted:</span>
                <span>{{ dashboardStats.intakes.byStatus.submitted }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-blue-400">Reviewing:</span>
                <span>{{ dashboardStats.intakes.byStatus.reviewing }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-green-500">Completed:</span>
                <span>{{ dashboardStats.intakes.byStatus.completed }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
            <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Matter Types</h3>
            <div class="space-y-4 text-sm text-gray-300">
              <div>
                <div class="mb-1 flex justify-between">
                  <span>Estate Plans</span>
                  <span>{{ dashboardStats.intakes.byType.will }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-gray-900">
                  <div
                    class="h-2 rounded-full bg-indigo-500"
                    :style="{ width: `${matterTypePercent('will')}%` }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex justify-between">
                  <span>Incorporations</span>
                  <span>{{ dashboardStats.intakes.byType.incorporation }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-gray-900">
                  <div
                    class="h-2 rounded-full bg-teal-500"
                    :style="{ width: `${matterTypePercent('incorporation')}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'users'" class="space-y-6">
        <div class="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex w-full flex-1 flex-col gap-3 lg:flex-row">
              <input
                id="admin-user-search"
                v-model="userSearchInput"
                type="text"
                placeholder="Search by email..."
                class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @keyup.enter="applyUserFilters"
              />
              <select
                id="admin-user-role-filter"
                v-model="userRoleFilter"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="applyUserRoleFilter"
              >
                <option value="">All Roles</option>
                <option value="client">Clients</option>
                <option value="lawyer">Lawyers</option>
                <option value="admin">Admins</option>
              </select>
              <button
                id="admin-user-search-submit"
                type="button"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                :disabled="usersState.loading"
                @click="applyUserFilters"
              >
                Search
              </button>
              <button
                id="admin-user-search-clear"
                type="button"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800"
                :disabled="usersState.loading"
                @click="clearUserFilters"
              >
                Clear
              </button>
            </div>

            <button
              id="admin-open-create-user"
              type="button"
              class="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-500"
              @click="openCreateUserModal"
            >
              Create User
            </button>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left">
              <thead class="border-b border-gray-700 bg-gray-900 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th class="p-4">User</th>
                  <th class="p-4">Role</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Joined</th>
                  <th class="p-4">Intakes</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50 text-sm">
                <tr v-if="usersState.loading && !usersState.rows.length">
                  <td colspan="6" class="p-8 text-center">
                    <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                  </td>
                </tr>
                <tr v-else-if="usersState.error">
                  <td colspan="6" class="p-8">
                    <div id="admin-users-error" class="rounded-lg border border-red-800/70 bg-red-950/30 p-5">
                      <h3 class="font-semibold text-white">Unable to load users.</h3>
                      <p class="mt-2 text-sm text-red-200">{{ usersState.error }}</p>
                      <button
                        type="button"
                        class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
                        @click="fetchUsers(true)"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="!usersState.rows.length">
                  <td colspan="6" class="p-8 text-center text-gray-500">No users matched the current filters.</td>
                </tr>
                <tr
                  v-for="user in usersState.rows"
                  :key="user.id"
                  class="transition-colors hover:bg-gray-700/30"
                >
                  <td class="p-4">
                    <div class="font-medium text-white">{{ user.email }}</div>
                    <div v-if="user.name" class="mt-1 text-xs text-gray-500">{{ user.name }}</div>
                  </td>
                  <td class="p-4">
                    <span
                      class="rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                      :class="roleBadgeClass(user.role)"
                    >
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="p-4">
                    <span class="flex items-center gap-1.5" :class="user.isActive ? 'text-green-400' : 'text-red-400'">
                      <span class="h-2 w-2 rounded-full" :class="user.isActive ? 'bg-green-500' : 'bg-red-500'"></span>
                      {{ user.isActive ? 'Active' : 'Disabled' }}
                    </span>
                  </td>
                  <td class="p-4 text-gray-400">{{ formatDate(user.createdAt) }}</td>
                  <td class="p-4 font-mono text-gray-300">{{ user.intakeCount }}</td>
                  <td class="p-4 text-right">
                    <div class="flex flex-col items-end gap-2">
                      <div class="flex flex-wrap justify-end gap-2">
                        <select
                          :id="`admin-user-role-${user.id}`"
                          :value="user.role"
                          class="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          :disabled="isSelfManagedUser(user) || !!userRolePendingById[user.id]"
                          :title="isSelfManagedUser(user) ? 'You cannot change your own admin role here.' : ''"
                          @change="queueRoleChange(user, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="client">Client</option>
                          <option value="lawyer">Lawyer</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          :id="`admin-user-status-${user.id}`"
                          type="button"
                          class="rounded border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          :class="user.isActive ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-green-900/50 text-green-400 hover:bg-green-900/20'"
                          :disabled="(isSelfManagedUser(user) && user.isActive) || !!userStatusPendingById[user.id]"
                          :title="isSelfManagedUser(user) && user.isActive ? 'You cannot disable your own admin account.' : ''"
                          @click="queueStatusChange(user)"
                        >
                          <span v-if="userStatusPendingById[user.id]">Saving...</span>
                          <span v-else>{{ user.isActive ? 'Disable' : 'Enable' }}</span>
                        </button>
                      </div>
                      <div v-if="isSelfManagedUser(user)" class="text-[11px] text-gray-500">
                        Current admin account
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">
            <span>
              Showing {{ usersState.rows.length }} of {{ usersState.pagination.total }} matched users.
              Page {{ usersState.pagination.page }} of {{ usersState.pagination.totalPages }}.
            </span>
            <div class="flex gap-2">
              <button
                id="admin-users-prev"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="usersState.loading || usersState.pagination.page <= 1"
                @click="changeUserPage(usersState.pagination.page - 1)"
              >
                Prev
              </button>
              <button
                id="admin-users-next"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="usersState.loading || usersState.pagination.page >= usersState.pagination.totalPages"
                @click="changeUserPage(usersState.pagination.page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'intakes'" class="space-y-6">
        <div class="flex items-start gap-3 rounded-xl border border-blue-800/50 bg-blue-900/20 p-4">
          <span class="text-xl text-blue-400">i</span>
          <p class="text-sm text-blue-200">
            As an admin, you bypass client role checks. You can hard-delete intakes or forcefully override state.
          </p>
        </div>

        <div class="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                id="admin-intake-search"
                v-model="intakeSearchInput"
                type="text"
                placeholder="Search by intake ID, client email, or name..."
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 xl:col-span-2"
                @keyup.enter="applyIntakeFilters"
              />
              <select
                id="admin-intake-type-filter"
                v-model="intakeTypeFilter"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="applyIntakeSelectFilters"
              >
                <option value="">All Types</option>
                <option value="will">Estate Plans</option>
                <option value="incorporation">Incorporations</option>
              </select>
              <select
                id="admin-intake-status-filter"
                v-model="intakeStatusFilter"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="applyIntakeSelectFilters"
              >
                <option value="">All Statuses</option>
                <option value="started">Started</option>
                <option value="submitted">Submitted</option>
                <option value="reviewing">Reviewing</option>
                <option value="completed">Completed</option>
              </select>
              <select
                id="admin-intake-sort"
                v-model="intakeSort"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="applyIntakeSelectFilters"
              >
                <option value="updated_desc">Updated (Newest)</option>
                <option value="updated_asc">Updated (Oldest)</option>
                <option value="created_desc">Created (Newest)</option>
                <option value="created_asc">Created (Oldest)</option>
              </select>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                id="admin-intake-search-submit"
                type="button"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                :disabled="intakesState.loading"
                @click="applyIntakeFilters"
              >
                Search
              </button>
              <button
                id="admin-intake-clear"
                type="button"
                class="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800"
                :disabled="intakesState.loading"
                @click="clearIntakeFilters"
              >
                Clear
              </button>
              <button
                id="admin-intake-refresh"
                type="button"
                class="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
                :disabled="intakesState.loading"
                @click="fetchIntakes(true)"
              >
                Refresh Global List
              </button>
            </div>
          </div>

          <div v-if="intakesSummary" class="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
            <span class="rounded-full border border-gray-700 bg-gray-900 px-3 py-1">Matched: {{ intakesSummary.total }}</span>
            <span class="rounded-full border border-gray-700 bg-gray-900 px-3 py-1">Started: {{ intakesSummary.byStatus.started }}</span>
            <span class="rounded-full border border-gray-700 bg-gray-900 px-3 py-1">Submitted: {{ intakesSummary.byStatus.submitted }}</span>
            <span class="rounded-full border border-gray-700 bg-gray-900 px-3 py-1">Reviewing: {{ intakesSummary.byStatus.reviewing }}</span>
            <span class="rounded-full border border-gray-700 bg-gray-900 px-3 py-1">Completed: {{ intakesSummary.byStatus.completed }}</span>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[980px] border-collapse text-left">
              <thead class="border-b border-gray-700 bg-gray-900 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th class="p-4">Client</th>
                  <th class="p-4">Status</th>
                  <th class="p-4">Highlights</th>
                  <th class="p-4">Flags</th>
                  <th class="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50 text-sm">
                <tr v-if="intakesState.loading && !intakesState.rows.length">
                  <td colspan="5" class="p-8 text-center">
                    <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                  </td>
                </tr>
                <tr v-else-if="intakesState.error">
                  <td colspan="5" class="p-8">
                    <div id="admin-intakes-error" class="rounded-lg border border-red-800/70 bg-red-950/30 p-5">
                      <h3 class="font-semibold text-white">Unable to load admin intakes.</h3>
                      <p class="mt-2 text-sm text-red-200">{{ intakesState.error }}</p>
                      <button
                        type="button"
                        class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
                        @click="fetchIntakes(true)"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="!intakesState.rows.length">
                  <td colspan="5" class="p-8 text-center text-gray-500">No intakes matched the current filters.</td>
                </tr>
                <tr
                  v-for="intake in intakesState.rows"
                  :key="intake.id"
                  class="transition-colors hover:bg-gray-700/30"
                >
                  <td class="p-4">
                    <div class="font-medium text-white">{{ intake.clientEmail }}</div>
                    <div v-if="intake.clientName" class="mt-1 text-xs text-gray-500">{{ intake.clientName }}</div>
                    <div class="mt-2 text-[11px] uppercase tracking-wider text-gray-500">
                      {{ intake.type === 'will' ? 'Estate Plan' : 'Incorporation' }}
                    </div>
                    <div class="font-mono text-[11px] text-gray-500">{{ intake.id }}</div>
                  </td>
                  <td class="p-4">
                    <select
                      :id="`admin-intake-status-${intake.id}`"
                      :value="intake.status"
                      class="mb-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!!intakeStatusPendingById[intake.id]"
                      @change="queueIntakeStatusOverride(intake, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="started">Started</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="completed">Completed</option>
                    </select>
                    
                    <select
                      :id="`admin-intake-assign-${intake.id}`"
                      :value="intake.assignedLawyerId || ''"
                      class="mb-1 block rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      :disabled="!!intakeLawyerPendingById[intake.id]"
                      @change="queueLawyerAssignment(intake, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="">Unassigned</option>
                      <option v-for="lawyer in adminLawyers" :key="lawyer.id" :value="lawyer.id">
                        {{ lawyer.name || lawyer.email }}
                      </option>
                    </select>

                    <div class="text-xs text-gray-500 mt-1">Updated {{ formatDate(intake.updatedAt) }}</div>
                  </td>
                  <td class="p-4 text-gray-300">{{ intake.highlights || 'No highlights available' }}</td>
                  <td class="p-4">
                    <span
                      class="rounded-full border px-2 py-1 text-xs"
                      :class="intake.flagCount ? 'border-yellow-700/60 bg-yellow-900/20 text-yellow-300' : 'border-gray-700 bg-gray-900 text-gray-400'"
                    >
                      {{ intake.flagCount }} flags
                    </span>
                  </td>
                  <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-3">
                      <router-link
                        :to="`/lawyer/matter/${intake.id}`"
                        class="text-xs text-blue-400 transition-colors hover:text-blue-300"
                      >
                        View ->
                      </router-link>
                      <button
                        :id="`admin-intake-delete-${intake.id}`"
                        type="button"
                        class="rounded border border-red-900/50 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="deleteState.deleting && deleteState.id === intake.id"
                        @click="openDeleteModal(intake)"
                      >
                        <span v-if="deleteState.deleting && deleteState.id === intake.id">Deleting...</span>
                        <span v-else>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">
            <span>
              Showing {{ intakesState.rows.length }} of {{ intakesState.pagination.total }} matched intakes.
              Page {{ intakesState.pagination.page }} of {{ intakesState.pagination.totalPages }}.
            </span>
            <div class="flex gap-2">
              <button
                id="admin-intakes-prev"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="intakesState.loading || intakesState.pagination.page <= 1"
                @click="changeIntakePage(intakesState.pagination.page - 1)"
              >
                Prev
              </button>
              <button
                id="admin-intakes-next"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="intakesState.loading || intakesState.pagination.page >= intakesState.pagination.totalPages"
                @click="changeIntakePage(intakesState.pagination.page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'ai'" class="space-y-6">
        <div class="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-xl">
          <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 class="text-lg font-semibold text-white">AI Runtime Settings</h2>
              <p class="mt-1 text-sm text-gray-400">
                Select which provider and model power the admin and intake AI features.
              </p>
            </div>
            <button
              id="admin-ai-settings-refresh"
              type="button"
              class="rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="aiSettingsState.loading || savingAiSettings"
              @click="fetchAiSettings(true)"
            >
              Refresh Settings
            </button>
          </div>

          <div v-if="aiSettingsState.loading && !aiSettings" class="flex justify-center p-10">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>

          <div
            v-else-if="aiSettingsState.error"
            id="admin-ai-settings-error"
            class="mt-4 rounded-xl border border-red-800/70 bg-red-950/30 p-6"
          >
            <h3 class="text-lg font-semibold text-white">Unable to load AI runtime settings.</h3>
            <p class="mt-2 text-sm text-red-200">{{ aiSettingsState.error }}</p>
            <button
              type="button"
              class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
              @click="fetchAiSettings(true)"
            >
              Retry
            </button>
          </div>

          <template v-else-if="aiSettings">
            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <div class="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
                <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Current Active Model</div>
                <div class="mt-2 text-lg font-semibold text-white">
                  {{ currentAiProviderLabel }} / {{ aiSettings.current.model }}
                </div>
                <div class="mt-2 text-sm text-gray-400">
                  The current runtime selection is applied immediately after saving.
                </div>
              </div>
              <div class="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
                <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">Default From Environment</div>
                <div class="mt-2 text-lg font-semibold text-white">
                  {{ defaultAiProviderLabel }} / {{ aiSettings.defaults.model }}
                </div>
                <div class="mt-2 text-sm text-gray-400">
                  This is the fallback if no saved admin override exists yet.
                </div>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <label for="admin-ai-provider" class="mb-2 block text-sm font-medium text-gray-300">AI Provider</label>
                <select
                  id="admin-ai-provider"
                  v-model="selectedAiProvider"
                  class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  :disabled="aiSettingsState.loading || savingAiSettings"
                >
                  <option
                    v-for="provider in selectedAiProviderOptions"
                    :key="provider.id"
                    :value="provider.id"
                  >
                    {{ provider.label }}{{ provider.enabled ? '' : ' (Unavailable)' }}
                  </option>
                </select>
                <p class="mt-2 text-xs text-gray-500">
                  Choose Gemini or ChatGPT as the active provider for AI-assisted workflows.
                </p>
              </div>

              <div>
                <label for="admin-ai-model" class="mb-2 block text-sm font-medium text-gray-300">Model</label>
                <select
                  id="admin-ai-model"
                  v-model="selectedAiModel"
                  class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  :disabled="aiSettingsState.loading || savingAiSettings || !selectedAiModelOptions.length"
                >
                  <option
                    v-for="model in selectedAiModelOptions"
                    :key="model.id"
                    :value="model.id"
                  >
                    {{ model.label }}
                  </option>
                </select>
                <p class="mt-2 text-xs text-gray-500">
                  Available model choices are curated from the server-side runtime configuration.
                </p>
              </div>
            </div>

            <div
              v-if="selectedAiProviderWarning"
              class="mt-4 rounded-lg border border-amber-800/70 bg-amber-950/30 p-4 text-sm text-amber-200"
            >
              {{ selectedAiProviderWarning }}
            </div>

            <div
              v-if="!aiSettings.initialized"
              class="mt-4 rounded-lg border border-blue-800/60 bg-blue-950/20 p-4 text-sm text-blue-200"
            >
              AI runtime settings are still using environment defaults until the server finishes initialization.
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-700 pt-4">
              <div class="text-sm text-gray-400">
                <span class="font-medium text-gray-200">Credential status:</span>
                Gemini {{ aiSettings.credentials.geminiConfigured ? 'configured' : 'missing key' }},
                ChatGPT {{ aiSettings.credentials.openaiConfigured ? 'configured' : 'missing key' }}.
              </div>
              <button
                id="admin-ai-settings-save"
                type="button"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canSaveAiSettings"
                @click="saveAiSettings"
              >
                <span v-if="savingAiSettings">Saving...</span>
                <span v-else>Save AI Model</span>
              </button>
            </div>
          </template>
        </div>

        <!-- AI Operational Limits -->
        <div class="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-xl">
          <div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 class="text-lg font-semibold text-white">AI Operational Limits</h2>
              <p class="mt-1 text-sm text-gray-400">
                Configure runtime behaviour for the AI layer. Changes take effect immediately.
              </p>
            </div>
          </div>

          <div class="grid gap-6 sm:grid-cols-3">
            <!-- Rate Limit -->
            <div>
              <label for="admin-ai-rate-limit" class="mb-1.5 block text-sm font-medium text-gray-300">
                Max Requests / Min
              </label>
              <input
                id="admin-ai-rate-limit"
                v-model.number="aiOperationalForm.rateLimitPerMinute"
                type="number"
                min="1"
                max="600"
                class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="savingAiOperational || aiSettingsState.loading"
              />
              <p v-if="aiSettings?.operationalDefaults" class="mt-1.5 text-xs text-gray-500">
                Env default: {{ aiSettings.operationalDefaults.rateLimitPerMinute }}
              </p>
            </div>

            <!-- Max Retries -->
            <div>
              <label for="admin-ai-max-retries" class="mb-1.5 block text-sm font-medium text-gray-300">
                Max Retry Attempts
              </label>
              <input
                id="admin-ai-max-retries"
                v-model.number="aiOperationalForm.maxRetries"
                type="number"
                min="0"
                max="10"
                class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="savingAiOperational || aiSettingsState.loading"
              />
              <p v-if="aiSettings?.operationalDefaults" class="mt-1.5 text-xs text-gray-500">
                Env default: {{ aiSettings.operationalDefaults.maxRetries }}
              </p>
            </div>

            <!-- Cache TTL -->
            <div>
              <label for="admin-ai-cache-ttl" class="mb-1.5 block text-sm font-medium text-gray-300">
                Cache TTL (seconds)
              </label>
              <input
                id="admin-ai-cache-ttl"
                v-model.number="aiOperationalForm.cacheTtlSeconds"
                type="number"
                min="0"
                max="86400"
                class="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="savingAiOperational || aiSettingsState.loading"
              />
              <p v-if="aiSettings?.operationalDefaults" class="mt-1.5 text-xs text-gray-500">
                Env default: {{ aiSettings.operationalDefaults.cacheTtlSeconds }}s
              </p>
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between border-t border-gray-700 pt-4">
            <p class="text-xs text-gray-500">
              Ranges: rate limit 1–600 req/min · retries 0–10 · cache TTL 0–86400 s
            </p>
            <button
              id="admin-ai-operational-save"
              type="button"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="savingAiOperational || aiSettingsState.loading"
              @click="saveAiOperational"
            >
              <span v-if="savingAiOperational">Saving…</span>
              <span v-else>Save Limits</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4 sm:flex-row sm:items-center">
          <h2 class="text-lg font-semibold text-white">AI Consumption Logs</h2>
          <div class="flex items-center gap-3">
            <select
              id="admin-ai-days"
              v-model.number="aiDays"
              class="rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white focus:outline-none"
              @change="applyAiDays"
            >
              <option :value="7">Last 7 days</option>
              <option :value="14">Last 14 days</option>
              <option :value="30">Last 30 days</option>
              <option :value="90">Last 90 days</option>
            </select>
            <button
              id="admin-ai-refresh"
              type="button"
              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="aiState.loading"
              @click="fetchAiUsage(true)"
            >
              Refresh
            </button>
          </div>
        </div>

        <div v-if="aiState.loading && !aiState.rows.length" class="flex justify-center p-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>

        <div
          v-else-if="aiState.error"
          id="admin-ai-error"
          class="rounded-xl border border-red-800/70 bg-red-950/30 p-6"
        >
          <h3 class="text-lg font-semibold text-white">Unable to load AI usage.</h3>
          <p class="mt-2 text-sm text-red-200">{{ aiState.error }}</p>
          <button
            type="button"
            class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
            @click="fetchAiUsage(true)"
          >
            Retry
          </button>
        </div>

        <template v-else>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div class="mb-1 text-xs uppercase text-gray-500">Total Tokens</div>
              <div class="text-2xl font-bold text-white">{{ formatNumber(aiSummary?.totalTokens ?? 0) }}</div>
            </div>
            <div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div class="mb-1 text-xs uppercase text-gray-500">Prompt Tokens</div>
              <div class="text-2xl font-bold text-indigo-400">{{ formatNumber(aiSummary?.promptTokens ?? 0) }}</div>
            </div>
            <div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div class="mb-1 text-xs uppercase text-gray-500">Completion Tokens</div>
              <div class="text-2xl font-bold text-teal-400">{{ formatNumber(aiSummary?.completionTokens ?? 0) }}</div>
            </div>
            <div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div class="mb-1 text-xs uppercase text-gray-500">Total API Calls</div>
              <div class="text-2xl font-bold text-white">{{ formatNumber(aiSummary?.requests ?? 0) }}</div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
            <div class="border-b border-gray-700 px-4 py-3 text-sm text-gray-400">
              <span v-if="aiTimeframe">
                Showing {{ aiTimeframe.days }} days of grouped usage from {{ formatDate(aiTimeframe.startDate) }} to {{ formatDate(aiTimeframe.endDate) }}.
              </span>
            </div>

            <table class="w-full border-collapse text-left">
              <thead class="border-b border-gray-700 bg-gray-900 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th class="p-4">Date</th>
                  <th class="p-4">Endpoint</th>
                  <th class="p-4 text-right">Requests</th>
                  <th class="p-4 text-right">Total Tokens</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50 text-sm">
                <tr v-if="!aiState.rows.length">
                  <td colspan="4" class="p-8 text-center text-gray-500">No usage data found for this period.</td>
                </tr>
                <tr
                  v-for="(row, idx) in aiState.rows"
                  :key="`${row._id?.date || 'date'}-${row._id?.endpoint || 'endpoint'}-${idx}`"
                  class="transition-colors hover:bg-gray-700/30"
                >
                  <td class="p-4 font-mono text-gray-400">{{ row._id?.date || '-' }}</td>
                  <td class="p-4">
                    <span class="rounded-full border border-indigo-500/30 bg-indigo-900/40 px-2 py-0.5 font-mono text-xs text-indigo-300">
                      {{ row._id?.endpoint || '-' }}
                    </span>
                  </td>
                  <td class="p-4 text-right text-gray-300">{{ formatNumber(row.totalRequests) }}</td>
                  <td class="p-4 text-right font-medium text-white">{{ formatNumber(row.totalTokens) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <div v-else-if="activeTab === 'audit'" class="space-y-6">
        <div class="flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h2 class="text-lg font-semibold text-white">System Audit Logs</h2>
          <div class="ml-auto">
            <button
              id="admin-audit-refresh"
              type="button"
              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="auditLogsState.loading"
              @click="fetchAuditLogs(true)"
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div class="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[980px] border-collapse text-left">
              <thead class="border-b border-gray-700 bg-gray-900 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th class="p-4 w-48">Timestamp</th>
                  <th class="p-4 w-48">Actor</th>
                  <th class="p-4">Action</th>
                  <th class="p-4">Target</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50 text-sm">
                <tr v-if="auditLogsState.loading && !auditLogsState.rows.length">
                  <td colspan="4" class="p-8 text-center">
                    <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                  </td>
                </tr>
                <tr v-else-if="auditLogsState.error">
                  <td colspan="4" class="p-8">
                    <div id="admin-audit-error" class="rounded-lg border border-red-800/70 bg-red-950/30 p-5">
                      <h3 class="font-semibold text-white">Unable to load audit logs.</h3>
                      <p class="mt-2 text-sm text-red-200">{{ auditLogsState.error }}</p>
                      <button
                        type="button"
                        class="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-900/50"
                        @click="fetchAuditLogs(true)"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="!auditLogsState.rows.length">
                  <td colspan="4" class="p-8 text-center text-gray-500">No logs found.</td>
                </tr>
                <tr
                  v-for="log in auditLogsState.rows"
                  :key="log._id"
                  class="transition-colors hover:bg-gray-700/30"
                >
                  <td class="p-4 text-gray-400 whitespace-nowrap">{{ new Date(log.createdAt).toLocaleString() }}</td>
                  <td class="p-4">
                    <div class="font-medium text-white">{{ log.actorId?.email || 'System' }}</div>
                    <div class="text-xs text-gray-500">{{ log.actorId?.role || 'automatic' }}</div>
                  </td>
                  <td class="p-4">
                    <span class="rounded bg-indigo-900/30 border border-indigo-700/50 px-2 py-0.5 text-xs text-indigo-300 font-mono">{{ log.action }}</span>
                  </td>
                  <td class="p-4 text-gray-300font-mono text-xs">{{ log.targetType || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-gray-700 bg-gray-900 p-4 text-sm text-gray-400">
            <span>
              Showing {{ auditLogsState.rows.length }} of {{ auditLogsState.pagination.total }} logs.
              Page {{ auditLogsState.pagination.page }} of {{ auditLogsState.pagination.totalPages }}.
            </span>
            <div class="flex gap-2">
              <button
                id="admin-audit-prev"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="auditLogsState.loading || auditLogsState.pagination.page <= 1"
                @click="changeAuditPage(auditLogsState.pagination.page - 1)"
              >
                Prev
              </button>
              <button
                id="admin-audit-next"
                type="button"
                class="rounded bg-gray-800 px-3 py-1 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="auditLogsState.loading || auditLogsState.pagination.page >= auditLogsState.pagination.totalPages"
                @click="changeAuditPage(auditLogsState.pagination.page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateUserModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 class="mb-4 text-xl font-bold text-white">Create New Account</h3>
        <form class="space-y-4" @submit.prevent="submitCreateUser">
          <div>
            <label class="mb-1 block text-sm text-gray-400">Name</label>
            <input
              v-model="newUserForm.name"
              id="admin-create-user-name"
              type="text"
              class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-400">Email <span class="text-red-500">*</span></label>
            <input
              v-model="newUserForm.email"
              id="admin-create-user-email"
              type="email"
              required
              class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-400">Temporary Password <span class="text-red-500">*</span></label>
            <input
              v-model="newUserForm.password"
              id="admin-create-user-password"
              type="password"
              required
              class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-400">System Role</label>
            <select
              v-model="newUserForm.role"
              id="admin-create-user-role"
              class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="client">Client</option>
              <option value="lawyer">Lawyer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button
              id="admin-create-user-cancel"
              type="button"
              class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
              :disabled="creatingUser"
              @click="closeCreateUserModal"
            >
              Cancel
            </button>
            <button
              id="admin-create-user-submit"
              type="submit"
              class="flex items-center gap-2 rounded-lg border border-transparent bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="creatingUser"
            >
              <span v-if="creatingUser" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="pendingUserAction"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 class="text-lg font-bold text-white">{{ pendingUserAction.title }}</h3>
        <p class="mt-3 text-sm text-gray-300">{{ pendingUserAction.message }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            :disabled="pendingUserAction.loading"
            @click="closePendingUserAction"
          >
            Cancel
          </button>
          <button
            :id="`admin-user-confirm-${pendingUserAction.kind}`"
            type="button"
            class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="pendingUserAction.loading"
            @click="confirmPendingUserAction"
          >
            <span v-if="pendingUserAction.loading">Saving...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="pendingIntakeStatusOverride"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 class="text-lg font-bold text-white">Confirm status override</h3>
        <p class="mt-3 text-sm text-gray-300">
          Override intake <span class="rounded bg-gray-800 px-1 font-mono text-xs">{{ pendingIntakeStatusOverride.id }}</span>
          from <span class="font-medium capitalize">{{ pendingIntakeStatusOverride.currentStatus }}</span>
          to <span class="font-medium capitalize">{{ pendingIntakeStatusOverride.nextStatus }}</span>?
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            :disabled="pendingIntakeStatusOverride.loading"
            @click="closePendingIntakeStatusOverride"
          >
            Cancel
          </button>
          <button
            id="admin-intake-status-confirm"
            type="button"
            class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="pendingIntakeStatusOverride.loading"
            @click="confirmIntakeStatusOverride"
          >
            <span v-if="pendingIntakeStatusOverride.loading">Saving...</span>
            <span v-else>Confirm Override</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="deleteState.id"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-sm rounded-2xl border border-red-900 border-t-4 border-t-red-500 bg-gray-900 p-6 shadow-2xl">
        <h3 class="mb-2 flex items-center gap-2 text-lg font-bold text-white">
          <span class="text-xl text-red-500">!</span>
          Destructive Action
        </h3>
        <p class="mb-6 text-sm text-gray-400">
          Permanently delete intake
          <span class="rounded bg-gray-800 px-1 font-mono text-xs">{{ deleteState.id }}</span>?
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            id="admin-intake-delete-cancel"
            type="button"
            class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="deleteState.deleting"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            id="admin-intake-delete-confirm"
            type="button"
            class="rounded-lg border border-red-700 bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="deleteState.deleting"
            @click="executeDeleteIntake"
          >
            <span v-if="deleteState.deleting">Deleting...</span>
            <span v-else>Yes, Force Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useToast } from '../composables/useToast';
import { useAuthStore } from '../stores/auth';

type AdminTab = 'dashboard' | 'users' | 'intakes' | 'ai' | 'audit';
type UserRole = 'client' | 'lawyer' | 'admin';
type IntakeType = 'will' | 'incorporation';
type IntakeStatus = 'started' | 'submitted' | 'reviewing' | 'completed';
type IntakeSort = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';

type AdminStatsResponse = {
  users: {
    total: number;
    active: number;
    disabled: number;
    byRole: Record<UserRole, number>;
  };
  intakes: {
    total: number;
    byStatus: Record<IntakeStatus, number>;
    byType: Record<IntakeType, number>;
  };
};

type UserRow = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  intakeCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type UsersResponse = {
  data: UserRow[];
  pagination: Pagination;
};

type AdminIntakeSummary = {
  total: number;
  byStatus: Record<IntakeStatus, number>;
  byType: Record<IntakeType, number>;
};

type AdminIntakeRow = {
  id: string;
  type: IntakeType;
  status: IntakeStatus;
  clientEmail: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  highlights: string;
  flagCount: number;
  assignedLawyerId?: string | null;
};

type AdminIntakesResponse = {
  data: AdminIntakeRow[];
  pagination: Pagination;
  summary: AdminIntakeSummary;
};

type AiUsageRow = {
  _id?: {
    date?: string;
    endpoint?: string;
  };
  totalRequests: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
};

type AiUsageSummary = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
};

type AiUsageResponse = {
  rows: AiUsageRow[];
  summary: AiUsageSummary;
  timeframe: {
    startDate: string;
    endDate: string;
    days: number;
  };
};

type AiProviderOption = {
  id: 'gemini' | 'openai';
  label: string;
  enabled: boolean;
  reason?: string;
};

type AiModelOption = {
  id: string;
  label: string;
};

type AiOperationalSettings = {
  rateLimitPerMinute: number;
  maxRetries: number;
  cacheTtlSeconds: number;
};

type AiSettingsResponse = {
  current: {
    provider: 'gemini' | 'openai';
    model: string;
  };
  defaults: {
    provider: 'gemini' | 'openai';
    model: string;
  };
  providers: AiProviderOption[];
  models: {
    gemini: AiModelOption[];
    openai: AiModelOption[];
  };
  credentials: {
    geminiConfigured: boolean;
    openaiConfigured: boolean;
  };
  initialized: boolean;
  operational: AiOperationalSettings;
  operationalDefaults: AiOperationalSettings;
};

type UserActionState =
  | {
      kind: 'role';
      title: string;
      message: string;
      userId: string;
      email: string;
      nextRole: UserRole;
      loading: boolean;
    }
  | {
      kind: 'status';
      title: string;
      message: string;
      userId: string;
      email: string;
      nextIsActive: boolean;
      loading: boolean;
    };

type IntakeStatusOverrideState = {
  id: string;
  currentStatus: IntakeStatus;
  nextStatus: IntakeStatus;
  loading: boolean;
};

type DeleteState = {
  id: string | null;
  deleting: boolean;
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const tabs: Array<{ id: AdminTab; name: string }> = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'users', name: 'Users' },
  { id: 'intakes', name: 'Intakes' },
  { id: 'ai', name: 'AI Logging' },
  { id: 'audit', name: 'Audit Logs' },
];

const VALID_TABS: AdminTab[] = ['dashboard', 'users', 'intakes', 'ai', 'audit'];
const VALID_USER_ROLES: UserRole[] = ['client', 'lawyer', 'admin'];
const VALID_INTAKE_TYPES: IntakeType[] = ['will', 'incorporation'];
const VALID_INTAKE_STATUSES: IntakeStatus[] = ['started', 'submitted', 'reviewing', 'completed'];
const VALID_INTAKE_SORTS: IntakeSort[] = ['updated_desc', 'updated_asc', 'created_desc', 'created_asc'];
const VALID_AI_DAYS = [7, 14, 30, 90];

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { showToast } = useToast();

const activeTab = computed<AdminTab>(() => parseTab(route.query.tab));

const dashboardState = reactive({
  stats: null as AdminStatsResponse | null,
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});

const usersState = reactive({
  rows: [] as UserRow[],
  pagination: { ...DEFAULT_PAGINATION },
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});

const intakesState = reactive({
  rows: [] as AdminIntakeRow[],
  pagination: { ...DEFAULT_PAGINATION },
  summary: null as AdminIntakeSummary | null,
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});

const aiState = reactive({
  rows: [] as AiUsageRow[],
  summary: null as AiUsageSummary | null,
  timeframe: null as AiUsageResponse['timeframe'] | null,
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});

const aiSettingsState = reactive({
  data: null as AiSettingsResponse | null,
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});

type AuditLogRow = {
  _id: string;
  action: string;
  actorId: { email: string; name: string; role: string; _id: string };
  targetType?: string;
  metadata?: any;
  createdAt: string;
}

const auditLogsState = reactive({
  rows: [] as AuditLogRow[],
  pagination: { ...DEFAULT_PAGINATION },
  loading: false,
  loaded: false,
  error: '',
  requestId: 0,
  lastKey: '',
});
const auditPage = ref(1);

const userSearchInput = ref('');
const userRoleFilter = ref('');
const userPage = ref(1);

const intakeSearchInput = ref('');
const intakeTypeFilter = ref('');
const intakeStatusFilter = ref('');
const intakeSort = ref<IntakeSort>('updated_desc');
const intakePage = ref(1);

const aiDays = ref(30);
const selectedAiProvider = ref<'gemini' | 'openai'>('gemini');
const selectedAiModel = ref('');
const savingAiSettings = ref(false);

const aiOperationalForm = reactive<AiOperationalSettings>({
    rateLimitPerMinute: 30,
    maxRetries: 3,
    cacheTtlSeconds: 3600,
});
const savingAiOperational = ref(false);

const showCreateUserModal = ref(false);
const creatingUser = ref(false);
const newUserForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'client' as UserRole,
});

const pendingUserAction = ref<UserActionState | null>(null);
const pendingIntakeStatusOverride = ref<IntakeStatusOverrideState | null>(null);
const deleteState = reactive<DeleteState>({
  id: null,
  deleting: false,
});

const userRolePendingById = reactive<Record<string, boolean>>({});
const userStatusPendingById = reactive<Record<string, boolean>>({});
const intakeStatusPendingById = reactive<Record<string, boolean>>({});

const dashboardStats = computed(() => dashboardState.stats);
const intakesSummary = computed(() => intakesState.summary);
const aiSummary = computed(() => aiState.summary);
const aiTimeframe = computed(() => aiState.timeframe);
const aiSettings = computed(() => aiSettingsState.data);
const selectedAiProviderOptions = computed(() => aiSettings.value?.providers ?? []);
const selectedAiModelOptions = computed(() => {
  if (!aiSettings.value) return [];
  return aiSettings.value.models[selectedAiProvider.value] ?? [];
});
const selectedAiProviderMeta = computed(() => selectedAiProviderOptions.value.find((provider) => provider.id === selectedAiProvider.value) ?? null);
const currentAiProviderMeta = computed(() => {
  if (!aiSettings.value) return null;
  return aiSettings.value.providers.find((provider) => provider.id === aiSettings.value?.current.provider) ?? null;
});
const defaultAiProviderMeta = computed(() => {
  if (!aiSettings.value) return null;
  return aiSettings.value.providers.find((provider) => provider.id === aiSettings.value?.defaults.provider) ?? null;
});
const currentAiProviderLabel = computed(() => currentAiProviderMeta.value?.label ?? aiSettings.value?.current.provider ?? '-');
const defaultAiProviderLabel = computed(() => defaultAiProviderMeta.value?.label ?? aiSettings.value?.defaults.provider ?? '-');
const selectedAiProviderWarning = computed(() => {
  if (!selectedAiProviderMeta.value || selectedAiProviderMeta.value.enabled) return '';
  return selectedAiProviderMeta.value.reason || `${selectedAiProviderMeta.value.label} is not configured on the server.`;
});
const aiSettingsDirty = computed(() => {
  if (!aiSettings.value) return false;
  return selectedAiProvider.value !== aiSettings.value.current.provider
    || selectedAiModel.value !== aiSettings.value.current.model;
});
const canSaveAiSettings = computed(() => {
  return !!aiSettings.value
    && !!selectedAiProviderMeta.value?.enabled
    && !!selectedAiModel.value
    && !aiSettingsState.loading
    && !savingAiSettings.value
    && aiSettingsDirty.value;
});
const currentAdminId = computed(() => String(authStore.user?.id ?? authStore.user?._id ?? ''));
const currentAdminEmail = computed(() => String(authStore.user?.email ?? ''));

function parseTab(value: unknown): AdminTab {
  const tab = typeof value === 'string' ? value : '';
  return VALID_TABS.includes(tab as AdminTab) ? (tab as AdminTab) : 'dashboard';
}

function parsePage(value: unknown): number {
  const parsed = Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseUserRole(value: unknown): string {
  const role = typeof value === 'string' ? value : '';
  return VALID_USER_ROLES.includes(role as UserRole) ? role : '';
}

function parseIntakeType(value: unknown): string {
  const type = typeof value === 'string' ? value : '';
  return VALID_INTAKE_TYPES.includes(type as IntakeType) ? type : '';
}

function parseIntakeStatus(value: unknown): string {
  const status = typeof value === 'string' ? value : '';
  return VALID_INTAKE_STATUSES.includes(status as IntakeStatus) ? status : '';
}

function parseIntakeSort(value: unknown): IntakeSort {
  const sort = typeof value === 'string' ? value : '';
  return VALID_INTAKE_SORTS.includes(sort as IntakeSort) ? (sort as IntakeSort) : 'updated_desc';
}

function parseAiDays(value: unknown): number {
  const parsed = Number.parseInt(typeof value === 'string' ? value : '', 10);
  return VALID_AI_DAYS.includes(parsed) ? parsed : 30;
}

function queryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

function buildQuery(updates: Record<string, string | undefined>) {
  const merged: Record<string, string> = {};
  const routeQuery = route.query as Record<string, unknown>;

  Object.entries(routeQuery).forEach(([key, value]) => {
    const nextValue = queryValue(value);
    if (nextValue) merged[key] = nextValue;
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  });

  return merged;
}

async function updateRouteQuery(updates: Record<string, string | undefined>) {
  const nextQuery = buildQuery(updates);
  const currentQuery = buildQuery({});

  if (JSON.stringify(nextQuery) === JSON.stringify(currentQuery)) {
    return;
  }

  await router.push({ query: nextQuery });
}

function userQueryKey() {
  return JSON.stringify({
    q: userSearchInput.value.trim(),
    role: userRoleFilter.value,
    page: userPage.value,
  });
}

function intakeQueryKey() {
  return JSON.stringify({
    q: intakeSearchInput.value.trim(),
    type: intakeTypeFilter.value,
    status: intakeStatusFilter.value,
    sort: intakeSort.value,
    page: intakePage.value,
  });
}

function aiQueryKey() {
  return JSON.stringify({ days: aiDays.value });
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function isStatsResponse(value: unknown): value is AdminStatsResponse {
  if (!isRecord(value) || !isRecord(value.users) || !isRecord(value.intakes)) return false;
  return isRecord(value.users.byRole) && isRecord(value.intakes.byStatus) && isRecord(value.intakes.byType);
}

function isUsersResponse(value: unknown): value is UsersResponse {
  return isRecord(value) && Array.isArray(value.data) && isRecord(value.pagination);
}

function isAdminIntakesResponse(value: unknown): value is AdminIntakesResponse {
  return isRecord(value) && Array.isArray(value.data) && isRecord(value.pagination) && isRecord(value.summary);
}

function isAiUsageResponse(value: unknown): value is AiUsageResponse {
  return isRecord(value) && Array.isArray(value.rows) && isRecord(value.summary) && isRecord(value.timeframe);
}

function isAiSettingsResponse(value: unknown): value is AiSettingsResponse {
  return isRecord(value)
    && isRecord(value.current)
    && Array.isArray(value.providers)
    && isRecord(value.models)
    && Array.isArray(value.models.gemini)
    && Array.isArray(value.models.openai)
    && isRecord(value.credentials);
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(num: number) {
  return Number(num || 0).toLocaleString('en-US');
}

function roleBadgeClass(role: UserRole) {
  return {
    'border-blue-800 bg-blue-900/30 text-blue-400': role === 'client',
    'border-purple-800 bg-purple-900/30 text-purple-400': role === 'lawyer',
    'border-red-800 bg-red-900/30 text-red-400': role === 'admin',
  };
}

function matterTypePercent(type: IntakeType) {
  if (!dashboardStats.value || !dashboardStats.value.intakes.total) return 0;
  return Math.round((dashboardStats.value.intakes.byType[type] / dashboardStats.value.intakes.total) * 100);
}

function isSelfManagedUser(user: UserRow) {
  return user.id === currentAdminId.value || user.email === currentAdminEmail.value;
}

function syncStateFromRoute() {
  userSearchInput.value = queryValue(route.query.user_q);
  userRoleFilter.value = parseUserRole(route.query.user_role);
  userPage.value = parsePage(route.query.user_page);

  intakeSearchInput.value = queryValue(route.query.intake_q);
  intakeTypeFilter.value = parseIntakeType(route.query.intake_type);
  intakeStatusFilter.value = parseIntakeStatus(route.query.intake_status);
  intakeSort.value = parseIntakeSort(route.query.intake_sort);
  intakePage.value = parsePage(route.query.intake_page);

  aiDays.value = parseAiDays(route.query.ai_days);
  auditPage.value = parsePage(route.query.audit_page);
}

async function fetchDashboard(force = false) {
  const key = 'dashboard';
  if (!force && dashboardState.loaded && dashboardState.lastKey === key) return;

  const requestId = ++dashboardState.requestId;
  dashboardState.loading = true;
  dashboardState.error = '';

  try {
    const { data } = await api.get('/admin/stats');
    if (requestId !== dashboardState.requestId) return;
    if (!isStatsResponse(data)) {
      throw new Error('Invalid dashboard response');
    }

    dashboardState.stats = data;
    dashboardState.loaded = true;
    dashboardState.lastKey = key;
  } catch (_error) {
    if (requestId !== dashboardState.requestId) return;
    dashboardState.error = 'The admin dashboard response was invalid or could not be loaded.';
    dashboardState.loaded = true;
  } finally {
    if (requestId === dashboardState.requestId) {
      dashboardState.loading = false;
    }
  }
}

async function fetchUsers(force = false) {
  const key = userQueryKey();
  if (!force && usersState.loaded && usersState.lastKey === key) return;

  const requestId = ++usersState.requestId;
  usersState.loading = true;
  usersState.error = '';

  try {
    const params = new URLSearchParams({
      page: String(userPage.value),
      limit: '20',
    });
    if (userRoleFilter.value) params.set('role', userRoleFilter.value);
    if (userSearchInput.value.trim()) params.set('search', userSearchInput.value.trim());

    const { data } = await api.get(`/admin/users?${params.toString()}`);
    if (requestId !== usersState.requestId) return;
    if (!isUsersResponse(data)) {
      throw new Error('Invalid users response');
    }

    usersState.rows = data.data;
    usersState.pagination = {
      page: Number(data.pagination.page) || 1,
      limit: Number(data.pagination.limit) || 20,
      total: Number(data.pagination.total) || 0,
      totalPages: Number(data.pagination.totalPages) || 1,
    };
    usersState.loaded = true;
    usersState.lastKey = key;
  } catch (_error) {
    if (requestId !== usersState.requestId) return;
    usersState.error = 'The users list could not be loaded.';
    usersState.loaded = true;
  } finally {
    if (requestId === usersState.requestId) {
      usersState.loading = false;
    }
  }
}

async function fetchIntakes(force = false) {
  const key = intakeQueryKey();
  if (!force && intakesState.loaded && intakesState.lastKey === key) return;

  const requestId = ++intakesState.requestId;
  intakesState.loading = true;
  intakesState.error = '';

  try {
    const params = new URLSearchParams({
      page: String(intakePage.value),
      limit: '20',
      sort: intakeSort.value,
    });
    if (intakeSearchInput.value.trim()) params.set('search', intakeSearchInput.value.trim());
    if (intakeTypeFilter.value) params.set('type', intakeTypeFilter.value);
    if (intakeStatusFilter.value) params.set('status', intakeStatusFilter.value);

    const { data } = await api.get(`/admin/intakes?${params.toString()}`);
    if (requestId !== intakesState.requestId) return;
    if (!isAdminIntakesResponse(data)) {
      throw new Error('Invalid intake response');
    }

    intakesState.rows = data.data;
    intakesState.pagination = {
      page: Number(data.pagination.page) || 1,
      limit: Number(data.pagination.limit) || 20,
      total: Number(data.pagination.total) || 0,
      totalPages: Number(data.pagination.totalPages) || 1,
    };
    intakesState.summary = data.summary;
    intakesState.loaded = true;
    intakesState.lastKey = key;
  } catch (_error) {
    if (requestId !== intakesState.requestId) return;
    intakesState.error = 'The admin intake list could not be loaded.';
    intakesState.loaded = true;
  } finally {
    if (requestId === intakesState.requestId) {
      intakesState.loading = false;
    }
  }
}

const adminLawyers = ref<{ id: string; name?: string; email: string }[]>([]);
const intakeLawyerPendingById = reactive<Record<string, boolean>>({});

async function fetchAdminLawyers() {
  if (adminLawyers.value.length > 0) return;
  try {
    const { data } = await api.get('/admin/users?role=lawyer&limit=1000');
    if (data && data.data) {
      adminLawyers.value = data.data;
    }
  } catch (error) {
    console.error('Failed to fetch lawyers for assignment', error);
  }
}

async function queueLawyerAssignment(intake: AdminIntakeRow, lawyerId: string) {
  intakeLawyerPendingById[intake.id] = true;
  try {
    await api.patch(`/admin/intakes/${intake.id}/assign`, { lawyerId: lawyerId || null });
    showToast('Lawyer assignment updated', 'success');
    intake.assignedLawyerId = lawyerId || null;
  } catch (err: any) {
    showToast(err?.response?.data?.message || 'Failed to assign lawyer', 'error');
    await fetchIntakes(true);
  } finally {
    intakeLawyerPendingById[intake.id] = false;
  }
}

async function fetchAiUsage(force = false) {
  const key = aiQueryKey();
  if (!force && aiState.loaded && aiState.lastKey === key) return;

  const requestId = ++aiState.requestId;
  aiState.loading = true;
  aiState.error = '';

  try {
    const { data } = await api.get(`/admin/ai-usage?days=${aiDays.value}`);
    if (requestId !== aiState.requestId) return;
    if (!isAiUsageResponse(data)) {
      throw new Error('Invalid AI usage response');
    }

    aiState.rows = data.rows;
    aiState.summary = data.summary;
    aiState.timeframe = data.timeframe;
    aiState.loaded = true;
    aiState.lastKey = key;
  } catch (_error) {
    if (requestId !== aiState.requestId) return;
    aiState.error = 'The AI usage data could not be loaded.';
    aiState.loaded = true;
  } finally {
    if (requestId === aiState.requestId) {
      aiState.loading = false;
    }
  }
}

async function fetchAuditLogs(force = false) {
  const key = `audit_${auditPage.value}`;
  if (!force && auditLogsState.loaded && auditLogsState.lastKey === key) return;

  const requestId = ++auditLogsState.requestId;
  auditLogsState.loading = true;
  auditLogsState.error = '';

  try {
    const { data } = await api.get(`/admin/audit-logs?page=${auditPage.value}&limit=50`);
    if (requestId !== auditLogsState.requestId) return;

    auditLogsState.rows = data.data;
    auditLogsState.pagination = {
      page: Number(data.pagination?.page) || 1,
      limit: Number(data.pagination?.limit) || 50,
      total: Number(data.pagination?.total) || 0,
      totalPages: Number(data.pagination?.pages) || 1,
    };
    auditLogsState.loaded = true;
    auditLogsState.lastKey = key;
  } catch (_error) {
    if (requestId !== auditLogsState.requestId) return;
    auditLogsState.error = 'The audit logs could not be loaded.';
    auditLogsState.loaded = true;
  } finally {
    if (requestId === auditLogsState.requestId) {
      auditLogsState.loading = false;
    }
  }
}

function syncSelectedAiModelFromSettings(settings: AiSettingsResponse | null) {
  if (!settings) return;

  selectedAiProvider.value = settings.current.provider;
  const availableModels = settings.models[selectedAiProvider.value] ?? [];
  const currentModelExists = availableModels.some((model) => model.id === settings.current.model);
  selectedAiModel.value = currentModelExists
    ? settings.current.model
    : (availableModels[0]?.id || settings.current.model);
}

function syncAiOperationalFromSettings(settings: AiSettingsResponse | null) {
  if (!settings?.operational) return;
  aiOperationalForm.rateLimitPerMinute = settings.operational.rateLimitPerMinute;
  aiOperationalForm.maxRetries = settings.operational.maxRetries;
  aiOperationalForm.cacheTtlSeconds = settings.operational.cacheTtlSeconds;
}

async function fetchAiSettings(force = false) {
  const key = 'ai-settings';
  if (!force && aiSettingsState.loaded && aiSettingsState.lastKey === key) return;

  const requestId = ++aiSettingsState.requestId;
  aiSettingsState.loading = true;
  aiSettingsState.error = '';

  try {
    const { data } = await api.get('/admin/ai-settings');
    if (requestId !== aiSettingsState.requestId) return;
    if (!isAiSettingsResponse(data)) {
      throw new Error('Invalid AI settings response');
    }

    aiSettingsState.data = data;
    aiSettingsState.loaded = true;
    aiSettingsState.lastKey = key;
    syncSelectedAiModelFromSettings(data);
    syncAiOperationalFromSettings(data);
  } catch (_error) {
    if (requestId !== aiSettingsState.requestId) return;
    aiSettingsState.error = 'The active AI model settings could not be loaded.';
    aiSettingsState.loaded = true;
  } finally {
    if (requestId === aiSettingsState.requestId) {
      aiSettingsState.loading = false;
    }
  }
}

async function saveAiSettings() {
  if (!aiSettings.value) return;
  if (!selectedAiProviderMeta.value?.enabled) {
    showToast(selectedAiProviderWarning.value || 'The selected AI provider is not configured.', 'error');
    return;
  }
  if (!selectedAiModel.value) {
    showToast('Select a model before saving AI settings.', 'error');
    return;
  }

  savingAiSettings.value = true;

  try {
    const { data } = await api.patch('/admin/ai-settings', {
      provider: selectedAiProvider.value,
      model: selectedAiModel.value,
    });

    if (!isAiSettingsResponse(data)) {
      throw new Error('Invalid AI settings response');
    }

    aiSettingsState.data = data;
    aiSettingsState.loaded = true;
    aiSettingsState.error = '';
    aiSettingsState.lastKey = 'ai-settings';
    syncSelectedAiModelFromSettings(data);

    showToast(`AI runtime updated to ${currentAiProviderLabel.value} / ${data.current.model}`, 'success');
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Failed to update AI settings', 'error');
  } finally {
    savingAiSettings.value = false;
  }
}

async function saveAiOperational() {
  savingAiOperational.value = true;
  try {
    await api.patch('/admin/ai-operational', {
      rateLimitPerMinute: aiOperationalForm.rateLimitPerMinute,
      maxRetries: aiOperationalForm.maxRetries,
      cacheTtlSeconds: aiOperationalForm.cacheTtlSeconds,
    });
    showToast('AI operational settings saved', 'success');
    await fetchAiSettings(true);
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Failed to save AI operational settings', 'error');
  } finally {
    savingAiOperational.value = false;
  }
}

function ensureActiveTabLoaded() {
  switch (activeTab.value) {
    case 'dashboard':
      void fetchDashboard();
      break;
    case 'users':
      void fetchUsers();
      break;
    case 'intakes':
      void fetchAdminLawyers();
      void fetchIntakes();
      break;
    case 'ai':
      void fetchAiSettings();
      void fetchAiUsage();
      break;
    case 'audit':
      void fetchAuditLogs();
      break;
  }
}

function setActiveTab(tab: AdminTab) {
  void updateRouteQuery({ tab });
}

function applyUserFilters() {
  void updateRouteQuery({
    tab: 'users',
    user_q: userSearchInput.value.trim() || undefined,
    user_role: userRoleFilter.value || undefined,
    user_page: undefined,
  });
}

function applyUserRoleFilter() {
  void updateRouteQuery({
    tab: 'users',
    user_role: userRoleFilter.value || undefined,
    user_page: undefined,
  });
}

function clearUserFilters() {
  userSearchInput.value = '';
  userRoleFilter.value = '';
  void updateRouteQuery({
    tab: 'users',
    user_q: undefined,
    user_role: undefined,
    user_page: undefined,
  });
}

function changeUserPage(page: number) {
  void updateRouteQuery({
    tab: 'users',
    user_page: page > 1 ? String(page) : undefined,
  });
}

function applyIntakeFilters() {
  void updateRouteQuery({
    tab: 'intakes',
    intake_q: intakeSearchInput.value.trim() || undefined,
    intake_type: intakeTypeFilter.value || undefined,
    intake_status: intakeStatusFilter.value || undefined,
    intake_sort: intakeSort.value !== 'updated_desc' ? intakeSort.value : undefined,
    intake_page: undefined,
  });
}

function applyIntakeSelectFilters() {
  void updateRouteQuery({
    tab: 'intakes',
    intake_type: intakeTypeFilter.value || undefined,
    intake_status: intakeStatusFilter.value || undefined,
    intake_sort: intakeSort.value !== 'updated_desc' ? intakeSort.value : undefined,
    intake_page: undefined,
  });
}

function clearIntakeFilters() {
  intakeSearchInput.value = '';
  intakeTypeFilter.value = '';
  intakeStatusFilter.value = '';
  intakeSort.value = 'updated_desc';
  void updateRouteQuery({
    tab: 'intakes',
    intake_q: undefined,
    intake_type: undefined,
    intake_status: undefined,
    intake_sort: undefined,
    intake_page: undefined,
  });
}

function changeIntakePage(page: number) {
  void updateRouteQuery({
    tab: 'intakes',
    intake_page: page > 1 ? String(page) : undefined,
  });
}

function changeAuditPage(page: number) {
  void updateRouteQuery({
    tab: 'audit',
    audit_page: page > 1 ? String(page) : undefined,
  });
}

function applyAiDays() {
  void updateRouteQuery({
    tab: 'ai',
    ai_days: aiDays.value !== 30 ? String(aiDays.value) : undefined,
  });
}

function resetCreateUserForm() {
  newUserForm.name = '';
  newUserForm.email = '';
  newUserForm.password = '';
  newUserForm.role = 'client';
}

function openCreateUserModal() {
  resetCreateUserForm();
  showCreateUserModal.value = true;
}

function closeCreateUserModal() {
  if (creatingUser.value) return;
  resetCreateUserForm();
  showCreateUserModal.value = false;
}

async function submitCreateUser() {
  creatingUser.value = true;
  try {
    await api.post('/admin/users', {
      name: newUserForm.name.trim() || undefined,
      email: newUserForm.email,
      password: newUserForm.password,
      role: newUserForm.role,
    });
    showToast('User created successfully', 'success');
    resetCreateUserForm();
    showCreateUserModal.value = false;
    await Promise.all([fetchUsers(true), fetchDashboard(true)]);
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Failed to create user', 'error');
  } finally {
    creatingUser.value = false;
  }
}

function queueRoleChange(user: UserRow, nextRole: string) {
  const normalizedRole = VALID_USER_ROLES.includes(nextRole as UserRole) ? (nextRole as UserRole) : user.role;
  if (normalizedRole === user.role) return;

  pendingUserAction.value = {
    kind: 'role',
    title: 'Confirm role change',
    message: `Change ${user.email} from ${user.role} to ${normalizedRole}?`,
    userId: user.id,
    email: user.email,
    nextRole: normalizedRole,
    loading: false,
  };
}

function queueStatusChange(user: UserRow) {
  pendingUserAction.value = {
    kind: 'status',
    title: user.isActive ? 'Disable account' : 'Enable account',
    message: `${user.isActive ? 'Disable' : 'Enable'} ${user.email}?`,
    userId: user.id,
    email: user.email,
    nextIsActive: !user.isActive,
    loading: false,
  };
}

function closePendingUserAction() {
  if (pendingUserAction.value?.loading) return;
  pendingUserAction.value = null;
}

async function confirmPendingUserAction() {
  if (!pendingUserAction.value) return;

  const action = pendingUserAction.value;
  action.loading = true;

  if (action.kind === 'role') {
    userRolePendingById[action.userId] = true;
  } else {
    userStatusPendingById[action.userId] = true;
  }

  try {
    if (action.kind === 'role') {
      await api.patch(`/admin/users/${action.userId}/role`, { role: action.nextRole });
      showToast('Role updated', 'success');
    } else {
      await api.patch(`/admin/users/${action.userId}/status`, { isActive: action.nextIsActive });
      showToast(action.nextIsActive ? 'Account enabled' : 'Account disabled', 'success');
    }

    pendingUserAction.value = null;
    await Promise.all([fetchUsers(true), fetchDashboard(true)]);
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'User update failed', 'error');
  } finally {
    if (action.kind === 'role') {
      delete userRolePendingById[action.userId];
    } else {
      delete userStatusPendingById[action.userId];
    }
    if (pendingUserAction.value) {
      pendingUserAction.value.loading = false;
    }
  }
}

function queueIntakeStatusOverride(intake: AdminIntakeRow, nextStatus: string) {
  const normalizedStatus = VALID_INTAKE_STATUSES.includes(nextStatus as IntakeStatus)
    ? (nextStatus as IntakeStatus)
    : intake.status;

  if (normalizedStatus === intake.status) return;

  pendingIntakeStatusOverride.value = {
    id: intake.id,
    currentStatus: intake.status,
    nextStatus: normalizedStatus,
    loading: false,
  };
}

function closePendingIntakeStatusOverride() {
  if (pendingIntakeStatusOverride.value?.loading) return;
  pendingIntakeStatusOverride.value = null;
}

async function confirmIntakeStatusOverride() {
  if (!pendingIntakeStatusOverride.value) return;

  const action = pendingIntakeStatusOverride.value;
  action.loading = true;
  intakeStatusPendingById[action.id] = true;

  try {
    await api.patch(`/admin/intakes/${action.id}/status`, { status: action.nextStatus });
    showToast('Intake status overridden', 'success');
    pendingIntakeStatusOverride.value = null;
    await Promise.all([fetchIntakes(true), fetchDashboard(true)]);
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Status override failed', 'error');
  } finally {
    delete intakeStatusPendingById[action.id];
    if (pendingIntakeStatusOverride.value) {
      pendingIntakeStatusOverride.value.loading = false;
    }
  }
}

function openDeleteModal(intake: AdminIntakeRow) {
  deleteState.id = intake.id;
  deleteState.deleting = false;
}

function closeDeleteModal() {
  if (deleteState.deleting) return;
  deleteState.id = null;
}

async function executeDeleteIntake() {
  if (!deleteState.id) return;
  const deletedId = deleteState.id;
  deleteState.deleting = true;

  try {
    await api.delete(`/admin/intakes/${deletedId}`);
    showToast('Intake permanently deleted', 'success');

    const shouldStepBackPage =
      intakesState.pagination.page > 1 && intakesState.rows.length === 1;

    deleteState.id = null;
    deleteState.deleting = false;

    if (shouldStepBackPage) {
      await Promise.all([
        updateRouteQuery({
          tab: 'intakes',
          intake_page: intakesState.pagination.page - 1 > 1 ? String(intakesState.pagination.page - 1) : undefined,
        }),
        fetchDashboard(true),
      ]);
      return;
    }

    await Promise.all([fetchIntakes(true), fetchDashboard(true)]);
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Failed to delete intake', 'error');
    deleteState.deleting = false;
  }
}

watch(
  selectedAiProvider,
  () => {
    if (!selectedAiModelOptions.value.length) {
      selectedAiModel.value = '';
      return;
    }

    const hasCurrentSelection = selectedAiModelOptions.value.some((model) => model.id === selectedAiModel.value);
    if (!hasCurrentSelection) {
      selectedAiModel.value = selectedAiModelOptions.value[0]?.id || '';
    }
  }
);

watch(
  () => route.query,
  () => {
    syncStateFromRoute();
    ensureActiveTabLoaded();
  },
  { immediate: true }
);
</script>
