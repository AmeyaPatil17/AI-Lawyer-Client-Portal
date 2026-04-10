<template>
  <div class="animate-fade-in-up">
    <!-- Header -->
    <div class="flex justify-between items-start mb-8">
      <div>
        <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-200">Review & Submit</h2>
        <p class="text-gray-400 mt-2 max-w-2xl">Please review your information before submitting to your lawyer.</p>
      </div>
      
      <!-- Completeness Score Gauge -->
      <div class="text-center">
        <div class="relative w-24 h-24">
          <svg class="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#374151" stroke-width="8"></circle>
            <circle 
              cx="48" cy="48" r="40" 
              fill="none" 
              :stroke="completenessColor" 
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="completenessOffset"
              class="transition-all duration-1000 ease-out"
            ></circle>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl font-bold" :class="completenessScore >= 80 ? 'text-green-400' : completenessScore >= 50 ? 'text-yellow-400' : 'text-red-400'">{{ completenessScore }}%</span>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-1">Completeness</p>
      </div>
    </div>
    
    <!-- W11: Section Summaries with Edit Links -->
    <div class="space-y-4">
      
      <!-- Personal Profile -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.personal = !expandedSections.personal" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('personalProfile') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('personalProfile') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Personal Profile</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/profile" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.personal }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.personal" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-gray-400">Name:</span> <span class="text-white">{{ displayName(store.intakeData.personalProfile?.fullName) || 'Not set' }}</span></div>
            <div><span class="text-gray-400">DOB:</span> <span class="text-white">{{ store.intakeData.personalProfile?.dateOfBirth || 'Not set' }}</span></div>
            <div><span class="text-gray-400">Marital Status:</span> <span class="text-white">{{ store.intakeData.personalProfile?.maritalStatus || 'Not set' }}</span></div>
            <div><span class="text-gray-400">Address:</span> <span class="text-white">{{ store.intakeData.personalProfile?.address || 'Not set' }}</span></div>
          </div>
        </div>
      </div>

      <!-- Family -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.family = !expandedSections.family" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('family') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('family') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Family & Dependants</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/family" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.family }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.family" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div><span class="text-gray-400">Spouse:</span> <span class="text-white">{{ displayName(store.intakeData.family?.spouseName) || 'N/A' }}</span></div>
            <div><span class="text-gray-400">Children:</span> <span class="text-white">{{ store.intakeData.family?.children?.length || 0 }}</span></div>
          </div>
        </div>
      </div>

      <!-- Executors -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.executors = !expandedSections.executors" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('executors') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('executors') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Executors</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/executors" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.executors }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.executors" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div>
              <span class="text-gray-400">Primary:</span>
              <span class="text-white">{{ displayName(executorsSummary.primary.fullName) || 'Not set' }}</span>
              <span v-if="executorsSummary.primary.relationship" class="text-gray-500"> ({{ executorsSummary.primary.relationship }})</span>
            </div>
            <div v-if="executorsSummary.alternates.length">
              <span class="text-gray-400">Alternates:</span>
              <span class="text-white">
                {{ executorsSummary.alternates.map((a) => a.relationship ? `${displayName(a.fullName)} (${a.relationship})` : displayName(a.fullName)).join(', ') }}
              </span>
            </div>
            <div>
              <span class="text-gray-400">Compensation:</span>
              <span class="text-white">
                {{
                  executorsSummary.compensation === 'gratis'
                    ? 'Gratis'
                    : executorsSummary.compensation === 'specific'
                      ? 'Specific Terms'
                      : 'Standard Court Guidelines (~5%)'
                }}
              </span>
            </div>
            <div v-if="executorsSummary.compensation === 'specific' && executorsSummary.compensationDetails">
              <span class="text-gray-400">Specific Terms:</span>
              <span class="text-white">{{ executorsSummary.compensationDetails }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Beneficiaries -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.beneficiaries = !expandedSections.beneficiaries" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('beneficiaries') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('beneficiaries') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Beneficiaries</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/beneficiaries" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.beneficiaries }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.beneficiaries" class="p-4 pt-0 border-t border-gray-700/50">
          <ul class="text-sm space-y-1">
            <li v-for="(ben, i) in (store.intakeData.beneficiaries?.beneficiaries || [])" :key="i" class="flex justify-between">
              <span class="text-white">{{ displayName(ben.fullName) }}</span>
              <span class="text-gray-400">{{ ben.share }}%</span>
            </li>
            <li v-if="!store.intakeData.beneficiaries?.beneficiaries?.length" class="text-gray-500 italic">No beneficiaries added</li>
          </ul>
        </div>
      </div>

      <!-- Assets -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.assets = !expandedSections.assets" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('assets') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('assets') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Assets</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/assets" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.assets }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.assets" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div class="text-gray-400">{{ assetsSummary.assetCount }} assets recorded</div>
            <div class="text-gray-400">{{ assetsSummary.liabilityCount }} liabilities recorded</div>
            <div><span class="text-gray-400">Assets:</span> <span class="text-white">${{ assetsSummary.totalAssetValue.toLocaleString() }}</span></div>
            <div><span class="text-gray-400">Liabilities:</span> <span class="text-white">${{ assetsSummary.totalLiabilityValue.toLocaleString() }}</span></div>
            <div><span class="text-gray-400">Estimated Net Estate:</span> <span class="text-white">${{ assetsSummary.netEstateValue.toLocaleString() }}</span></div>
          </div>
        </div>
      </div>
      <!-- Guardians (Conditional) -->
      <div v-if="hasMinorChildrenInFamily(store.intakeData.family)" class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.guardians = !expandedSections.guardians" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('guardians') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('guardians') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Guardians</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/guardians" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.guardians }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.guardians" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div><span class="text-gray-400">Primary:</span> <span class="text-white">{{ displayName(store.intakeData.guardians?.primary?.fullName) || 'Not set' }}</span></div>
            <div v-if="store.intakeData.guardians?.alternates?.length">
              <span class="text-gray-400">Alternates:</span> 
              <span class="text-white">{{ store.intakeData.guardians.alternates.map((a: any) => displayName(a.fullName)).join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Power of Attorney -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.poa = !expandedSections.poa" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('poa') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('poa') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Power of Attorney</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/poa" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.poa }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.poa" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div>
              <span class="text-gray-400">Property Attorney:</span>
              <span class="text-white">{{ displayName(poaSummary.property.primaryName) || 'Not set' }}</span>
              <span v-if="poaSummary.property.primaryRelationship" class="text-gray-500"> ({{ poaSummary.property.primaryRelationship }})</span>
            </div>
            <div v-if="poaSummary.property.alternateName">
              <span class="text-gray-400">Property Alternate:</span>
              <span class="text-white">{{ displayName(poaSummary.property.alternateName) }}</span>
              <span v-if="poaSummary.property.alternateRelationship" class="text-gray-500"> ({{ poaSummary.property.alternateRelationship }})</span>
            </div>
            <div>
              <span class="text-gray-400">Personal Care Attorney:</span>
              <span class="text-white">{{ displayName(poaSummary.personalCare.primaryName) || 'Not set' }}</span>
              <span v-if="poaSummary.personalCare.primaryRelationship" class="text-gray-500"> ({{ poaSummary.personalCare.primaryRelationship }})</span>
            </div>
            <div v-if="poaSummary.personalCare.alternateName">
              <span class="text-gray-400">Personal Care Alternate:</span>
              <span class="text-white">{{ displayName(poaSummary.personalCare.alternateName) }}</span>
              <span v-if="poaSummary.personalCare.alternateRelationship" class="text-gray-500"> ({{ poaSummary.personalCare.alternateRelationship }})</span>
            </div>
            <div>
              <span class="text-gray-400">Living Will Clause:</span>
              <span class="text-white">{{ poaSummary.personalCare.hasLivingWill ? 'Included' : 'Not included' }}</span>
            </div>
            <div v-if="poaSummary.personalCare.healthInstructions">
              <span class="text-gray-400">Health Instructions:</span>
              <span class="text-white">{{ poaSummary.personalCare.healthInstructions }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Funeral Wishes -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.funeral = !expandedSections.funeral" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('funeral') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('funeral') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Funeral Wishes</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/funeral" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.funeral }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.funeral" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div><span class="text-gray-400">Preference:</span> <span class="text-white capitalize">{{ (store.intakeData as any).funeral?.type || 'Not set' }}</span></div>
          </div>
        </div>
      </div>

      <!-- Prior Wills -->
      <div class="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
        <button 
          @click="expandedSections.priorWills = !expandedSections.priorWills" 
          class="w-full p-4 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
        >
          <div class="flex items-center">
            <span :class="sectionStatus('priorWills') === 'complete' ? 'text-green-400' : 'text-yellow-400'" class="mr-3">
              <svg v-if="sectionStatus('priorWills') === 'complete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <h3 class="text-lg font-semibold text-gray-200">Prior Wills</h3>
          </div>
          <div class="flex items-center gap-3">
            <router-link to="/wizard/prior-wills" class="text-xs text-blue-400 hover:text-blue-300 underline">Edit</router-link>
            <svg class="w-5 h-5 text-gray-500 transition-transform" :class="{ 'rotate-180': expandedSections.priorWills }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </button>
        <div v-show="expandedSections.priorWills" class="p-4 pt-0 border-t border-gray-700/50">
          <div class="text-sm space-y-2">
            <div><span class="text-gray-400">Has Prior Will:</span> <span class="text-white capitalize">{{ (store.intakeData as any).priorWills?.hasPriorWill || 'Not set' }}</span></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- W6/W14: AI Analysis & Flags -->
    <div class="mt-8 bg-gray-900/50 rounded-xl border border-gray-700 p-6 animate-fade-in">
        <div class="flex items-center space-x-3 mb-4">
             <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
             </div>
             <h3 class="text-xl font-semibold text-white">AI Analysis & Smart Flags</h3>
        </div>

        <div v-if="analysisIssues.length === 0" class="text-gray-400 italic">
            <span class="text-green-400">✓</span> No contradictions or warnings detected.
        </div>

        <div v-else class="space-y-3">
             <div v-for="(issue, idx) in analysisIssues" :key="idx" 
                class="p-4 rounded-lg flex items-start gap-3 border"
                :class="{
                    'bg-red-900/20 border-red-500/30 text-red-200': issue.type === 'error',
                    'bg-yellow-900/20 border-yellow-500/30 text-yellow-200': issue.type === 'warning',
                    'bg-blue-900/20 border-blue-500/30 text-blue-200': issue.type === 'info'
                }"
             >
                 <span class="mt-0.5 text-lg">
                    {{ issue.type === 'error' ? '🚫' : (issue.type === 'warning' ? '⚠️' : 'ℹ️') }}
                 </span>
                 <div>
                     <strong class="block text-sm font-bold uppercase tracking-wider opacity-75">{{ issue.title }}</strong>
                     <p class="text-sm">{{ issue.message }}</p>
                 </div>
             </div>
        </div>
    </div>

    <!-- Q3: Critical-sections gate — each must be individually complete before submission -->
    <div v-if="incompleteCriticalSections.length > 0" class="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
      <div class="flex items-center mb-2">
        <svg class="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <p class="font-medium text-yellow-200">Required sections are incomplete</p>
      </div>
      <p class="text-sm text-yellow-200/70 mb-2">Please complete these sections before submitting:</p>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="section in incompleteCriticalSections" :key="section" class="text-sm text-yellow-300">{{ section }}</li>
      </ul>
    </div>

    <!-- Client Notes -->
    <div class="mt-6">
      <label class="block text-sm font-medium mb-2 text-gray-400">Notes for Lawyer (Optional)</label>
      <textarea 
        v-model="clientNotes" 
        class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 h-24"
        placeholder="Any additional context, questions, or clarifications..."
      ></textarea>
    </div>
    <!-- Submit Confirmation Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl overflow-hidden animate-scale-in">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 class="text-2xl font-bold mb-2">Ready to Submit?</h3>
          <p class="text-gray-400">By submitting, you are sending your intake package to Valiant Law. You will no longer be able to edit these details. Are you sure you're ready?</p>
        </div>
        <div class="bg-gray-900 p-4 flex justify-end space-x-3">
          <button @click="showConfirmModal = false" :disabled="isSubmitting" class="px-5 py-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-50">Cancel</button>
          <button @click="submitIntake" :disabled="isSubmitting" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center disabled:opacity-50">
             <span v-if="isSubmitting" class="mr-2 animate-spin">⟳</span>
             Yes, Submit Intake
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useIntakeStore } from '../../stores/intake';
import { useRouter } from 'vue-router';
import { useToast } from '../../composables/useToast';
import { useWizardStepSave } from '../../composables/useWizardStepSave';
import api from '../../api';
import { getAssetsSummary, isAssetsStepComplete } from '../../utils/assetList';
import { isExecutorsStepComplete, normalizeExecutorsData } from '../../utils/executors';
import { hasMinorChildrenInFamily } from '../../utils/family';
import { isPoaStepComplete, normalizePoaData } from '../../utils/poa';

