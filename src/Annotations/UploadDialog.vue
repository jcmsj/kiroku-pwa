<template>
    <div ref="dropZoneRef">
        Drop files here
    </div>
</template>
<script setup lang="ts">
import { useDropZone } from '@vueuse/core'
import { ref } from 'vue';
import { type Coco } from '../db';
import type { SetKind } from '../types';
import { prepLibrarian } from '../fs/prepLibrarian'
import type { FS } from '../fs'

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
        console.error('No files or project')
        return
    }

    const imageDir = props.library.findDir('images')
    const labelsDir = props.library.findDir('labels')

    if (!imageDir || !labelsDir) {
        console.error('Image or labels directory not found')
        return
    }

    // Get the set directories
    const setImagesDir = await imageDir.origin.getDirectoryHandle(props.setKind, { create: true })
    const setLabelsDir = await labelsDir.origin.getDirectoryHandle(props.setKind, { create: true })

    for (const file of files) {
        // Create the image file in the set's image directory
        const imageHandle = await setImagesDir.getFileHandle(file.name, { create: true })
        const writable = await imageHandle.createWritable()
        await writable.write(file)
        await writable.close()

        // Create empty label file with same name but .txt extension
        const labelName = file.name.replace(/\.(jpg|jpeg|png)$/i, '.txt')
        const labelHandle = await setLabelsDir.getFileHandle(labelName, { create: true })
        const labelWritable = await labelHandle.createWritable()
        await labelWritable.write('') // Empty file - will be filled when annotations are made
        await labelWritable.close()
    }

    emit('refresh')
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
    onDrop,
    // specify the types of data to be received.
    dataTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    // control multi-file drop
    multiple: true,
    // whether to prevent default behavior for unhandled events
    preventDefaultForUnhandled: false,
})
</script>
