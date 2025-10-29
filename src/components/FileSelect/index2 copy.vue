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

  // 转换为二维数组
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 3) {
    return jsonData;
  }

  const firstRow = jsonData[0] as any[]; // 第1行：主标题
  const thirdRow = jsonData[2] as any[]; // 第3行：子标题/列名

  // 找到Package列的起始和结束位置
  let packageStartIndex = -1;
  let packageEndIndex = -1;
  let alternateFunctionsStartIndex = -1;
  let alternateFunctionsEndIndex = -1;

  // 遍历第1行找到Package和Alternate functions的位置
  for (let i = 0; i < firstRow.length; i++) {
    const cellValue = firstRow[i];
    if (cellValue && typeof cellValue === "string") {
      if (cellValue.toLowerCase().includes("package")) {
        packageStartIndex = i;
      } else if (cellValue.toLowerCase().includes("alternate functions")) {
        alternateFunctionsStartIndex = i;
      }
    }
  }

  // 动态计算Package列的范围
  if (packageStartIndex !== -1) {
    // 从Package开始位置往后找，直到遇到下一个非空标题
    for (let i = packageStartIndex + 1; i < firstRow.length; i++) {
      const cellValue = firstRow[i];
      if (cellValue && typeof cellValue === "string" && cellValue.trim() !== "") {
        // 遇到下一个非空标题，Package结束
        packageEndIndex = i - 1;
        break;
      }
    }
    // 如果没找到结束位置，说明Package到表格末尾
    if (packageEndIndex === -1) {
      packageEndIndex = firstRow.length - 1;
    }
  }

  // 动态计算Alternate functions列的范围
  if (alternateFunctionsStartIndex !== -1) {
    // 从Alternate functions开始位置往后找，直到遇到下一个非空标题
    for (let i = alternateFunctionsStartIndex + 1; i < firstRow.length; i++) {
      const cellValue = firstRow[i];
      if (cellValue && typeof cellValue === "string" && cellValue.trim() !== "") {
        // 遇到下一个非空标题，Alternate functions结束
        alternateFunctionsEndIndex = i - 1;
        break;
      }
    }
    // 如果没找到结束位置，说明Alternate functions到表格末尾
    if (alternateFunctionsEndIndex === -1) {
      alternateFunctionsEndIndex = firstRow.length - 1;
    }
  }

  // 构建列名映射
  const columnKeys: { [key: string]: number } = {};

  // 处理Package列（使用第3行的值作为key）
  if (packageStartIndex !== -1 && packageEndIndex !== -1) {
    for (let i = packageStartIndex; i <= packageEndIndex; i++) {
      const key = thirdRow[i];
      if (key && typeof key === "string" && key.trim()) {
        const cleanKey = key.trim().replace(/\([^)]*\)/g, "");
        columnKeys[cleanKey] = i;
      }
    }
  }

  // 处理Alternate functions列（使用第3行的值作为key）
  if (alternateFunctionsStartIndex !== -1 && alternateFunctionsEndIndex !== -1) {
    for (let i = alternateFunctionsStartIndex; i <= alternateFunctionsEndIndex; i++) {
      const key = thirdRow[i];
      if (key && typeof key === "string" && key.trim()) {
        const cleanKey = key.trim().replace(/\([^)]*\)/g, "");
        columnKeys[cleanKey] = i;
      }
    }
  }

  // 处理其他列（使用第1行的值作为key）
  for (let i = 0; i < firstRow.length; i++) {
    const cellValue = firstRow[i];
    if (cellValue && typeof cellValue === "string") {
      const trimmedValue = cellValue.trim();
      // 跳过Package和Alternate functions，因为已经处理过了
      if (
        !trimmedValue.toLowerCase().includes("package") &&
        !trimmedValue.toLowerCase().includes("alternate functions")
      ) {
        const cleanKey = trimmedValue.replace(/\([^)]*\)/g, "");
        columnKeys[cleanKey] = i;
      }
    }
  }

  // 从第4行开始解析数据（索引为3）
  const result: any[] = [];
  for (let rowIndex = 3; rowIndex < jsonData.length; rowIndex++) {
    const row = jsonData[rowIndex] as any[];
    if (!row || row.length === 0) continue;

    const obj: any = {};

    // 根据列名映射构建对象
    Object.keys(columnKeys).forEach((key) => {
      const columnIndex = columnKeys[key];
      const value = row[columnIndex];

      // 处理多行文本（如功能列表）
      if (value && typeof value === "string" && value.includes("\n")) {
        obj[key] = value
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      } else {
        obj[key] = value || "";
      }
    });

    result.push(obj);
  }

  return result;
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
