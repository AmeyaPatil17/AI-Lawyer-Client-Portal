<script setup lang="ts">

import ClauseSuggestions from './ClauseSuggestions.vue';
import MatterFlags from './MatterFlags.vue';
import CaseNotes from '../CaseNotes.vue';

const props = defineProps<{
    intake: any;
    suggestions: any[];
    suggestionsLoading: boolean;
}>();
</script>

<template>
  <div class="space-y-6">
      <!-- Quick Info -->
      <div class="glass-panel p-6 rounded-2xl">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Client Details</h3>
          <div class="space-y-4">
              <div>
                  <span class="block text-xs text-gray-500 mb-1">Email Address</span>
                  <div class="text-white font-medium">{{ intake?.clientId?.email }}</div>
              </div>
              <div>
                  <span class="block text-xs text-gray-500 mb-1">Intake ID</span>
                  <div class="font-mono text-xs text-gray-400">{{ intake?._id }}</div>
              </div>
               <div>
                  <span class="block text-xs text-gray-500 mb-1">Triage: Residency</span>
                  <div class="text-white">{{ intake?.data?.triage?.ontarioResidency ? 'Ontario Resident' : 'Non-Resident' }}</div>
              </div>
          </div>
      </div>

      <!-- Smart Suggestions -->
      <ClauseSuggestions :suggestions="suggestions" :loading="suggestionsLoading" />

      <!-- Risk Analysis -->
      <MatterFlags :flags="intake?.flags || []" :logicWarnings="intake?.logicWarnings || []" :intakeId="intake?._id" />

      <!-- Case Notes -->
      <div class="h-[400px]">
          <CaseNotes :intakeId="intake?._id" :initialNotes="intake?.notes || []" />
      </div>
  </div>
</template>