const displayName = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.name || '';
};

const store = useIntakeStore();
const router = useRouter();
const isSubmitting = ref(false);
const clientNotes = ref('');

const expandedSections = ref({
  personal: false,
  family: false,
  executors: false,
  beneficiaries: false,
  assets: false,
  guardians: false,
  poa: false,
  funeral: false,
  priorWills: false
});

const showConfirmModal = ref(false);
const assetsSummary = computed(() => getAssetsSummary(store.intakeData.assets));
const executorsSummary = computed(() => normalizeExecutorsData(store.intakeData.executors));
const poaSummary = computed(() => normalizePoaData(store.intakeData.poa));
const reviewPayload = computed(() => ({
  clientNotes: clientNotes.value,
}));
const { scheduleSave, commitStep, hasPendingChanges, markInitialized } = useWizardStepSave(() => reviewPayload.value);

onMounted(async () => {
    // S1: Use isInitialized flag
    if (!store.isInitialized) {
        await store.fetchIntake();
    }
    if (store.intakeData.clientNotes) {
        clientNotes.value = store.intakeData.clientNotes as string;
    }

    store.stageIntakeStep(reviewPayload.value);
    markInitialized();
});

watch(clientNotes, () => {
  scheduleSave();
});

// R1: All 9 sections tracked for completeness
const sections = ['personalProfile', 'family', 'executors', 'beneficiaries', 'assets', 'poa', 'funeral', 'priorWills', 'guardians'];
// R3: Only these 4 MUST be complete individually to submit
const CRITICAL_SECTIONS: Record<string, string> = {
    personalProfile: 'Personal Profile',
    family: 'Family & Dependants',
    executors: 'Executors',
    beneficiaries: 'Beneficiaries',
    poa: 'Power of Attorney',
};

