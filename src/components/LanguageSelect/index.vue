<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useLanguageStore } from "@/store/modules/language";
import { Languages } from "lucide-vue-next";

const languageStore = useLanguageStore();
const { locale } = useI18n();
const showMenu = ref(false);

function handleLanguageChange(lang: string) {
  locale.value = lang;
  languageStore.changeLanguage(lang);
  showMenu.value = false;
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".language-select")) {
    showMenu.value = false;
  }
}

// 语言选项配置
const languageOptions = [
  { value: "zh-CN", label: "中文", flag: "🇨🇳" },
  { value: "en", label: "English", flag: "🇺🇸" }
];
</script>

<template>
  <div class="language-select relative">
    <button
      @click="toggleMenu"
      class="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
      :title="languageStore.language === 'zh-CN' ? '切换语言' : 'Switch Language'"
    >
      <Languages :size="30" class="text-gray-600" />
    </button>

    <!-- 下拉菜单 -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showMenu"
        class="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        @click.stop
      >
        <button
          v-for="option in languageOptions"
          :key="option.value"
          @click="handleLanguageChange(option.value)"
          class="w-full flex items-baseline gap-2 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
          :class="{ 'bg-blue-50 text-blue-600': languageStore.language === option.value }"
        >
          <span class="text-lg">{{ option.flag }}</span>
          <span class="text-sm font-medium">{{ option.label }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <!-- 点击外部关闭菜单 -->
  <div v-if="showMenu" class="fixed inset-0 z-40" @click="handleClickOutside"></div>
</template>

<style scoped></style>
