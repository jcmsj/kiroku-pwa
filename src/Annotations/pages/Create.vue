<template>
  <div class="flex flex-row gap-4" @keydown="e => e.key === 'Delete' && activeField && deleteField(activeField.id)" tabindex="0">
    <div class="flex-1 flex justify-center">
      <CropComp :src :bboxes @new-crop="addField" @update-crop="emit('updateField', $event)"
        @focus-bbox="setActiveField" :highlighted-box-id="activeFieldId" />
      <NotificationArea v-model:model-value="notifsQueue" />
    </div>
    <div class="w-80 flex flex-col gap-1 justify-around h-full">
      <div class="join">
        <button class="join-item btn btn-secondary" @click="detectFields(src)"
          :disabled="detectStatus === 'processing'">
          <!-- ion:sparkles-outline -->
          <svg class="h-6" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"
              d="M259.92 262.91L216.4 149.77a9 9 0 0 0-16.8 0l-43.52 113.14a9 9 0 0 1-5.17 5.17L37.77 311.6a9 9 0 0 0 0 16.8l113.14 43.52a9 9 0 0 1 5.17 5.17l43.52 113.14a9 9 0 0 0 16.8 0l43.52-113.14a9 9 0 0 1 5.17-5.17l113.14-43.52a9 9 0 0 0 0-16.8l-113.14-43.52a9 9 0 0 1-5.17-5.17M108 68L88 16L68 68L16 88l52 20l20 52l20-52l52-20zm318.67 49.33L400 48l-26.67 69.33L304 144l69.33 26.67L400 240l26.67-69.33L496 144z" />
          </svg>
          Detect fields
        </button>
        <button class="join-item  btn btn-primary" @click="emit('save')">
          <ms-save />
          Save</button>
      </div>
      <CocoFieldForm v-if="activeField" :field="activeField" :classes="classes" @update-class="updateFieldClass"
        @update-coord="updateFieldCoord" @delete="deleteField" :classes-colors="classColors" />
      <template v-else>
        <div class="flex flex-col gap-2 w-full">
          Select a field to edit
        </div>
      </template>
      <ClassList :fields="bboxes" class="flex-1 overflow-y-scroll max-h-[50dvh]" :active-field-id="activeFieldId" 
        @select-field="setActiveField" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import CropComp from "../CropComp.vue";
import ClassList from "../ClassList.vue";
import CocoFieldForm from "../CocoFieldForm.vue";
import type { BboxWithId, CocoField, PartialCocoField } from "../../types";
import TemplateWorker from '../../Vision/template.worker?worker';
import { notifsQueue, updateNotif } from "../../Composables/useNotifs";
import NotificationArea from '../../components/NotificationArea.vue'
const props = defineProps<{
  src: string;
  classes: Record<number, string>;
  classColors: Record<number, string>;
}>()
const bboxes = defineModel<PartialCocoField[]>('bboxes', { required: true })
const emit = defineEmits<{
  save: [],
  updateField: [PartialCocoField],
}>()
const activeFieldId = ref<string>();
const activeField = computed(() => {
    return bboxes.value.find(f => f.id === activeFieldId.value);
});

function setActiveField(id: string) {
  activeFieldId.value = id;
}

function addField(b: BboxWithId) {
  bboxes.value = [...bboxes.value, { ...b }];
}

function updateFieldClass(id: string, cls: number) {  
  const it = bboxes.value.find(f => f.id === id);
  emit('updateField', { ...it, cls, bg:props.classColors[cls] });
}

function updateFieldCoord(id: string, field: string, value: number) {
  const it = bboxes.value.find(f => f.id === id);
  emit('updateField', { ...it, [field]: value });
}

function deleteField(id: string) {
  bboxes.value = bboxes.value.filter(f => f.id !== id);
  activeFieldId.value = undefined;
}

const detectStatus = ref<'idle' | 'processing' | 'error'>('idle');

function detectFields(src: string) {
  const worker = new TemplateWorker()
  const notifId = 'generate-template';
  detectStatus.value = 'processing';
  // Add initial notification
  notifsQueue.value.push({
    id: notifId,
    message: 'Starting field detection...',
    type: 'info',
    timeoutMS: 30000 // Increased timeout for longer operation
  });

  worker.onmessage = (e) => {
    switch (e.data.type) {
      case 'SUCCESS':
        bboxes.value = (e.data.payload as CocoField[]).map(f => ({
          ...f,
          bg: props.classColors[f.cls]
        }));
        // Update final success message
        updateNotif(notifId, { message: 'Field detection completed', 'type': 'success', timeoutMS: 5000 });
        detectStatus.value = 'idle';
        break;
      case 'PROGRESS':
        const { stage, progress } = e.data.payload;
        // Update progress message
        updateNotif(notifId, { message: `${stage} - ${progress}%` });
        break;
      case 'ERROR':
        console.error(e);
        updateNotif(notifId, { message: `Error: ${e.data.payload}`, type: 'error' });
        break;
    }
  }

  worker.postMessage({
    type: 'GENERATE_TEMPLATE',
    payload: {
      imgUrl: src,
      yoloPath: import.meta.env.VITE_YOLO_MODEL_URL,
      wasmPath: import.meta.env.VITE_WASM_PATH
    }
  });
}

</script>

<style>
:root {
  --resize-handle-color: var(--color-primary);
  --bbox-border: 2px solid var(--color-base-200);
  --bbox-border-active: 2px solid var(--color-accent);
}
</style>
