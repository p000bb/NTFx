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
        <div class="w-50">
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
      formatData(data)?.map((item) => ({
        ...item,
        projectId: projectId.value
      })) || [];

    if (formattedChips.length === 0) {
      return;
    }

    console.log(formattedChips);
    // 使用批量添加方法
    await ChipService.batchAddChips(formattedChips, projectId.value);

    const chips = await ChipService.getAllChips(projectId.value);
    chipList.value = chips;
    if (chips.length) {
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

const formatData = (data: any[]) => {
  const filteredData = data;
  // 处理数据
  if (filteredData.length === 0) return;

  // 2. 从第一项中获取到所有package_开头的keys
  const prefixKeys = Object.keys(filteredData[0]).filter((key) => key.startsWith("package_"));

  // 提取原始列名（去掉package_前缀）
  const columnNames = prefixKeys.map((key) => key.replace("package_", ""));

  // 3. 生成结果数组，每个columnName对应一个对象
  const result = columnNames.map((name) => ({
    name: name,
    package: name,
    pinNumber: 0,
    pins: [] as Array<{
      Name: string;
      Type: string;
      Io: string;
      Digital: string[];
      Analog: string[];
      Fail: string;
      selectLabel: string;
      sortValue: number; // 添加排序值字段
    }>
  }));

  // 4. 循环一次filteredData来填充数据
  filteredData.forEach((item) => {
    // 遍历每个prefix key
    prefixKeys.forEach((prefixKey, index) => {
      const packageValue = item[prefixKey];
      const columnName = columnNames[index];
      const selectKey = `select_${columnName}`;
      const selectValue = item[selectKey].replace(/\_/g, ".");

      // 处理Package列的值：去除括号内容并转换为数字
      let processedValue = null;
      if (packageValue) {
        // 去除括号及括号内容，例如 "28(1)" -> "28"
        const cleanValue = String(packageValue)
          .replace(/\([^)]*\)/g, "")
          .trim();
        // 转换为数字
        const numericValue = Number(cleanValue);
        if (!isNaN(numericValue)) {
          processedValue = numericValue;
        }
      }

      // 如果处理后的值为有效数字，则添加到对应的pins中
      if (processedValue !== null) {
        // 处理Digital字段，按\r\n分割
        const digitalArray = item.Digital
          ? item.Digital.split("\r\n").filter((d: string) => d.trim() !== "" && d.trim() !== "-" && d.trim() !== "一")
          : [];

        // 处理Analog字段，按\r\n分割
        const analogArray = item.Analog
          ? item.Analog.split("\r\n").filter((a: string) => a.trim() !== "" && a.trim() !== "-" && a.trim() !== "一")
          : [];

        // 创建pin对象，包含排序值和selectLabel
        const pinData = {
          Name: item["Pin name"],
          Type: item.Type,
          Io: item.IO || "",
          Digital: digitalArray,
          Analog: analogArray,
          sortValue: Number(processedValue), // 保存排序值
          Fail: item["Fail-safe"] || "",
          selectLabel: selectValue || "" // 添加selectLabel字段
        };

        // 添加到对应的pins数组中
        result[index].pins.push(pinData);
      }
    });
  });

  // 5. 对每个prefix key的pins按照对应的值排序
  result.forEach((item) => {
    item.pins.sort((a, b) => {
      // 尝试将排序值转换为数字进行比较
      const aNum = Number(a.sortValue);
      const bNum = Number(b.sortValue);

      // 如果两个值都是有效数字，按数字大小排序
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      // 否则按字符串排序
      return a.sortValue - b.sortValue;
    });
  });

  // 6. 为每个对象添加pinNumber字段
  result.forEach((item) => {
    item.pinNumber = new Set(item.pins.map((pin) => pin.sortValue)).size;
  });

  return result;
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
