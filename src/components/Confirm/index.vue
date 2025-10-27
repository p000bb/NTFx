<template>
  <div v-if="visible" class="confirm fixed inset-0 z-[1001] flex items-center justify-center bg-black/20">
    <div class="bg-white min-w-[320px] max-w-[80vw] rounded-lg shadow-xl overflow-hidden py-5 px-7">
      <div class="font-bold text-lg mb-3">
        <slot name="title">
          <span>{{ title }}</span>
        </slot>
      </div>
      <div class="mb-7 text-gray-800 break-words">
        <slot>
          <div v-html="content"></div>
        </slot>
      </div>
      <div class="flex justify-end gap-4">
        <button
          class="px-4 py-1.5 rounded bg-gray-100 text-gray-700 text-base hover:bg-gray-200 transition"
          @click="$emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button
          class="px-4 py-1.5 rounded bg-blue-600 text-white text-base hover:bg-blue-700 transition"
          @click="$emit('ok')"
        >
          {{ okText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
const props = defineProps({
  visible: Boolean,
  title: {
    type: String,
    default: "确认操作"
  },
  content: {
    type: String,
    default: ""
  },
  okText: {
    type: String,
    default: "确认"
  },
  cancelText: {
    type: String,
    default: "取消"
  }
});
const emit = defineEmits(["ok", "cancel"]);
</script>
