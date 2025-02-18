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
            <div v-for="annotation in annotations" :key="annotation.label.name" class="card bg-base-100 shadow-sm">
                <figure class="px-4 pt-4">
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
                        <button class="btn btn-primary"  onclick="upload_zone.showModal()">
                            <ms-edit class="w-4 h-4" />
                            Start annotating</button>
                    </div>
                </div>
            </div>
        </div>
        <dialog id="crop_modal" class="modal" ref="cropModal">
            <div class="modal-box w-[100dvw] max-w-full h-[98dvh]">
                <form method="dialog">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <Create :src="activeAnnotation.url" v-if="activeAnnotation && cocoColors && classes" :bboxes="bboxes"
                    @update:bboxes="onUpdateBboxes" :classes :class-colors="cocoColors" class="h-full w-full"
                    @save="saveToDisk" />
            </div>
        </dialog>
        <dialog id="upload_zone" class="modal">
            <div class="modal-box h-[80dvh] max-w-full">
                <form method="dialog">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <div class="h-full w-full">
                    <UploadZone class="card-body" v-if="fs && project" :library :setKind="activeSet" :fs :project @refresh="setup" />
                </div>
            </div>
        </dialog>

        <dialog id="delete_annnotation_dialog" class="modal">
            <div class="modal-box">
                <h2>Confirm deletion</h2>
                <p class="text-lg font-bold">Are you sure you want to delete this annotation ?</p>
                <img :src="activeAnnotation?.url" alt="">
                <div class="modal-action justify-end">
                    <button class="btn btn-sm btn-error" @click="onConfirmDeleteAnnotation(activeAnnotation)">
                        <ms-delete />
                        Delete
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="delete_annnotation_dialog.close()">
                        Cancel
                    </button>
                </div>
            </div>
        </dialog>
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
import type { CocoField, SetKind } from '../../types';
import Create from '../../Annotations/pages/Create.vue';
import UploadZone from '../../Annotations/UploadZone.vue';
import { addNotif, notifsQueue } from '../../Composables/useNotifs';
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
    cropModal.value?.showModal();
}

function createSetFolder(s: SetKind) {
    if (labelsDir.value && imageDir.value) {
        //  check if the given set folder exists in both labels and images
        labelsDir.value.origin.getDirectoryHandle(s, { create: true })
        imageDir.value.origin.getDirectoryHandle(s, { create: true })
        setup();
    }
}

function onUpdateBboxes(_bboxes: CocoField[]) {
    console.log("updating bboxes", _bboxes)
    // readd the bg
    _bboxes.forEach(bbox => bbox.bg = cocoColors.value![bbox.cls])
    bboxes.value = _bboxes;
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
</script>
