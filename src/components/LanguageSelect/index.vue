<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useLanguageStore } from "@/store/modules/language";

const languageStore = useLanguageStore();
const { locale } = useI18n();

function handleLanguageChange(lang: string) {
  locale.value = lang;
  languageStore.changeLanguage(lang);
}
</script>

<template>
  <select
    class="px-3 py-1 rounded border border-primary-300 bg-primary-100 text-base outline-none focus:ring-2 focus:ring-primary-200 transition"
    :value="languageStore.language"
    @change="e => handleLanguageChange((e.target as HTMLSelectElement).value)"
  >
    <option value="zh-CN">中文</option>
    <option value="en">English</option>
  </select>
</template>

<style scoped></style>
