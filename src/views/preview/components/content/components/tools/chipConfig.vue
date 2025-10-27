<template>
  <div>
    <div class="flex-1 overflow-y-auto">
      <!-- 芯片比例 -->
      <div>
        <label class="block mb-2 text-base font-medium text-gray-700">{{ t("tools.chipScale") }}</label>
        <div class="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            v-model.number="options.chipScale"
            class="w-full accent-blue-500 h-2 rounded-lg appearance-none bg-gray-200 focus:outline-none focus:bg-blue-100 transition"
          />
          <span class="w-12 text-right font-semibold text-gray-700">{{ options.chipScale.toFixed(2) }}</span>
        </div>
      </div>
      <!-- 字体大小比例 -->
      <div>
        <label class="block mb-2 text-base font-medium text-gray-700">{{ t("tools.fontScale") }}</label>
        <div class="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            v-model.number="options.fontScale"
            class="w-full accent-blue-500 h-2 rounded-lg appearance-none bg-gray-200 focus:outline-none focus:bg-blue-100 transition"
          />
          <span class="w-12 text-right font-semibold text-gray-700">{{ options.fontScale.toFixed(2) }}</span>
        </div>
      </div>
      <!-- 芯片开始方向 美化 -->
      <div class="mb-6">
        <label class="block mb-2 text-base font-medium text-gray-700">{{ t("tools.beginSide") }}</label>
        <div class="relative w-40">
          <select
            v-model="options.beginSide"
            class="block w-full px-4 py-2 pr-10 text-base text-gray-700 bg-white border border-gray-300 shadow-sm f transition appearance-none"
            style="background-position: right 1rem center; background-repeat: no-repeat"
          >
            <option value="top">{{ t("tools.top") }}</option>
            <option value="bottom">{{ t("tools.bottom") }}</option>
            <option value="left">{{ t("tools.left") }}</option>
            <option value="right">{{ t("tools.right") }}</option>
          </select>
          <!-- 自定义下拉箭头 -->
          <svg
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
    <!-- 恢复默认 -->
    <div class="flex items-center justify-end">
      <button class="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2" @click="reset">
        <RotateCcw :size="20" class="" />{{ t("tools.reset") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from "vue";
import { useChipConfigStore } from "@/store/modules/chipConfig";
import { RotateCcw } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { setValues, getValues, resetDefault } = useChipConfigStore();

const options = ref({
  chipScale: 1,
  fontScale: 1,
  beginSide: "left"
});

const reset = () => {
  resetDefault();
  options.value = getValues();
};

onMounted(() => {
  options.value = getValues();
});

watch(
  () => options.value,
  (value) => {
    setValues(value);
  },
  { deep: true }
);
</script>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  height: 20px;
  width: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border: none;
}
input[type="range"]::-moz-range-thumb {
  height: 20px;
  width: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border: none;
}
input[type="range"]::-ms-thumb {
  height: 20px;
  width: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border: none;
}
</style>