const sectionStatus = (section: string): 'complete' | 'incomplete' => {
  const data = (store.intakeData as any)[section];
  if (!data) return 'incomplete';
  
  switch (section) {
    case 'personalProfile':
      return data.fullName && data.dateOfBirth && data.maritalStatus ? 'complete' : 'incomplete';
    case 'family':
      return data.maritalStatus ? 'complete' : 'incomplete';
    case 'executors':
      return isExecutorsStepComplete(data, {
        clientFullName: store.intakeData.personalProfile?.fullName,
      }) ? 'complete' : 'incomplete';
    case 'beneficiaries': {
      const bens = data.beneficiaries || [];
      if (bens.length === 0) return 'incomplete';
      const total = bens.reduce((sum: number, b: any) => sum + (b.share || 0), 0);
      return Math.abs(total - 100) <= 0.1 ? 'complete' : 'incomplete';
    }
    case 'assets':
      return isAssetsStepComplete(data) ? 'complete' : 'incomplete';
    case 'guardians':
      // Only relevant if minor children exist
      return hasMinorChildrenInFamily(store.intakeData.family)
        ? (data.primary?.fullName ? 'complete' : 'incomplete')
        : 'complete';
    case 'poa':
      return isPoaStepComplete(data, {
        clientFullName: store.intakeData.personalProfile?.fullName,
      }) ? 'complete' : 'incomplete';
    case 'funeral':
      return data.type ? 'complete' : 'incomplete';
    case 'priorWills':
      return !!data.hasPriorWill ? 'complete' : 'incomplete';
    default:
      return 'incomplete';
  }
};

