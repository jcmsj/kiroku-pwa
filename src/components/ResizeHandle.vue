
<template>
    <button
      class="dragbox"
      :style="style"
      tabindex="-1"
      ref="elem"
      @mousedown="(e) => emit('mousedown', e)"
    ></button>
  </template>
  
<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from 'vue';
import type { Direction, BBox } from '../types';

interface Props {
  direction: Direction;
  bbox: BBox;
  width?: number;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 5,
  height: 5
});

const emit = defineEmits<{
  (e: 'mousedown', event: MouseEvent): void
}>();

const elem = ref<HTMLButtonElement | null>(null);

const position = computed(() => {
  return calcTopLeft(props.bbox, props.direction, props.width, props.height);
});

const style = computed<HTMLAttributes['style']>(() => ({
  position: 'absolute',
  background: 'var(--resize-handle-color, red)',
  cursor: `${props.direction}-resize`,
  width: props.width + 'px',
  height: props.height + 'px',
  zIndex: 1,
  top: position.value.top + 'px',
  left: position.value.left + 'px'
}));

function calcTopLeft(bbox: BBox, d: Direction, width: number, height: number) {
  let top: number;
  let left: number;
  
  if (d.includes('n')) {
    top = -height;
  } else if (d.includes('s')) {
    top = bbox.height - height / 2;
  } else {
    top = bbox.height / 2 - height / 2;
  }

  if (d.includes('e')) {
    left = bbox.width - width / 2;
  } else if (d.includes('w')) {
    left = -width;
  } else {
    left = bbox.width / 2 - width / 2;
  }

  return { top, left };
}
</script>
