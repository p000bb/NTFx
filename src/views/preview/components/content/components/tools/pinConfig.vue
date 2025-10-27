<template>
  <div>
    <div class="flex items-center mb-6">
      <input
        type="checkbox"
        id="showConflictAlert"
        v-model="options.showConflictAlert"
        class="accent-black w-5 h-5 cursor-pointer"
      />
      <label for="showConflictAlert" class="ml-3 text-lg font-medium select-none cursor-pointer">{{
        $t("tools.pinConflictAlert")
      }}</label>
    </div>
    <!-- 配置项 -->
    <div class="space-y-6 pb-4 flex-1 overflow-y-auto">
      <div class="flex items-center justify-between" v-for="item in colorList" :key="item.key">
        <span class="text-base font-medium">{{ item.label }}</span>
        <div class="flex items-center">
          <input
            type="color"
            v-model="options[item.key as keyof typeof options]"
            class="w-12 h-12 rounded-lg shadow border border-gray-300 p-0 cursor-pointer bg-white"
          />
          <span
            class="ml-4 w-28 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-base font-semibold text-gray-500"
            >{{ (options[item.key as keyof typeof options] as string).toUpperCase() }}</span
          >
        </div>
      </div>
    </div>
    <!-- 恢复默认 -->
    <div class="flex items-center justify-end">
      <button class="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2" @click="reset">
        <RotateCcw :size="20" class="" />{{ $t("tools.reset") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { usePinConfigStore } from "@/store/modules/pinConfig";
import { RotateCcw } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { setValues, getValues, resetDefault } = usePinConfigStore();

const options = ref({
  showConflictAlert: true,
  activeColor: "",
  conflictColor: "",
  hoverColor: "",
  disabledColor: "",
  highlightColor: "",
  textColor: ""
});

const reset = () => {
  resetDefault();
  options.value = getValues();
};

const colorList = computed(() => [
  { label: t("tools.pinActiveColor"), key: "activeColor" },
  { label: t("tools.pinConflictColor"), key: "conflictColor" },
  { label: t("tools.pinHoverColor"), key: "hoverColor" },
  { label: t("tools.pinDisabledColor"), key: "disabledColor" },
  { label: t("tools.pinHighlightColor"), key: "highlightColor" },
  { label: t("tools.pinTextColor"), key: "textColor" }
]);

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

<style></style>