const completenessScore = computed(() => {
  const complete = sections.filter(s => sectionStatus(s) === 'complete').length;
  return Math.round((complete / sections.length) * 100);
});

// R3: List of critical sections that are not individually complete
const incompleteCriticalSections = computed(() => {
    return Object.entries(CRITICAL_SECTIONS)
        .filter(([key]) => sectionStatus(key) !== 'complete')
        .map(([, label]) => label);
});

// SVG circle calculations
const circumference = 2 * Math.PI * 40;
const completenessOffset = computed(() => {
  return circumference - (completenessScore.value / 100) * circumference;
});

// R2: Tailwind-safe colour class (hex values cannot be used as Tailwind classes)
const completenessColor = computed(() => {
  if (completenessScore.value >= 80) return '#22c55e'; // green — still used for SVG stroke
  if (completenessScore.value >= 50) return '#eab308'; // yellow
  return '#ef4444'; // red
});

// AI Analysis Logic (W6, W14)
const analysisIssues = computed(() => {
    const issues = [];
    const data = store.intakeData;
    const normalizedExecutors = normalizeExecutorsData(data.executors);

    // 1. Check for Spouse Disinheritance Risk
    if (data.family?.maritalStatus === 'married' && data.beneficiaries?.beneficiaries) {
         const spouseInBens = data.beneficiaries.beneficiaries.some((b: any) => {
            const bName = typeof b.fullName === 'string' ? b.fullName : (b.fullName?.name || '');
            const sName = typeof data.family?.spouseName === 'string' ? data.family.spouseName : '';
            return b.relationship?.toLowerCase() === 'spouse' || (bName && sName && bName === sName);
         });
         if (!spouseInBens) {
             issues.push({
                 type: 'error',
                 title: 'Potential Disinheritance',
                 message: 'You are married but have not listed your spouse as a residue beneficiary. This may be contested under family law.'
             });
         }
    }

    // 2. Minor Children checks — R5: use proper age calculation
    const hasMinors = hasMinorChildrenInFamily(data.family);
    if (hasMinors) {
        if (!data.guardians?.primary?.fullName) {
             issues.push({
                 type: 'error',
                 title: 'Missing Guardians',
                 message: 'You have identified minor children but have not appointed a Guardian.'
             });
        }
        
        // Trust age check
        const trustAge = data.beneficiaries?.trustConditions?.ageOfMajority;
        if (trustAge !== undefined && trustAge < 18) {
            issues.push({
                type: 'warning',
                title: 'Trust Age Warning',
                message: 'The trust handover age (' + trustAge + ') is below the age of majority (18). This may not be legally binding.'
            });
        }
    }

    // 3. Executor also Guardian — R4: plain string comparison only (PersonRef deprecated)
    if (data.executors?.primary?.fullName && data.guardians?.primary?.fullName) {
        const exName = typeof data.executors.primary.fullName === 'string'
            ? data.executors.primary.fullName : '';
        const guName = typeof data.guardians.primary.fullName === 'string'
            ? data.guardians.primary.fullName : '';
        const isSame = exName && guName && exName === guName;

        if (isSame) {
             issues.push({
                 type: 'info',
                 title: 'Dual Role Note',
                 message: `${exName} is appointed as both Executor and Guardian. This is allowed but concentrates responsibility in one person.`
             });
        }
    }

    // 4. No Alternates — only flag if executors section is complete
    if (sectionStatus('executors') === 'complete' && normalizedExecutors.alternates.length === 0) {
        issues.push({
            type: 'warning',
            title: 'No Alternate Executor',
            message: 'It is highly recommended to appoint an alternate executor in case your primary choice cannot act.'
        });
    }

    return issues;
});

