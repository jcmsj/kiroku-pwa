<template>
  <dialog id="coco_modal" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box">
      <h3 class="text-lg font-bold mb-4">{{ isEditMode ? 'Edit COCO Project' : 'Configure COCO Project' }}</h3>
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <label class="label">
            <span class="label-text">Project Name</span>
            <input v-model="form.projectName" type="text" placeholder="My COCO Project" class="input input-bordered" required />
          </label>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Project Directory</span>
          </label>
          <div class="flex gap-2">
            <input type="text" :value="selectedDir?.name ?? (isEditMode ? coco?.dir.name : '')" class="input input-bordered flex-1" readonly />
            <button type="button" @click="pickDirectory" class="btn">Pick Directory</button>
          </div>
        </div>

        <!-- Class Configuration -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Classes</span>
          </label>
          <div class="flex flex-col gap-2">
            <div v-for="(cls, arrayIndex) in form.classes" :key="arrayIndex" class="flex gap-2 items-center">
              <input v-model="cls.name" type="text" placeholder="Class Name" class="input input-bordered flex-1" required />
              <input v-model="cls.color" type="color" class="w-16 h-10" />
              <input v-model.number="cls.index" type="number" min="0" placeholder="Index" class="input input-bordered w-24" required />
              <button type="button" @click="removeClass(arrayIndex)" class="btn btn-error btn-sm">Remove</button>
            </div>
            <button type="button" @click="addClass" class="btn btn-success btn-sm">Add Class</button>
          </div>
        </div>

        <div class="modal-action">
          <button type="submit" class="btn btn-primary" :disabled="!selectedDir && !isEditMode">Save</button>
          <button type="button" class="btn" @click="closeModal">Cancel</button>
        </div>
      </form>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { db } from '../db'
import { verifyPermission } from '../fs/web'
import type { Coco } from '../db'
import YAML from 'yaml'
const props = defineProps<{
  coco?: Coco
}>()

const emit = defineEmits(['update:coco'])

const isEditMode = computed(() => !!props.coco)

const form = ref({
  projectName: '',
  classes: [] as { name: string; color: string; index: number }[],
})
const selectedDir = ref<FileSystemDirectoryHandle>()

watch(() => props.coco, (newCoco) => {
  if (newCoco) {
    form.value.projectName = newCoco.projectName
    selectedDir.value = newCoco.dir
    form.value.classes = Object.values(newCoco.cls).map(c => ({
      name: c.name,
      color: c.color,
      index: c.index
    }))
  } else {
    form.value.projectName = ''
    form.value.classes = []
    selectedDir.value = undefined
  }
}, { immediate: true })

async function pickDirectory() {
  try {
    const dirHandle = await window.showDirectoryPicker()
    if (await verifyPermission(dirHandle, 'readwrite')) {
      selectedDir.value = dirHandle
    }
  } catch (e) {
    console.error('Failed to pick directory:', e)
  }
}

function addClass() {
  const maxIndex = Math.max(-1, ...form.value.classes.map(c => c.index))
  form.value.classes.push({ name: '', color: '#000000', index: maxIndex + 1 })
}

function removeClass(index: number) {
  form.value.classes.splice(index, 1)
}

async function handleSubmit() {
  if (!selectedDir.value && !isEditMode.value) return

  // Convert the classes array back to an object for storage
  const cls: Coco['cls'] = form.value.classes.reduce((acc, curr) => {
    acc[curr.index] = { name: curr.name, color: curr.color, index: curr.index };
    return acc;
  }, {} as Coco['cls']);

  if (isEditMode.value && props.coco) {
    // Update existing project
    await db.coco.update(props.coco.id!, {
      projectName: form.value.projectName,
      cls: cls,
      ...(selectedDir.value && selectedDir.value !== props.coco.dir && {
        dir: selectedDir.value
      })
    });
    emit('update:coco')
  } else {
    // Create new project
    await db.coco.add({
      projectName: form.value.projectName,
      dir: selectedDir.value!,
      cls: cls,
    })
  }
  
  closeModal()
}

function closeModal() {
  const modal = document.getElementById('coco_modal') as HTMLDialogElement
  modal.close()
}

defineExpose({
  showModal: () => {
    const modal = document.getElementById('coco_modal') as HTMLDialogElement
    modal.showModal()
  }
})

watch(selectedDir, async(newDir) => {
  if (newDir) {
    // set the classes from coco.yaml if it exists
    const cocoYaml = await newDir.getFileHandle('coco.yaml', { create: false })
    form.value.classes = await classesFromYaml(cocoYaml)
  }
})

function randomRGBHex() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
}

async function classesFromYaml(yaml:FileSystemFileHandle) {
  const contents = await yaml.getFile().then(f => f.text())
  const yamlObj = YAML.parse(contents)
  console.log(yamlObj)
  if (yamlObj && yamlObj.names) {
    // dont use map's 2nd argument as index, follow the indices from the yaml file
    return Object.entries(yamlObj.names).map(([index, name]) => {
      console.log(name, index)
      return ({
        name,
        color: randomRGBHex(),
        index
      })
    })
  }
  return []
}
</script>
