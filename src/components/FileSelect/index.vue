<template>
  <div class="w-full">
    <!-- 文件上传按钮 -->
    <button
      @click="triggerFileInput"
      :disabled="!!isParsing"
      class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center text-sm"
    >
      <Loader2 v-if="isParsing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
      <Upload v-else class="w-4 h-4 mr-2" />
      {{ $t("tools.upload", { name: "Excel" }) }}
    </button>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept=".xlsx,.xls" @change="handleFileSelect" class="hidden" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Loader2, Upload } from "lucide-vue-next";
import { isString } from "lodash-es";
import * as XLSX from "xlsx";

// 定义事件
const emit = defineEmits<{
  fileParsed: [data: any[]];
  fileSelected: [file: File];
  error: [message: string];
}>();

// 响应式数据
const fileInput = ref<HTMLInputElement>();
const isParsing = ref(false);

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
</script>
