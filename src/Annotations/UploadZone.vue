<template>
    <!-- add a glow when isOverDropzone -->
    <div ref="dropZoneRef" class="text-xl h-full w-full border-dashed border-2 border-neutral flex items-center justify-center" :class="{ 'border-primary': isOverDropZone }" @click="open()">
        <ms-upload class="text-4xl" />
        Drop files here

        <NotificationArea :model-value="notifsQueue" />
    </div>
</template>
<script setup lang="ts">
import { useDropZone } from '@vueuse/core'
import { ref } from 'vue';
import { type Coco } from '../db';
import type { SetKind } from '../types';
import { prepLibrarian } from '../fs/prepLibrarian'
import type { FS } from '../fs'
import { addNotif, notifsQueue, updateNotif } from '../Composables/useNotifs';

const dropZoneRef = ref<HTMLDivElement>()
const props = defineProps<{
    setKind: SetKind,
    project: Coco,
    library: ReturnType<typeof prepLibrarian>,
    fs: FS
}>()

const emit = defineEmits<{
    'refresh': []
}>()
async function onDrop(files: File[] | null) {
    if (!files || !props.project) {
        addNotif({
            id: 'upload-error',
            type: 'error',
            message: 'No files or project selected',
            timeoutMS: 3000
        });
        return;
    }
    if (files.length == 0) {
        // NO OP
        return;
    }

    const imageDir = props.library.findDir('images')
    const labelsDir = props.library.findDir('labels')

    if (!imageDir || !labelsDir) {
        addNotif({
            id: 'dirs-error',
            type: 'error',
            message: 'Image or labels directory not found',
            timeoutMS: 3000
        });
        return;
    }

    const uploadId = 'upload-progress';
    addNotif({
        id: uploadId,
        type: 'info',
        message: `Starting upload of ${files.length} files...`,
        timeoutMS: 5000
    });

    try {
        // Get the set directories
        const setImagesDir = await imageDir.origin.getDirectoryHandle(props.setKind, { create: true })
        const setLabelsDir = await labelsDir.origin.getDirectoryHandle(props.setKind, { create: true })

        let processed = 0;
        for (const file of files) {
            try {
                // Create the image file in the set's image directory
                const imageHandle = await setImagesDir.getFileHandle(file.name, { create: true })
                const writable = await imageHandle.createWritable()
                await writable.write(file)
                await writable.close()

                // Create empty label file with same name but .txt extension
                const labelName = file.name.replace(/\.(jpg|jpeg|png)$/i, '.txt')
                const labelHandle = await setLabelsDir.getFileHandle(labelName, { create: true })
                const labelWritable = await labelHandle.createWritable()
                await labelWritable.write('')
                await labelWritable.close()

                processed++;
                updateNotif(uploadId, {
                    message: `Processed ${processed}/${files.length} files...`,
                    type: 'info'
                });
            } catch (err) {
                addNotif({
                    id: `file-error-${file.name}`,
                    type: 'error',
                    message: `Failed to process ${file.name}: ${err.message}`,
                    timeoutMS: 5000
                });
            }
        }

        updateNotif(uploadId, {
            message: `Successfully uploaded ${processed} files`,
            type: 'success',
            timeoutMS: 3000
        });

        emit('refresh')
    } catch (err) {
        updateNotif(uploadId, {
            message: `Upload failed: ${err.message}`,
            type: 'error',
            timeoutMS: 5000
        });
    }
}

const mimes = ['image/jpeg', 'image/png', 'image/jpg']
const acceptString = mimes.join(',')
const { isOverDropZone } = useDropZone(dropZoneRef, {
    onDrop,
    // specify the types of data to be received.
    dataTypes: mimes,
    // control multi-file drop
    multiple: true,
    // whether to prevent default behavior for unhandled events
    preventDefaultForUnhandled: false,
})

import { useFileDialog } from '@vueuse/core'
import NotificationArea from '../components/NotificationArea.vue';
const { files, open, reset, onCancel, onChange } = useFileDialog({
  accept: acceptString, // Set to accept only image files
  multiple: true,

//   directory: true, // Select directories instead of files if set true
})

onChange((files) => {
  onDrop(
    Object.entries(files).map(([_, file]) => file)
  )
})
</script>
