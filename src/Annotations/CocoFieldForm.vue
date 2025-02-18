<template>
    <div class="flex flex-col items-center gap-2">
        <div class="flex flex-row justify-between w-full items-center">
            <div>Field: {{ field.id }}</div>
        </div>
        <div class="flex w-full join">
            <label class="select">
                <span class="label">Class</span>
                <select class="select select-bordered select-sm" :value="field.cls"
                    @change="e => emit('update-class', field.id, parseInt(e.target.value))">
                    <option value="" disabled selected>Select class</option>
                    <option v-for="(className, index) in classes" :key="index" :value="index" :style="{ backgroundColor: classesColors[index] }">
                        {{ className }} ({{ index }})
                    </option>
                </select>
            </label>
            <span :style="{ backgroundColor: classesColors[field.cls] }" class="join-item w-16">
            </span>
        </div>
        <div class="flex gap-1">
            <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs">X</legend>
                <input type="number" step="0.01" :value="field.x"
                    @input="e => updateCoord(field.id, 'x', parseFloat((e.target as HTMLInputElement).value))"
                    class="input input-sm input-bordered w-full" />
            </fieldset>
            <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs">Y</legend>
                <input type="number" step="0.01" :value="field.y"
                    @input="e => updateCoord(field.id, 'y', parseFloat((e.target as HTMLInputElement).value))"
                    class="input input-sm input-bordered w-full" />
            </fieldset>
        </div>
        <div class="flex gap-1">
            <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs">Width</legend>
                <input type="number" step="0.01" :value="field.width"
                    @input="e => updateCoord(field.id, 'width', parseFloat((e.target as HTMLInputElement).value))"
                    class="input input-sm input-bordered w-full" />
            </fieldset>
            <fieldset class="fieldset">
                <legend class="fieldset-legend text-xs">Height</legend>
                <input type="number" step="0.01" :value="field.height"
                    @input="e => updateCoord(field.id, 'height', parseFloat((e.target as HTMLInputElement).value))"
                    class="input input-sm input-bordered w-full" />
            </fieldset>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PartialCocoField } from '../types';
import type { BBox } from '../types';

interface Props {
    field: PartialCocoField
    classes: Record<number, string>
    classesColors: Record<number, string>
}

defineProps<Props>()
const emit = defineEmits<{
    (e: 'update-class', fieldId: string, classIndex:number): void
    (e: 'update-coord', fieldId: string, field: keyof BBox, value: number): void
}>()


function updateCoord(fieldId: string, field: keyof BBox, value: number) {
    emit('update-coord', fieldId, field, value)
}
</script>
