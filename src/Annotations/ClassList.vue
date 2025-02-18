<template>
    <ul class="list bg-base-100 rounded-box shadow-md">
        <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Fields</li>
        <li v-for="field in fields" :key="field.id" 
            class="list-row hover:bg-base-200 cursor-pointer"
            :class="{ 'bg-base-200': field.id === activeFieldId }"
            @click="$emit('select-field', field.id)">
            <div class="px-4 py-2">Field {{ field.id }}</div>
        </li>
    </ul>
</template>

<script setup lang="ts">
import type { PartialCocoField } from '../types';

interface Props {
    fields: PartialCocoField[]
    activeFieldId?: string
}

defineProps<Props>()
defineEmits<{
    (e: 'select-field', id: string): void
}>()
</script>
