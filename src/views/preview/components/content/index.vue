<template>
  <div class="h-full">
    <div class="flex items-center justify-between p-4 absolute top-0 left-0 right-0 w-full z-10">
      <div class="flex items-center gap-2">
        <div class="w-36 relative">
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
            class="select-chip w-full pl-3 pr-6 py-1 bg-primary-50 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-200 rounded placeholder:text-gray-400"
          >
            <option v-for="chip in selectList" :key="chip.label" :value="chip.value">
              {{ chip.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div>
          <FileSelect @fileParsed="fileParsed" @fileSelected="fileSelected" @error="error" />
        </div>
        <LanguageSelect />
      </div>
    </div>
    <div class="h-full">
      <ChipPin v-model="chipInfo" :name="selectedChip" v-if="chipInfo" />
    </div>
    <Tools class="absolute bottom-0 right-0 p-4" :main-el="mainEl" />
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

const chipList = ref<Chip[]>([]);
const keyword = ref<string>("");
const selectedChip = ref<number | undefined>(undefined);

const chipInfo = ref<Chip | null>(null);

watch(
  () => selectedChip.value,
  (val) => {
    chipInfo.value = chipList.value.find((chip) => chip.id === val) || null;
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
    const formattedChips = formatData(data) || [];
    // chipList.value = formattedChips;

    if (formattedChips.length === 0) {
      return;
    }

    // 使用批量添加方法
    await ChipService.batchAddChips(formattedChips);

    const chips = await ChipService.getAllChips();
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
  // 1. 过滤无用数据，Name和Type同时为空的排除掉
  const filteredData = data.filter((item) => item.Name !== "" && item.Type !== "");

  // 处理数据
  if (filteredData.length === 0) return;

  // 2. 从第一项中获取到Name之前的所有keys
  const allKeys = Object.keys(filteredData[0]);
  const nameIndex = allKeys.indexOf("Name");
  const prefixKeys = allKeys.slice(0, nameIndex); // 获取Name之前的所有keys

  // 3. 生成结果数组，每个prefix key对应一个对象
  const result = prefixKeys.map((key) => ({
    name: key,
    package: key,
    pinNumber: 0,
    pins: [] as Array<{
      Name: string;
      Type: string;
      Io: string;
      Digital: string[];
      Analog: string[];
      sortValue: string; // 添加排序值字段
      selectLabel: string;
    }>
  }));

  // 4. 循环一次filteredData来填充数据
  filteredData.forEach((item) => {
    // 遍历每个prefix key
    prefixKeys.forEach((prefixKey, index) => {
      const prefixValue = item[prefixKey];

      // 如果当前行的prefix key值为有效数字，则添加到对应的pins中
      if (prefixValue && !isNaN(Number(prefixValue))) {
        // 处理Digital字段，按\r\n分割
        const digitalArray = item.Digital ? item.Digital.split("\r\n").filter((d: string) => d.trim() !== "") : [];

        // 处理Analog字段，按\r\n分割
        const analogArray = item.Analog ? item.Analog.split("\r\n").filter((a: string) => a.trim() !== "") : [];

        // 创建pin对象，包含排序值
        const pinData = {
          Name: item.Name,
          Type: item.Type,
          Io: item.Io || "",
          Digital: digitalArray,
          Analog: analogArray,
          sortValue: String(prefixValue), // 保存排序值
          selectLabel: ""
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
      return a.sortValue.localeCompare(b.sortValue);
    });
  });

  // 6. 为每个对象添加pinNumber字段
  result.forEach((item) => {
    item.pinNumber = item.pins.length;
  });

  return result;
};
// #endregion

// #region 获取芯片列表
const getChipList = async () => {
  const chips = await ChipService.getAllChips();
  chipList.value = chips;
  if (chips.length) {
    selectedChip.value = chips[0].id;
  }
};

const selectList = computed(() => {
  return chipList.value.map((item) => {
    return {
      label: item.name,
      value: item.id
    };
  });
});
// #endregion

onMounted(() => {
  getChipList();
});
</script>

<style></style>
