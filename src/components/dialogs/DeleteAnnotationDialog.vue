<template>
    <dialog :id="id" class="modal">
        <div class="modal-box">
            <h2>Confirm deletion</h2>
            <p class="text-lg font-bold">Are you sure you want to delete this annotation ?</p>
            <img :src="annotation?.url" alt="">
            <div class="modal-action justify-end">
                <button class="btn btn-sm btn-error" @click="$emit('confirm', annotation)">
                    <ms-delete />
                    Delete
                </button>
                <button class="btn btn-sm btn-primary" @click="$emit('cancel')">
                    Cancel
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
defineProps<{
    id: string;
    annotation: any;
}>();

defineEmits(['confirm', 'cancel']);
</script>
