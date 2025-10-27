<template>
  <div class="flex h-screen relative">
    <!-- 移动端汉堡按钮，仅在移动端显示且Nav关闭时展示 -->
    <button
      v-if="!showNav && isMobile"
      class="fixed top-4 left-4 z-50 bg-white border border-primary-200 text-primary rounded p-2 shadow-lg text-2xl md:hidden hover:bg-primary-100 focus:bg-primary-100"
      @click="showNav = true"
    >
      ☰
    </button>
    <!-- 侧边栏Nav -->
    <!-- <Nav :show="showNav" :is-mobile="isMobile" @close-nav="showNav = false" /> -->
    <!-- 内容区 -->
    <main class="flex-1 overflow-auto relative bg-primary-100" ref="mainRef">
      <Content :main-el="mainRef" />
    </main>
  </div>
</template>

<script lang="ts" setup name="Preview">
import { ref, watch } from "vue";
import Content from "./components/content/index.vue";
import Nav from "./components/nav/index.vue";
import { useIsMobile } from "@/hooks/useHooks";

const showNav = ref(true);
const { isMobile } = useIsMobile();
const mainRef = ref<HTMLElement | null>(null);

// 控制showNav是否跟随移动端状态变化
watch(
  isMobile,
  (val) => {
    showNav.value = !val;
  },
  { immediate: true }
);
</script>
