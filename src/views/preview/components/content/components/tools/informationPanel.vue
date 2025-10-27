<template>
  <!-- 遮罩层 -->
  <div v-if="visible" class="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300" @click="close"></div>
  <!-- 抽屉栏 -->
  <div
    :class="[
      'fixed top-0 right-0 h-full w-[450px] bg-white shadow-lg z-50 transition-transform duration-300',
      visible ? 'translate-x-0' : 'translate-x-full'
    ]"
  >
    <div class="p-0 h-full flex flex-col">
      <!-- Tabs栏 -->
      <div class="flex items-center border-b border-gray-200 px-6 pt-6 pb-2 select-none sticky top-0 bg-white z-10">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="py-1 mr-8 text-base font-semibold transition-colors duration-150"
          :class="
            selectedTab === tab.key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'
          "
          @click="selectedTab = tab.key"
        >
          {{ tab.label }}
        </button>
        <div class="flex-1"></div>
        <button @click="close" title="关闭" class="p-1 hover:bg-gray-100 rounded">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- 内容区 -->
      <div class="flex-1 p-6 overflow-y-auto" v-if="visible">
        <StatisticsTab v-if="selectedTab === 'statistics'" key="statistics" />
        <ConflictDetailTab v-if="selectedTab === 'conflicts'" key="conflicts" />
      </div>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import StatisticsTab from "./statisticsTab.vue";
import ConflictDetailTab from "./conflictDetailTab.vue";

const { t } = useI18n();
const visible = ref(false);
const selectedTab = ref("statistics");

const tabs = computed(() => [
  { key: "statistics", label: t("tools.statistics") },
  { key: "conflicts", label: t("tools.conflictDetails") }
]);

const close = () => {
  visible.value = false;
};

const open = () => {
  visible.value = true;
};

defineExpose({ open, visible });
</script>

<style scoped></style>
