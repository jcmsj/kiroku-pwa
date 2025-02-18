<template>
  <div class="flex flex-col gap-4">
    <div v-if="!projects?.length">
      No COCO projects yet.
    </div>
    <div v-else class="grid grid-cols-3 gap-4">
      <div v-for="project in projects" :key="project.id" class="card w-full bg-base-100 shadow-md">
        <div class="card-body">
          <h2 class="card-title">{{ project.projectName }}</h2>
          <p>Project ID: {{ project.id }}</p>
          <div class="card-actions justify-end">
              <button class="btn btn-secondary" @click="editCocoProject(project)">
                  <ms-settings />
                  Edit Project Info
              </button>
            <RouterLink :to="{
              name: '/projects/[id]',
              params: { id: project.id }
            }" class="btn btn-primary" @click="openCocoProject(project)">
              Open
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
  <CocoDialog ref="cocoDialog" :coco="selectedCoco" v-if="selectedCoco" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {RouterLink} from "vue-router"
import { db } from '../../db';
import type { Coco } from '../../db';
import CocoDialog from '../../Coco/CocoDialog.vue';
import { cocoProject } from "../../Coco/active";
import { from, useObservable } from '@vueuse/rxjs';
import { liveQuery } from 'dexie';

const projects = useObservable(from(liveQuery(async() => {
  return await db.coco.toArray()
})))
const selectedCoco = ref<Coco | null>(null);

const cocoDialog = ref();
function editCocoProject(coco: Coco) {
  selectedCoco.value = coco;
  cocoDialog.value.showModal();
}

function openCocoProject(coco: Coco) {
  cocoProject.value = coco;
}
</script>
