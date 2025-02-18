<template>
  <div>
    <div class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <router-link class="btn btn-ghost text-xl" to="/">Kiroku</router-link>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
          <li>
            <button class="btn btn-primary" @click="$emit('open-coco-dialog')">New Project</button>
          </li>
        </ul>
      </div>
    </div>
    <slot></slot>
  <NotificationArea v-model:model-value="notifsQueue" />
  </div>
</template>
<script setup lang="ts">
import NotificationArea from '../components/NotificationArea.vue';
import { notifsQueue } from '../Composables/useNotifs';
defineEmits(['open-coco-dialog'])
</script>
