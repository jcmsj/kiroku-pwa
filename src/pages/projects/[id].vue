<template>
    <!-- {{ project }} -->
    <div class="p-2">
        <nav class="flex items-center justify-between">
            <div class="breadcrumbs">
                <ul>
                    <li>
                        <router-link to="/projects">
                            Project
                        </router-link>
                    </li>
                    <li>
                        {{ project?.projectName }}
                    </li>
                    <li>
                        <div role="tablist" class="tabs tabs-border">
                            <!-- tab for changing set kind -->
                            <button class="tab" role="tab" :aria-selected="activeSet === 'train'"
                                @click="activeSet = 'train'">Train</button>
                            <button class="tab" role="tab" :aria-selected="activeSet === 'val'"
                                @click="activeSet = 'val'">Val</button>
                            <button class="tab" role="tab" :aria-selected="activeSet === 'test'"
                                @click="activeSet = 'test'">Test</button>

                        </div>
                    </li>
                </ul>
            </div>
            <button class="btn btn-secondary" onclick="upload_zone.showModal()">
                <ms-add class="w-4" />
                Add image
            </button>
        </nav>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4" v-if="annotations?.length">
            <div v-for="annotation in annotations" 
                 :key="annotation.label.name" 
                 class="card bg-base-100 shadow-sm"
                 :class="{'ring-2 ring-primary': selectedAnnotations.has(annotation)}">
                <figure class="px-4 pt-4" @click="toggleSelection(annotation)">
                    <img :src="annotation.url" :alt="annotation.image.name"
                        class="rounded-xl max-h-48 object-contain" />
                </figure>
                <div class="card-body">
                    <h2 class="card-title text-sm">{{ annotation.image.name }}</h2>
                    <div class="card-actions justify-end">
                        <button class="btn btn-sm btn-error" @click="activeAnnotation = annotation"
                            onclick="delete_annnotation_dialog.showModal()">
                            <ms-delete />
                            Delete
                        </button>
                        <button class="btn btn-sm btn-primary" @click="loadAnnotation(annotation)">Edit</button>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="flex justify-center w-full m-auto">
            <div v-if="activeSetImagesDir == undefined || activeSetLabelsDir == undefined"
                class="card bg-base-100 shadow-">
                <div class="card-body">
                    <h2 class="card-title">
                        <!-- create folder  -->
                        <button class="btn btn-primary" @click="createSetFolder(activeSet)">
                            <ms-add class="w-4 h-4" />
                            Create {{ activeSet }} set</button>
                    </h2>
                </div>
            </div>
            <div v-else class="card bg-base-100 shadow-sm w-96 h-32 gap-2">
                <div class="card-body items-center text-center">
                    <h2 class="card-title">
                        No annotations ?
                    </h2>
                    <div class="card-actions flex justify-center w-full">
                        <button class="btn btn-primary" onclick="upload_zone.showModal()">
                            <ms-edit class="w-4 h-4" />
                            Start annotating</button>
                    </div>
                </div>
            </div>
        </div>
        
        <CropModal 
            id="crop_modal"
            :active-annotation="activeAnnotation"
            :class-colors="cocoColors"
            :classes="classes" 
            v-model:bboxes="bboxes"
            ref="cropModal"
            v-if="cocoColors && classes"
            />
            
        <UploadZoneModal 
            id="upload_zone"
            :fs="fs"
            :project="project"
            :library="library"
            :set-kind="activeSet"
            @refresh="setup" />
            
        <DeleteAnnotationDialog 
            id="delete_annnotation_dialog"
            :annotation="activeAnnotation"
            @confirm="onConfirmDeleteAnnotation"
            @cancel="() => document.querySelector('#delete_annnotation_dialog')?.close()" />
            
        <AnnotationToolbar 
            v-if="selectedAnnotations.size > 0"
            :selected-count="selectedAnnotations.size"
            @delete="deleteSelected"
            @move-to-set="moveSelectedToSet"
            @export="exportSelected" />
    </div>
</template>

<script setup lang="ts">
import { db } from '../../db';
import { useRoute } from 'vue-router';
import { from, useObservable } from '@vueuse/rxjs';
import { liveQuery } from 'dexie';
import { computed, reactive, ref, watch } from 'vue';
import { prepLibrarian, sort } from '../../fs/prepLibrarian';
import { type Dir, HandleKind, type FS, type Item, type Librarian } from '../../fs';
import { prepFS } from '../../fs/prepFS';
import { asDir, asItem } from '../../fs/web';
import { computedAsync } from '@vueuse/core';
import type { CocoField, PartialCocoField, SetKind } from '../../types';
import { addNotif, notifsQueue } from '../../Composables/useNotifs';
import AnnotationToolbar from '../../Annotations/AnnotationToolbar.vue';
import CropModal from '../../components/dialogs/CropModal.vue';
import UploadZoneModal from '../../components/dialogs/UploadZoneModal.vue';
import DeleteAnnotationDialog from '../../components/dialogs/DeleteAnnotationDialog.vue';
import * as zip from "@zip.js/zip.js";
const route = useRoute('/projects/[id]');

