<template>
  <div class="toast toast-bottom toast-end z-99">
    <div class="alert" v-for="notif of notifs" :class="alertClass(notif.type)" :key="notif.id">
      <div class="flex-1">
        <span>
          {{ notif.message }}
        </span>
      </div>
      <div>
        <button @click="dismissNotif(notif)" class="btn text-lg btn-circle btn-ghost">
          <ms-close  class=""></ms-close>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { dismissNotif, type AppNotif } from '../Composables/useNotifs';
const notifs = defineModel<AppNotif[]>({ required: true })

function alertClass(type: AppNotif['type']) {
  return {
    'alert-success': type === 'success',
    'alert-error': type === 'error',
    'alert-warning': type === 'warning',
    'alert-info': type === 'info',
  }
}
</script>
