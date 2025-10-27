<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
      <div ref="modalRef" class="bg-white rounded-lg p-6 shadow-lg max-w-2xl w-full text-center relative">
        <button
          v-if="showClose"
          class="absolute right-3 top-3 text-2xl text-gray-500 hover:text-primary"
          @click="emitClose"
          aria-label="Close"
        >
          ×
        </button>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useVModel, onClickOutside, useEventListener } from "@vueuse/core";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true }
});
const emit = defineEmits(["update:modelValue", "close"]);
const modalRef = ref();

const show = useVModel(props, "modelValue", emit);
function emitClose() {
  show.value = false;
  emit("close");
}
onClickOutside(modalRef, emitClose);

useEventListener(window, "keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") emitClose();
});
</script>
