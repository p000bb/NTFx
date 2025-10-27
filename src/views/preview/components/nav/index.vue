<template>
  <div
    class="h-full z-40 transition-transform duration-300 border-r border-gray-200 bg-primary-100"
    :class="[
      isMobile
        ? ['fixed top-0 left-0 w-[350px] shadow-2xl', show ? 'translate-x-0' : '-translate-x-full', 'md:hidden']
        : ['relative min-w-[350px] max-w-[350px] w-[350px]', 'hidden md:block']
    ]"
    v-show="show || !isMobile"
  >
    <!-- 关闭按钮（移动端） -->
    <button
      v-if="isMobile"
      class="absolute top-4 right-4 text-2xl bg-white rounded-full border border-primary-100 w-10 h-10 flex items-center justify-center shadow-md z-50 text-primary hover:bg-primary-100 focus:bg-primary-100"
      @click="$emit('close-nav')"
      aria-label="关闭菜单"
    >
      ×
    </button>
    <div class="flex flex-col h-full">
      <Header />
      <div class="grid grid-cols-2 h-full divide-x flex-1">
        <Input />
        <Output />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Output from "./output.vue";
import Input from "./input.vue";
import Header from "./header.vue";
import { useIsMobile } from "@/hooks/useHooks";
const props = defineProps({
  show: Boolean
});
const { isMobile } = useIsMobile();
</script>

<style scoped></style>
