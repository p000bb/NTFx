<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <div v-if="show" class="fixed inset-0 bg-black/30 z-50 transition-opacity duration-300" @click="emitClose"></div>

    <!-- 弹窗 -->
    <div
      v-if="show"
      :class="[
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white rounded-lg shadow-xl z-50 transition-all duration-300',
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      ]"
    >
      <div class="flex items-center justify-between px-6 pt-6">
        <h2 class="text-xl font-semibold text-gray-800">{{ title }}</h2>
        <button @click="emitClose" class="p-1 hover:bg-gray-100 rounded transition-colors">
          <X :size="20" class="text-gray-500" />
        </button>
      </div>
      <slot />
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useVModel, onClickOutside, useEventListener } from "@vueuse/core";
import { X } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true },
  title: { type: String, default: "" }
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
