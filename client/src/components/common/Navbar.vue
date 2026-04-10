<template>
  <nav class="sticky top-0 z-40 w-full card-glass border-b border-gray-700/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo / Brand -->
        <div class="flex items-center">
          <router-link to="/" class="flex-shrink-0 flex items-center gap-2 group">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300">
               <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span class="font-bold text-xl tracking-tight text-white group-hover:text-violet-200 transition-colors">Valiant <span class="text-violet-400">AI</span></span>
          </router-link>
          
          <!-- Desktop Menu (Hidden by default as per user request) -->
          <div class="hidden md:block">
             <!-- Links removed based on feedback -->
          </div>
        </div>

        <!-- Right Side Actions -->
        <div class="hidden md:block">
          <div class="ml-4 flex items-center md:ml-6">
             <template v-if="!authStore.isAuthenticated">
                <router-link to="/login" class="text-gray-300 hover:text-white text-sm font-medium mr-4 transition-colors">
                    Log In
                </router-link>
                <router-link to="/register" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all hover:scale-105">
                    Get Started
                </router-link>
             </template>
             <template v-else>
                 <div class="flex items-center gap-3">
                     <span class="text-sm text-gray-400">Hello, {{ userName }}</span>
                     <router-link v-if="userRole === 'admin'" to="/admin" class="text-gray-300 hover:text-white text-sm font-medium bg-gray-700/50 hover:bg-gray-600/80 px-3 py-1.5 rounded-lg transition-colors border border-indigo-600/50">
                        Admin
                     </router-link>
                     <button @click="handleLogout" class="text-gray-300 hover:text-white text-sm font-medium bg-gray-700/50 hover:bg-gray-600/80 px-3 py-1.5 rounded-lg transition-colors border border-gray-600">
                        Log Out
                     </button>
                 </div>
             </template>
          </div>
        </div>

        <!-- Mobile menu button -->
        <div class="-mr-2 flex md:hidden">
          <button @click="mobileMenuOpen = !mobileMenuOpen" type="button" class="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none ring-2 ring-inset ring-transparent focus:ring-white">
            <span class="sr-only">Open main menu</span>
            <svg class="h-6 w-6" :class="{'hidden': mobileMenuOpen, 'block': !mobileMenuOpen}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg class="h-6 w-6" :class="{'block': mobileMenuOpen, 'hidden': !mobileMenuOpen}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div class="md:hidden" v-show="mobileMenuOpen">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-900 border-b border-gray-700">
        <router-link to="/" class="block px-3 py-2 rounded-md text-base font-medium text-white bg-gray-800">Home</router-link>
        <router-link to="/register" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">Get Started</router-link>
        
        <template v-if="authStore.isAuthenticated">
             <router-link v-if="userRole === 'client'" to="/dashboard" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">Dashboard</router-link>
             <router-link v-if="userRole === 'lawyer' || userRole === 'admin'" to="/lawyer" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">Lawyer Portal</router-link>
             <router-link v-if="userRole === 'admin'" to="/admin" class="block px-3 py-2 rounded-md text-base font-medium text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 border-l-2 border-indigo-500">Admin Panel</router-link>
             <button @click="handleLogout" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-gray-700">Log Out</button>
        </template>
        <template v-else>
            <router-link to="/login" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">Log In</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router'; // We don't have a structured Auth store visible yet in my file view, so assuming basic local storage or using a store pattern if I find it.
// Actually, I saw `client/src/stores/auth.ts` in file list earlier. Let's use it.
import { useAuthStore } from '../../stores/auth'; // Adjust path if needed

const authStore = useAuthStore();
const router = useRouter();
const mobileMenuOpen = ref(false);

const userName = computed(() => {
    return authStore.user?.name || authStore.user?.email || 'User';
});

const userRole = computed(() => {
    return authStore.user?.role;
});

const handleLogout = () => {
    authStore.logout();
    // Force a full page reload to ensure all Pinia stores and socket connections are completely cleared out
    window.location.href = '/login';
};
</script>
