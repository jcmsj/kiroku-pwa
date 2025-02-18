<template>
  <DefaultLayout @open-coco-dialog="cocoDialog?.showModal()">
    <router-view />
    <CocoDialog ref="cocoDialog" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import DefaultLayout from "./layout/default.vue";
import CocoDialog from "./Coco/CocoDialog.vue";

const cocoDialog = ref<InstanceType<typeof CocoDialog>>();
</script>

<style>
:root {
  --resize-handle-color: var(--color-primary);
  --bbox-border: 2px solid var(--color-base-200);
  --bbox-border-active: 2px solid var(--color-accent);
}
</style>
