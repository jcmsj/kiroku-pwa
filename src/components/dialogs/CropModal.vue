<template>
    <dialog :id="id" class="modal" ref="modal">
        <div class="modal-box w-[100dvw] max-w-full h-[98dvh]">
            <div class="text-lg">
                Image: {{ activeAnnotation?.image.name }}
            </div>
            <form method="dialog">
                <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            </form>
            <Create :src="activeAnnotation.url" v-if="activeAnnotation && classColors && classes" 
                v-model:bboxes="bboxes" 
                @update-field="updateField"
                :classes="classes" 
                :class-colors="classColors" 
                @save="saveToDisk" />
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Create from '../../Annotations/pages/Create.vue';
import type { CocoField, PartialCocoField } from '../../types';
import { notifsQueue } from '../../Composables/useNotifs';

const props = defineProps<{
    id: string;
    activeAnnotation: any;
    classColors: Record<string, string>;
    classes: Record<string, string>;
}>();

const modal = ref<HTMLDialogElement>();
const bboxes= defineModel<CocoField[]>('bboxes', { required: true });
const emit = defineEmits(['close']);

function saveToDisk() {
    const text = bboxes.value.map(({ cls, x, y, width, height }) => 
        `${cls} ${x + width / 2} ${y + height / 2} ${width} ${height}`).join('\n');
    
    props.activeAnnotation?.label.origin.createWritable().then(writable => {
        writable.write(text);
        writable.close();
    }).catch(e => {
        notifsQueue.value.push({ id: "save-disk-error", type: 'error', message: e.message, timeoutMS: 5000 })
    })
    modal.value?.close();
}

function updateField(f: PartialCocoField) {
    const index = bboxes.value.findIndex(b => b.id === f.id);
    if (index === -1) {
        bboxes.value = [...bboxes.value, f];
        return;
    }
    bboxes.value = bboxes.value.map((b, i) => (i === index ? f : b));
}
</script>
