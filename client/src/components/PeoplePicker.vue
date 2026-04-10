<template>
  <div class="relative group" ref="containerRef">
    <label v-if="label" class="block text-sm font-medium mb-1 text-gray-400">{{ label }}</label>

    <div class="relative">
      <input
        v-bind="forwardedAttrs"
        :value="nameValue"
        @input="onInput"
        @focus="isOpen = true"
        @blur="$emit('blur', $event)"
        type="text"
        :placeholder="placeholder"
        class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
        :class="[inputClass, attrs.class]" />

      <!-- Suggestions Dropdown -->
      <div v-if="isOpen && filteredPeople.length > 0"
        class="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700">
          Suggested People
        </div>
        <ul>
          <li v-for="(person, idx) in filteredPeople" :key="idx" @click="selectPerson(person)"
            class="px-4 py-3 hover:bg-blue-600/20 cursor-pointer flex justify-between items-center group/item transition-colors">
            <span class="font-medium text-gray-200 group-hover/item:text-white">{{ person.name }}</span>
            <span class="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">
              {{ person.role }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

import { ref, computed, onMounted, onUnmounted, useAttrs } from 'vue';
import { useIntakeStore } from '../stores/intake';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Enter name...' },
  inputClass: { type: [String, Array, Object], default: '' },
  excludeNames: { type: Array as () => string[], default: () => [] }
});

const emit = defineEmits(['update:modelValue', 'blur']);
const store = useIntakeStore();
const attrs = useAttrs();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(0 as any); // Type cast for template ref

// Since all types are strings now, nameValue is just the string
const nameValue = computed(() => props.modelValue || '');
const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

const onInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  // Emit as string to match Mongoose/Zod schema requirements
  emit('update:modelValue', val);
  isOpen.value = true;
};

const filteredPeople = computed(() => {
  const list = store.allPeople;
  const currentName = nameValue.value.toLowerCase();
  const excludeNames = props.excludeNames.map(n => n.toLowerCase().trim());
  const filteredList = list.filter(p => p && p.name && typeof p.name === 'string' && !excludeNames.includes(p.name.toLowerCase().trim()));

  if (!currentName) {
    return filteredList;
  }

  return filteredList.filter(p =>
    p.name.toLowerCase().includes(currentName) &&
    p.name.toLowerCase() !== currentName
  );
});

const selectPerson = (person: { id?: string, name: string }) => {
  emit('update:modelValue', person.name);
  isOpen.value = false;
};

// Close on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && (containerRef.value as any).contains && !(containerRef.value as any).contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