const project = useObservable(from(liveQuery(async () => {
    return await db.coco.get(parseInt(route.params.id))
})))
const classes = computed(() => {
    if (project.value) {
        console.log(project.value.cls)
        return Object.fromEntries(Object.entries(project.value.cls).map(([label, config]) => [config.index, config.name]) ?? {});
    }
})

const cocoColors = computed(() => {
    if (project.value) {
        return Object.fromEntries(Object.entries(project.value.cls).map(([_label, config]) => [config.index, config.color]) ?? {});
    }
})
const fs = ref<FS>();
const library = reactive(prepLibrarian(sort));
const createFS = prepFS(library);

async function setup() {
    if (project.value?.dir) {
        fs.value = await createFS(asDir(project.value.dir));
        library.sort(fs.value.root);
    }
}
watch(project, setup)
function find(library: Librarian, name: string): Dir | undefined {
    return Object.values(library.dirs).find(dir => dir.name === name)
}
const imageDir = computed(() => find(library, 'images'))
const labelsDir = computed(() => find(library, 'labels'))
const activeSet = ref<SetKind>('val');
const activeSetLabelsDir = computedAsync(() => {
    if (labelsDir.value) {
        return find1(labelsDir.value, activeSet.value, HandleKind.DIR);
    }
});
const activeSetImagesDir = computedAsync(() => {
    if (imageDir.value) {
        return find1(imageDir.value, activeSet.value, HandleKind.DIR);
    }
});
const activeAnnotation = ref<Annotation>();

async function find1<K extends HandleKind>(dir: Dir, name: string, kind: K): Promise<K extends HandleKind.DIR ? Dir : K extends HandleKind.FILE ? Item : never> {
    for await (const handle of dir.entries()) {
        if (handle.kind === kind && handle.name === name) {
            return handle as (K extends HandleKind.DIR ? Dir : K extends HandleKind.FILE ? Item : never);
        }
    }
    return undefined as any;
}

interface Annotation {
    image: Item;
    label: Item;
    url: string;
}
const mimes = ['jpg', 'png', 'jpeg']
const annotations = computedAsync(async () => {
    const entries: Annotation[] = []
    const limit = 5;
    // for each txt file in the activeSetLabelsDir, check if there is a corresponding image in the activeSetImagesDir (any image media type), return a Annotation, for the url create an object url
    if (activeSetLabelsDir.value == undefined) {
        console.log('activeSetLabelsDir is undefined')
        return entries;
    }

    if (activeSetImagesDir.value == undefined) {
        console.log('activeSetImagesDir is undefined')
        return entries;
    }


    const images: [string, FileSystemFileHandle][] = []
    for await (const [image, imageHandle] of activeSetImagesDir.value.origin!.entries()) {
        if (image.endsWith('.jpg') || image.endsWith('.png') || image.endsWith('.jpeg')) {
            images.push([image, imageHandle])
        }
    }
    // console.log("images", images)
    for await (const [label, labelHandle] of activeSetLabelsDir.value.origin!.entries() as [string, FileSystemFileHandle][]) {
        if (label.endsWith('.txt') && labelHandle.kind === 'file') {
            // console.log("label", labelHandle)
            mimeloop: for (const mime of mimes) {
                const imageName = label.replace('.txt', `.${mime}`);
                for (const [image, imageHandle] of images) {
                    // console.log("image", imageHandle, label)
                    if (image == imageName) {
                        entries.push({
                            image: asItem(imageHandle) as Item,
                            label: asItem(labelHandle) as Item,
                            url: URL.createObjectURL(await (imageHandle.getFile()))
                        })
                        break mimeloop;
                    }
                }
            }
        }

        // if (entries.length >= limit) {
        //     break;
        // }
    }

    return entries;
})

const cropModal = ref<HTMLDialogElement>();
const bboxes = ref<CocoField[]>([]);

async function loadAnnotation(a: Annotation) {
    activeAnnotation.value = a;
    // parse the label file and load the bboxes
    const label = await a.label.get();
    const text = await label.text();
    console.log(text)
    bboxes.value = text.split('\n').map(line => {
        const [cls, cx, cy, width, height] = line.split(' ').map(parseFloat);

        const x = cx - width / 2;
        const y = cy - height / 2;
        return {
            cls, x, y, width, height,
            id: window.crypto.randomUUID(),
            bg: cocoColors.value![cls]
        }
    })

    document.querySelector('#crop_modal')?.showModal();
}

function createSetFolder(s: SetKind) {
    if (labelsDir.value && imageDir.value) {
        //  check if the given set folder exists in both labels and images
        labelsDir.value.origin.getDirectoryHandle(s, { create: true })
        imageDir.value.origin.getDirectoryHandle(s, { create: true })
        setup();
    }
}

