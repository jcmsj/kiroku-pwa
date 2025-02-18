<template>
  <div class="max-h-full max-w-full object-cover" role="presentation" @mousedown="onNewBbox" @mousemove="onMouseDrag"
    @mouseup="reset" :data-mode="mode">
    <img :src="src" class="object-contain" alt="" :draggable="false" ref="imgElem" @load="handleResize" />
    <template v-for="bbox in _bboxes" :key="bbox.id">
      <div class="absolute" :style="{
        cursor: 'var(--bbox-cursor, move)',
        top: `${bbox.y}px`,
        left: `${bbox.x}px`,
        width: `${bbox.width}px`,
        height: `${bbox.height}px`,
        '--bbox-bg': bbox.bg,
        backgroundColor: `rgba(from var(--bbox-bg) r g b / 0.3)`,
        border: bbox.id === highlightedBoxId ? 'var(--bbox-border-active)' : 'var(--bbox-border)',
      }" role="presentation" @click.stop="onFocusBbox(bbox.id)"
        @mousedown.stop="(e) => mode === EditMode.none && startMove(bbox, e.pageX, e.pageY)" @mouseup="reset">
        <ResizeHandle v-for="direction in DIRECTIONS" :key="direction" :direction :bbox
          @mousedown="(e) => mode === EditMode.none && startResize(bbox, direction, e.pageX, e.pageY)" />
      </div>
    </template>
    <NotificationArea v-model:model-value="notifsQueue" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Direction, EditMode, DIRECTIONS } from '../types'
import ResizeHandle from '../components/ResizeHandle.vue'
import type { BboxWithId, UUID } from '../types'
import { resizeBbox } from '../utils'
import NotificationArea from '../components/NotificationArea.vue'
import { notifsQueue } from '../Composables/useNotifs'

interface Props {
  src: string
  bboxes: (BboxWithId & { bg: string })[]
  enableRuleOfThirdsGuide?: boolean
  highlightedBoxId?: UUID
}

const props = withDefaults(defineProps<Props>(), {
  enableRuleOfThirdsGuide: false,
  highlightedBoxId: undefined
})

const emit = defineEmits<{
  (e: 'newCrop', bbox: BboxWithId): void
  (e: 'updateCrop', bbox: BboxWithId): void
  (e: 'focusBbox', id: UUID): void
}>()

const _bboxes = ref<((BboxWithId & { bg: string })[])>([])
const imgElem = ref<HTMLImageElement | null>(null)
const bboxCandidate = ref<BboxWithId | null>(null)
const clickStart = ref<{ x: number; y: number } | null>(null)
const mode = ref<EditMode>(EditMode.none)
const resizeDirection = ref<Direction | null>(null)

const handleResize = () => {
  if (!imgElem.value) return []

  const offset = {
    top: imgElem.value.offsetTop,
    left: imgElem.value.offsetLeft
  }
  const imgWidth = imgElem.value.width
  const imgHeight = imgElem.value.height

  _bboxes.value = props.bboxes.map((bbox) => ({
    ...bbox,
    x: (bbox.x * imgWidth) + offset.left,
    y: (bbox.y * imgHeight) + offset.top,
    width: bbox.width * imgWidth,
    height: bbox.height * imgHeight,
  }))
}
watch(() => imgElem.value, handleResize)

// onBeforeMount(handleResize)
onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(() => props.bboxes, handleResize)

const reset = (e: MouseEvent) => {
  e.stopPropagation()
  bboxCandidate.value = null
  clickStart.value = null
  mode.value = EditMode.none
  resizeDirection.value = null
}

const updateCrop = (bbox: BboxWithId) => {
  const offset = {
    top: imgElem.value?.offsetTop ?? 0,
    left: imgElem.value?.offsetLeft ?? 0
  }
  const imgWidth = imgElem.value?.width ?? 1
  const imgHeight = imgElem.value?.height ?? 1

  const newBbox = {
    ...bbox,
    x: (bbox.x - offset.left) / imgWidth,
    y: (bbox.y - offset.top) / imgHeight,
    width: bbox.width / imgWidth,
    height: bbox.height / imgHeight,
  }

  emit('updateCrop', newBbox)
  emit('focusBbox', newBbox.id)
}

const onMouseDrag = (e: MouseEvent) => {
  if (!bboxCandidate.value || !imgElem.value) return

  if (mode.value === EditMode.create) {
    const { x, y, ...rest } = bboxCandidate.value
    const width = Math.abs(e.pageX - x)
    const height = Math.abs(e.pageY - y)
    updateCrop({ ...rest, x, y, width, height })
  } else if (mode.value === EditMode.resize && clickStart.value && resizeDirection.value) {
    const deltaX = e.pageX - clickStart.value.x
    const deltaY = e.pageY - clickStart.value.y
    const newBbox = resizeBbox(
      resizeDirection.value,
      bboxCandidate.value,
      deltaX,
      deltaY
    );
    const rect = imgElem.value.getBoundingClientRect()
    const topLeft = { right: rect.right + window.scrollX, bottom: rect.bottom + window.scrollY }
    newBbox.x = Math.max(rect.left, Math.min(topLeft.right - newBbox.width, newBbox.x))
    newBbox.y = Math.max(rect.top, Math.min(topLeft.bottom - newBbox.height, newBbox.y))
    newBbox.width = Math.min(topLeft.right - newBbox.x, newBbox.width)
    newBbox.height = Math.min(topLeft.bottom - newBbox.y, newBbox.height)
    updateCrop({ ...bboxCandidate.value, ...newBbox });
  } else if (mode.value === EditMode.move && clickStart.value) {
    const deltaX = e.pageX - clickStart.value.x
    const deltaY = e.pageY - clickStart.value.y
    const rect = imgElem.value.getBoundingClientRect()
    const x = Math.max(rect.left, Math.min(rect.right + window.scrollX - bboxCandidate.value.width, bboxCandidate.value.x + deltaX))
    const y = Math.max(rect.top, Math.min(rect.bottom + window.scrollY - bboxCandidate.value.height, bboxCandidate.value.y + deltaY))
    updateCrop({
      ...bboxCandidate.value,
      x, y, width: bboxCandidate.value.width, height: bboxCandidate.value.height
    });
  }
}

const onNewBbox = (e: MouseEvent) => {
  if (e.button !== 0 || mode.value !== EditMode.none) return

  mode.value = EditMode.create
  const x = e.pageX
  const y = e.pageY

  const id = crypto.randomUUID()
    .replace(/.*-/, 'newbbox-') as UUID;

  const bbox = { x, y, width: 5, height: 5, id }
  clickStart.value = { x, y }
  bboxCandidate.value = bbox
  emit('newCrop', bbox)
  emit('focusBbox', id)
  updateCrop(bbox)
}

const startMove = (bbox: BboxWithId, x: number, y: number) => {
  mode.value = EditMode.move
  bboxCandidate.value = bbox
  clickStart.value = { x, y }
}

const startResize = (bbox: BboxWithId, direction: Direction, x: number, y: number) => {
  mode.value = EditMode.resize
  resizeDirection.value = direction
  bboxCandidate.value = bbox
  clickStart.value = { x, y }
}

const onFocusBbox = (id: UUID) => {
  emit('focusBbox', id)
}
</script>
<style></style>