const { showToast } = useToast();

const triggerPrimaryAction = () => {
    if (incompleteCriticalSections.value.length > 0) {
        showToast('Please complete the required sections before submitting.', 'warning');
        return;
    }

    showConfirmModal.value = true;
};

const submitIntake = async () => {
    if (incompleteCriticalSections.value.length > 0) return;
    
    isSubmitting.value = true;
    try {
        await commitStep(true);
        const id = store.currentIntakeId;
        if (!id) throw new Error('No intake ID');

        const response = await api.post(`/intake/${id}/submit`, {
            clientNotes: clientNotes.value
        });

        store.setIntakeData({
            ...store.intakeData,
            clientNotes: clientNotes.value.trim() || undefined,
            submitted: true,
            submissionDate: response.data?.submissionDate
        });
        
        showToast('Intake submitted successfully! A lawyer will contact you shortly.', 'success');
        showConfirmModal.value = false;
        router.push('/dashboard');
    } catch (error) {
        console.error('Submission error:', error);
        showToast('Failed to submit. Please try again.', 'error');
        isSubmitting.value = false;
    }
};

defineExpose({
    commitStep,
    hasPendingChanges,
    triggerPrimaryAction,
    getPrimaryActionState: () => ({
        disabled: isSubmitting.value || incompleteCriticalSections.value.length > 0,
        loading: isSubmitting.value,
        label: isSubmitting.value ? 'Submitting...' : 'Submit',
    }),
});
</script>
