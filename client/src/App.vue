<template>
  <div class="w-full min-h-screen bg-gray-900 text-white relative">
    <!-- Skip to content (A11y) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none">
      Skip to main content
    </a>
    <Navbar />
    <main id="main-content">
        <router-view></router-view>
    </main>
    <AIGuide instance-role="primary" />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import AIGuide from './components/AIGuide.vue';
import Navbar from './components/common/Navbar.vue';
import Toast from './components/common/Toast.vue';
</script>

<style>
/* Global resets handled by Tailwind */
</style>
