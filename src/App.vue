<template>
  <div>
    <router-view />
  </div>
</template>

<script lang="ts" setup>
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const pageTitle = computed(() => t("common.title"));

useTitle(pageTitle);
</script>

<style></style>