function saveToDisk() {
    //IMPORTANT: must convert back to cx, cy, width, height
    const text = bboxes.value.map(({ cls, x, y, width, height }) => `${cls} ${x + width / 2} ${y + height / 2} ${width} ${height}`).join('\n');
    activeAnnotation.value?.label.origin.createWritable().then(writable => {
        writable.write(text);
        writable.close();
    }).catch(e => {
        notifsQueue.value.push({ id: "save-disk-error", type: 'error', message: e.message, timeoutMS: 5000 })
    })
    cropModal.value?.close();
}

function updateField(f: PartialCocoField) {
  const index = bboxes.value.findIndex(b => b.id === f.id);
  if (index === -1) {
    bboxes.value = [...bboxes.value, f];
    return;
  }
  bboxes.value = bboxes.value.map((b, i) => (i === index ? f : b));
}

function onConfirmDeleteAnnotation(a: Annotation) {
    if (a.label.kind === HandleKind.FILE) {
        a.label.origin.remove();
    } else {
        console.error('label is not a file')
    }
    if (a.image.kind === HandleKind.FILE) {
        a.image.origin.remove();
    } else {
        console.error('image is not a file')
    }
    document.querySelector('#delete_annnotation_dialog')?.close();
    addNotif({
        id: 'delete-annotation-success',
        type: 'success',
        message: 'Annotation deleted successfully',
        timeoutMS: 5000
    })
    setup();
}

const selectedAnnotations = ref<Set<Annotation>>(new Set());

function toggleSelection(annotation: Annotation) {
  if (selectedAnnotations.value.has(annotation)) {
    selectedAnnotations.value.delete(annotation);
  } else {
    selectedAnnotations.value.add(annotation);
  }
}

async function deleteSelected() {
  const confirmed = window.confirm(`Delete ${selectedAnnotations.value.size} annotations?`);
  if (!confirmed) return;

  for (const annotation of selectedAnnotations.value) {
    await annotation.label.origin.remove();
    await annotation.image.origin.remove();
  }
  
  selectedAnnotations.value.clear();
  addNotif({
    id: 'delete-annotations-success',
    type: 'success',
    message: 'Annotations deleted successfully',
    timeoutMS: 5000
  });
  setup();
}

async function moveSelectedToSet(targetSet: SetKind) {
  const sourceLabelsDir = activeSetLabelsDir.value?.origin;
  const sourceImagesDir = activeSetImagesDir.value?.origin;
  const targetLabelsDir = await labelsDir.value?.origin.getDirectoryHandle(targetSet, { create: true });
  const targetImagesDir = await imageDir.value?.origin.getDirectoryHandle(targetSet, { create: true });

  if (!sourceLabelsDir || !sourceImagesDir || !targetLabelsDir || !targetImagesDir) {
    throw new Error('Directory structure is invalid');
  }

  for (const annotation of selectedAnnotations.value) {
    // Move files to new location
    const newLabel = await targetLabelsDir.getFileHandle(annotation.label.name, { create: true });
    const newImage = await targetImagesDir.getFileHandle(annotation.image.name, { create: true });
    
    const labelContent = await annotation.label.origin.getFile();
    const imageContent = await annotation.image.origin.getFile();
    
    await (await newLabel.createWritable()).write(await labelContent.arrayBuffer());
    await (await newImage.createWritable()).write(await imageContent.arrayBuffer());
    
    // Delete old files
    await annotation.label.origin.remove();
    await annotation.image.origin.remove();
  }
  
  selectedAnnotations.value.clear();
  addNotif({
    id: 'move-annotations-success',
    type: 'success',
    message: `Moved annotations to ${targetSet} set`,
    timeoutMS: 5000
  });
  setup();
}

async function exportSelected() {
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
  
  // Create folders structure
  await zipWriter.add(`${activeSet.value}/images/`, null);
  await zipWriter.add(`${activeSet.value}/labels/`, null);
  
  // Add files to zip
  for (const annotation of selectedAnnotations.value) {
    const imageFile = await annotation.image.origin.getFile();
    const labelFile = await annotation.label.origin.getFile();
    
    await zipWriter.add(
      `${activeSet.value}/images/${annotation.image.name}`,
      new zip.BlobReader(imageFile)
    );
    await zipWriter.add(
      `${activeSet.value}/labels/${annotation.label.name}`,
      new zip.BlobReader(labelFile)
    );
  }

  // Close and download
  const blob = await zipWriter.close();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${activeSet.value}-annotations.zip`;
  a.click();
  URL.revokeObjectURL(url);

  addNotif({
    id: 'export-success',
    type: 'success',
    message: `Exported ${selectedAnnotations.value.size} annotations`,
    timeoutMS: 5000
  });
}
</script>
