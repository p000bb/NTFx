<template>
  <div class="h-full">
    <div class="flex items-center justify-between p-4 absolute top-0 left-0 right-0 w-full z-10 pointer-events-none">
      <div class="flex items-center gap-2 pointer-events-auto">
        <div class="w-36 relative" v-if="chipInfo">
          <input
            v-model="keyword"
            class="w-full pl-8 pr-3 py-1 border bg-primary-50 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-200 placeholder:text-gray-400"
            type="text"
            :placeholder="$t('common.search')"
          />
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
        </div>
        <div class="w-48">
          <select
            v-if="selectList.length"
            v-model="selectedChip"
            class="select-chip w-full pl-3 pr-6 py-1.5 bg-primary-50 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-200 rounded placeholder:text-gray-400"
          >
            <option v-for="chip in selectList" :key="chip.label" :value="chip.value">
              {{ chip.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-4 pointer-events-auto">
        <div>
          <!-- <FileSelect type="button" @fileParsed="fileParsed" @fileSelected="fileSelected" @error="error" /> -->
        </div>
        <LanguageSelect />
      </div>
    </div>
    <div class="h-full relative">
      <ChipPin v-model="chipInfo" v-if="chipInfo" />
      <div class="w-full h-full flex justify-center items-center" v-else>
        <div class="w-2/5">
          <FileSelect type="dropzone" @fileParsed="fileParsed" @fileSelected="fileSelected" @error="error" />
        </div>
      </div>

      <!-- Loading 遮罩层 -->
      <div v-if="loading" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm text-gray-600">{{ $t("common.loading") }}</p>
        </div>
      </div>
    </div>
    <Tools class="absolute bottom-0 right-0 p-4" :main-el="mainEl" v-if="chipInfo" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { watchDebounced, useThrottleFn } from "@vueuse/core";
import { Search } from "lucide-vue-next";
import ChipPin from "./components/chipPin.vue";
import Tools from "./components/tools/index.vue";
import { eventBus } from "@/hooks/eventBus";
import LanguageSelect from "@/components/LanguageSelect/index.vue";
import FileSelect from "@/components/FileSelect/index.vue";
import message from "@/utils/message";
import { Chip } from "@/types/chip";
import ChipService from "@/services/chipService";
import { useRoute } from "vue-router";
import { formatChipData } from "@/utils";

const route = useRoute();
const chipList = ref<Chip[]>([]);
const keyword = ref<string>("");
const selectedChip = ref<number | undefined>(undefined);

const chipInfo = ref<Chip | null>(null);
const loading = ref<boolean>(false);
const projectId = computed(() => {
  return Number(route.params.id);
});

watch(
  () => selectedChip.value,
  async (val) => {
    if (val) {
      const chip = await ChipService.getChipById(val);
      if (chip) {
        chipInfo.value = chip;
      }
    }
  }
);

const { mainEl } = defineProps<{ mainEl: HTMLElement | null }>();

// #region 监听chipInfo
const throttledChipInfoHandler = useThrottleFn(async (val: Chip | null) => {
  if (!val?.id) return;
  try {
    await ChipService.updateChip(val.id, val);
  } catch (error) {
    console.error("保存芯片到 IndexedDB 失败:", error);
  }
}, 200);

watch(chipInfo, (val) => {
  throttledChipInfoHandler(val);
});
// #endregion

// #region 监听keyword
watchDebounced(
  keyword,
  (val) => {
    val?.length >= 2 && eventBus.emit("chip:search", val);
  },
  { debounce: 200 }
);
// #endregion

// #region 文件上传模块
const fileSelected = (file: File) => {
  console.log(file);
};

const fileParsed = async (data: any[]) => {
  try {
    // 1. 格式化数据
    const formattedChips =
      formatChipData(data)?.map((item) => ({
        ...item,
        projectId: projectId.value
      })) || [];

    if (formattedChips.length === 0) {
      return;
    }

    // 使用批量添加方法
    await ChipService.batchAddChips(formattedChips, projectId.value);

    const chips = await ChipService.getAllChips(projectId.value);
    chipList.value = chips;
    if (chips.length) {
      await getChipList();
      selectedChip.value = chips[0].id;
    }
  } catch (error) {
    console.error("文件解析或保存失败:", error);
    message.error("文件解析或保存失败，请重试");
  }
};

const error = (val: string) => {
  message.error(val);
};
// #endregion

// #region 获取芯片列表
const selectList = ref<{ label: string; value: number }[]>([]);
const getChipList = async () => {
  loading.value = true;
  const chips = await ChipService.getAllChips(projectId.value);
  chipList.value = chips;
  loading.value = false;
  if (chips.length) {
    selectedChip.value = chips[0].id;
    selectList.value = chips.map((item) => {
      return {
        label: item.name,
        value: item.id || 0
      };
    });
  }
};
// #endregion

onMounted(() => {
  getChipList();
});
</script>

<style></style>
