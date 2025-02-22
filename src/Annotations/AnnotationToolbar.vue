<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-base-200 shadow-lg rounded-lg px-4 py-2 flex gap-2 items-center">
    <span class="text-sm">{{ selectedCount }} selected</span>
    <div class="divider divider-horizontal"></div>
    <div class="join">
      <button class="btn btn-sm join-item" @click="$emit('moveToSet', 'train')">Move to Train</button>
      <button class="btn btn-sm join-item" @click="$emit('moveToSet', 'val')">Move to Val</button>
      <button class="btn btn-sm join-item" @click="$emit('moveToSet', 'test')">Move to Test</button>
    </div>
    <button class="btn btn-sm btn-error" @click="$emit('delete')">
      <ms-delete class="w-4 h-4" />
      Delete
    </button>
    <button class="btn btn-sm btn-info" @click="$emit('export')">
      <ms-download class="w-4 h-4" />
      Export
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SetKind } from '../types';

defineProps<{
  selectedCount: number
}>();

defineEmits<{
  delete: [],
  moveToSet: [set: SetKind],
  export: []
}>();
</script>
