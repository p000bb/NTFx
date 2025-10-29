<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- 总览卡片 -->
    <div class="grid grid-cols-2 gap-4">
      <!-- 总引脚数 -->
      <div
        class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-blue-100 text-sm font-medium">{{ $t("tools.totalPins") }}</span>
          <Cpu :size="20" class="opacity-80" />
        </div>
        <div class="text-3xl font-bold">{{ statistics.totalPins }}</div>
        <div class="text-xs text-blue-100 mt-1">{{ $t("tools.pins") }}</div>
      </div>

      <!-- 利用率 -->
      <div
        class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-green-100 text-sm font-medium">{{ $t("tools.utilizationRate") }}</span>
          <TrendingUp :size="20" class="opacity-80" />
        </div>
        <div class="text-3xl font-bold">{{ statistics.utilizationRate }}%</div>
        <div class="text-xs text-green-100 mt-1">{{ $t("tools.configured") }}</div>
      </div>
    </div>
    <!-- 引脚使用情况 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
        <h3 class="text-white font-semibold flex items-center gap-2">
          <Grid :size="18" />
          {{ $t("tools.pinUsage") }}
        </h3>
      </div>
      <div class="p-4 space-y-3">
        <!-- 已使用 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
            <span class="text-gray-700 font-medium">{{ $t("tools.used") }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all"
                :style="{
                  width: statistics.totalPins > 0 ? (statistics.usedPins / statistics.totalPins) * 100 + '%' : '0%'
                }"
              ></div>
            </div>
            <span class="text-gray-900 font-bold">{{ statistics.usedPins }}</span>
          </div>
        </div>

        <!-- 未使用 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-gray-400"></div>
            <span class="text-gray-700 font-medium">{{ $t("tools.unused") }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
              <div
                class="bg-gray-400 h-2 rounded-full transition-all"
                :style="{
                  width: statistics.totalPins > 0 ? (statistics.unusedPins / statistics.totalPins) * 100 + '%' : '0%'
                }"
              ></div>
            </div>
            <span class="text-gray-900 font-bold">{{ statistics.unusedPins }}</span>
          </div>
        </div>

        <!-- 冲突引脚 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <span class="text-gray-700 font-medium">{{ $t("tools.conflictPins") }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
              <div
                class="bg-red-500 h-2 rounded-full transition-all"
                :style="{
                  width: statistics.totalPins > 0 ? (statistics.conflictPins / statistics.totalPins) * 100 + '%' : '0%'
                }"
              ></div>
            </div>
            <span class="text-red-600 font-bold">{{ statistics.conflictPins }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能统计 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
      <div class="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
        <h3 class="text-white font-semibold flex items-center gap-2">
          <PieChart :size="18" />
          {{ $t("tools.commonFunctions") }}
        </h3>
      </div>
      <div class="px-4 py-2 overflow-y-auto flex-1">
        <div v-if="statistics.topFunctions.length > 0">
          <div
            v-for="(item, index) in statistics.topFunctions"
            :key="index"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <span class="text-gray-700 text-sm">{{ item.name }}</span>
            <span class="font-semibold text-gray-900">{{ item.count }}</span>
          </div>
        </div>
        <div v-else class="text-center text-gray-400 py-4">
          <span class="text-2xl block mb-2">📊</span>
          {{ $t("tools.noData") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { Cpu, TrendingUp, Grid, PieChart } from "lucide-vue-next";
import { eventBus } from "@/hooks/eventBus";
import type { PinType } from "@/types/chip";

const pins = ref<PinType[]>([]);

// 获取真实引脚数据
const getPinsData = () => {
  eventBus.emit("check:conflict", (data: PinType[]) => {
    pins.value = data;
  });
};

// 计算统计数据
const statistics = computed(() => {
  const totalPins = pins.value.length;
  const usedPins = pins.value.filter((pin) => pin.selectLabel).length;
  const unusedPins = totalPins - usedPins;
  const conflictPins = pins.value.filter((pin) => pin.conflict).length;
  const utilizationRate = totalPins > 0 ? parseFloat(((usedPins / totalPins) * 100).toFixed(1)) : 0;

  // 统计常用功能
  const functionCounts: Record<string, number> = {};
  pins.value.forEach((pin) => {
    if (pin.selectLabel) {
      // 提取功能名称（例如：USART1.TX 提取为 USART1）
      const funcName = pin.selectLabel.split(".")[0];
      if (funcName) {
        functionCounts[funcName] = (functionCounts[funcName] || 0) + 1;
      }
    }
  });

  // 排序并取前5个
  const topFunctions = Object.entries(functionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPins,
    usedPins,
    unusedPins,
    conflictPins,
    utilizationRate,
    topFunctions
  };
});

onMounted(() => {
  getPinsData();
});
</script>

<style scoped></style>
