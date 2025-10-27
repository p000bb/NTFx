<template>
  <header class="flex justify-between items-center h-14 px-6 bg-primary-100 border-b border-primary-200">
    <div>
      <span class="text-xl font-bold">{{ $t("common.title") }}</span>
    </div>
    <LanguageSelect />
  </header>
</template>

<script lang="ts" setup>
import LanguageSelect from "@/components/LanguageSelect/index.vue";
</script>
