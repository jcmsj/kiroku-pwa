<template>
    <dialog :id="id" class="modal">
        <div class="modal-box h-[80dvh] max-w-full">
            <form method="dialog">
                <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            </form>
            <div class="h-full w-full">
                <UploadZone class="card-body" v-if="fs && project" 
                    :library="library"
                    :setKind="setKind" 
                    :fs="fs" 
                    :project="project"
                    @refresh="$emit('refresh')" />
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import UploadZone from '../../Annotations/UploadZone.vue';
import type { SetKind } from '../../types';

defineProps<{
    id: string;
    fs: any;
    project: any;
    library: any;
    setKind: SetKind;
}>();

defineEmits(['refresh']);
</script>
