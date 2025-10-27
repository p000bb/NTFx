<template>
  <div class="w-full">
    <!-- 按钮形式 -->
    <div v-if="props.type === 'button'">
      <button
        @click="triggerFileInput"
        :disabled="!!isParsing"
        class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center text-sm"
      >
        <Loader2 v-if="isParsing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
        <Upload v-else class="w-4 h-4 mr-2" />
        {{ $t("tools.upload", { name: "Excel" }) }}
      </button>
    </div>

    <!-- 拖拽区域形式 -->
    <div v-else-if="props.type === 'dropzone'" class="relative">
      <div
        ref="dropzoneRef"
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="[
          'border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : isParsing
              ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        ]"
      >
        <div class="flex flex-col items-center justify-center gap-3">
          <div v-if="!isParsing" class="flex flex-col items-center gap-2">
            <Upload class="w-10 h-10 text-gray-400" />
            <div class="text-center">
              <p class="text-sm font-medium text-gray-700">
                {{ $t("tools.upload", { name: "Excel" }) }}
              </p>
              <p class="text-xs text-gray-500 mt-1">{{ $t("tools.dragFile") }}</p>
            </div>
          </div>
          <div v-else class="flex flex-col items-center gap-2">
            <Loader2 class="animate-spin w-10 h-10 text-blue-500" />
            <p class="text-sm text-gray-600">loading...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept=".xlsx,.xls" @change="handleFileSelect" class="hidden" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Loader2, Upload } from "lucide-vue-next";
import { isString } from "lodash-es";
import * as XLSX from "xlsx";

// #region Props 和 Events
const props = withDefaults(
  defineProps<{
    type?: "button" | "dropzone";
  }>(),
  {
    type: "button"
  }
);

const emit = defineEmits<{
  fileParsed: [data: any[]];
  fileSelected: [file: File];
  error: [message: string];
}>();
// #endregion

// #region 公共处理函数
// 验证文件类型
const isValidFileType = (file: File): boolean => {
  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel" // .xls
  ];
  return (
    validTypes.includes(file.type) ||
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls")
  );
};

// 读取文件为ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error("无法读取文件"));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
};

// 解析Excel文件
const parseExcelFile = async (file: File) => {
  const data = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(data, { type: "array" });

  // 获取第一个工作表
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 转换为JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // 如果有标题行，将第一行作为键
  if (jsonData.length <= 1) {
    return jsonData;
  }

  const headers = jsonData[0] as string[];
  return jsonData.slice(1).map((row: unknown) => {
    const rowArray = row as any[];
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = rowArray[index] || "";
    });
    return obj;
  });
};

// 处理文件
const processFile = async (file: File) => {
  if (!isValidFileType(file)) {
    const errorMsg = "请选择有效的Excel文件（.xlsx 或 .xls）";
    emit("error", errorMsg);
    return;
  }

  isParsing.value = true;

  try {
    // 触发文件选择事件
    emit("fileSelected", file);

    // 解析文件
    const result = await parseExcelFile(file);

    // 触发解析完成事件
    emit("fileParsed", result);
  } catch (error) {
    console.error("解析Excel文件失败:", error);
    const errorMsg = isString(error) ? error : "解析Excel文件失败，请检查文件格式是否正确";
    emit("error", errorMsg);
  } finally {
    isParsing.value = false;
  }
};
// #endregion

// #region Button 相关
const fileInput = ref<HTMLInputElement>();

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
};
// #endregion

// #region Dropzone 相关
const dropzoneRef = ref<HTMLElement>();
const isDragging = ref(false);

// 处理拖拽放下
const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
};
// #endregion

// #region 公共状态
const isParsing = ref(false);
// #endregion
</script>
