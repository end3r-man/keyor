<template>
  <component :is="icon" :size="size" :stroke-width="strokeWidth" />
</template>

<script setup>
import { computed } from 'vue';
import { resolveIcon } from '../utils/icons';

const props = defineProps({
  name: { type: String, default: '' },
  fallback: { type: String, default: 'Circle' },
  size: { type: [Number, String], default: 14 },
  strokeWidth: { type: [Number, String], default: 2 },
});

const icon = computed(() => resolveIcon(props.name, props.fallback));
</script>
