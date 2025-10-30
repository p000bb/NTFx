<template>
  <div class="w-full">
    <!-- 按钮形式 -->
    <div v-if="props.type === 'button'">
      <button
        type="button"
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
import { useI18n } from "vue-i18n";

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

// 校验Excel表头格式
const validateExcelHeaders = (firstHeader: any[], secondHeader: any[]) => {
  const requiredFirstHeaders = [
    "Package",
    "Pin name",
    "Type",
    "IO",
    "Fail-safe",
    "Alternate functions",
    "Function selection"
  ];

  // 检查第一行表头
  const foundFirstHeaders = firstHeader.filter((header) => header && typeof header === "string");
  const missingFirstHeaders = requiredFirstHeaders.filter((required) => !foundFirstHeaders.includes(required));

  if (missingFirstHeaders.length > 0) {
    throw new Error(`Excel表头格式不正确，缺少以下必需列：${missingFirstHeaders.join(", ")}`);
  }

  // 检查第二行表头（只检查Alternate functions的子列）
  const alternateFunctionsStart = firstHeader.findIndex((header) => header === "Alternate functions");
  if (alternateFunctionsStart !== -1) {
    const alternateFunctionsSubColumns = secondHeader.slice(alternateFunctionsStart, alternateFunctionsStart + 2);
    if (!alternateFunctionsSubColumns.includes("Digital") || !alternateFunctionsSubColumns.includes("Analog")) {
      throw new Error("Excel表头格式不正确，Alternate functions列下缺少Digital或Analog子列");
    }
  }

  // 检查Package列和Function selection列的子列是否一致
  const packageStart = firstHeader.findIndex((header) => header === "Package");
  const functionSelectionStart = firstHeader.findIndex((header) => header === "Function selection");

  if (packageStart !== -1 && functionSelectionStart !== -1) {
    // 获取Package列下所有非空子列
    const packageSubColumns: string[] = [];
    for (let i = packageStart; i < firstHeader.length; i++) {
      if (firstHeader[i] && firstHeader[i] !== "Package") {
        break;
      }
      if (secondHeader[i] && typeof secondHeader[i] === "string" && secondHeader[i] !== "") {
        packageSubColumns.push(secondHeader[i]);
      }
    }

    // 获取Function selection列下所有非空子列
    const functionSelectionSubColumns: string[] = [];
    for (let i = functionSelectionStart; i < firstHeader.length; i++) {
      if (firstHeader[i] && firstHeader[i] !== "Function selection") {
        break;
      }
      if (secondHeader[i] && typeof secondHeader[i] === "string" && secondHeader[i] !== "") {
        functionSelectionSubColumns.push(secondHeader[i]);
      }
    }

    // 检查两列的子列数量是否相同
    if (packageSubColumns.length !== functionSelectionSubColumns.length) {
      throw new Error(
        `Excel表头格式不正确，Package列下有${packageSubColumns.length}个子列，而Function selection列下有${functionSelectionSubColumns.length}个子列，数量不一致`
      );
    }

    // 检查两列的子列名称是否一致
    const columnsMatch = packageSubColumns.every((col, index) => col === functionSelectionSubColumns[index]);
    if (!columnsMatch) {
      throw new Error(
        `Excel表头格式不正确，Package列和Function selection列的子列名称不一致。Package列：[${packageSubColumns.join(", ")}]，Function selection列：[${functionSelectionSubColumns.join(", ")}]`
      );
    }
  }
};

// 解析Excel文件
const parseExcelFile = async (file: File) => {
  const data = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(data, { type: "array" });

  // 获取第一个工作表
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 转换为JSON，保留所有行，包括空列
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "", // 空单元格用空字符串填充
    raw: false // 不保留原始值
  });

  // 检查数据行数
  if (jsonData.length < 3) {
    throw new Error("Excel文件至少需要3行数据（2行表头 + 1行数据）");
  }

  // 获取两行表头
  const firstHeaderRow = jsonData[0] as any[];
  const secondHeaderRow = jsonData[1] as any[];

  // 校验表头格式
  validateExcelHeaders(firstHeaderRow, secondHeaderRow);

  // 构建列索引映射
  const columnMapping = buildColumnMapping(firstHeaderRow, secondHeaderRow);

  // 处理数据行（从第3行开始）
  const dataRows = jsonData.slice(2);
  return dataRows.map((row: unknown, rowIndex: number) => {
    return parseDataRow(row as any[], columnMapping, rowIndex);
  });
};

// 构建列映射关系
const buildColumnMapping = (firstHeader: any[], secondHeader: any[]) => {
  const mapping: any = {};

  // 遍历所有列，构建映射关系
  for (let i = 0; i < firstHeader.length; i++) {
    const firstCol = firstHeader[i];
    const secondCol = secondHeader[i];

    if (!firstCol && !secondCol) continue;

    // 处理Package列（任意子列名称）
    if (firstCol === "Package" && secondCol && typeof secondCol === "string") {
      const key = `package_${secondCol}`;
      mapping[key] = i;
    }
    // 处理Package列的合并单元格部分
    else if (
      (firstCol === undefined || firstCol === null || firstCol === "") &&
      secondCol &&
      typeof secondCol === "string" &&
      isColumnInPackageRange(firstHeader, i)
    ) {
      const key = `package_${secondCol}`;
      mapping[key] = i;
    }
    // 处理Function selection列（任意子列名称）
    else if (firstCol === "Function selection" && secondCol && typeof secondCol === "string") {
      const key = `select_${secondCol}`;
      mapping[key] = i;
    }
    // 处理Function selection列的合并单元格部分
    else if (
      (firstCol === undefined || firstCol === null || firstCol === "") &&
      secondCol &&
      typeof secondCol === "string" &&
      isColumnInFunctionSelectionRange(firstHeader, i)
    ) {
      const key = `select_${secondCol}`;
      mapping[key] = i;
    }
    // 处理Alternate functions的Digital列
    else if (firstCol === "Alternate functions" && secondCol === "Digital") {
      mapping["Digital"] = i;
    }
    // 处理Alternate functions的Analog列
    else if (firstCol === "Alternate functions" && secondCol === "Analog") {
      mapping["Analog"] = i;
    }
    // 处理其他单列字段（只有当不是Package或Function selection的子列时才处理）
    else if (secondCol && !firstCol && !isPackageOrFunctionSelectionSubColumn(firstHeader, i)) {
      // 如果第一行为空，第二行有值，且不是Package或Function selection的子列
      mapping[secondCol] = i;
    } else if (firstCol && !secondCol) {
      // 如果第二行为空，第一行有值，使用第一行的值作为键
      mapping[firstCol] = i;
    }
  }

  return mapping;
};

// 检查当前列是否在Package范围内
const isColumnInPackageRange = (firstHeader: any[], currentIndex: number) => {
  let packageStart = -1;
  let packageEnd = -1;

  for (let i = 0; i < firstHeader.length; i++) {
    if (firstHeader[i] === "Package") {
      packageStart = i;
      // 找到Package的结束位置（下一个非空列之前）
      for (let j = i + 1; j < firstHeader.length; j++) {
        if (firstHeader[j] && firstHeader[j] !== "Package") {
          packageEnd = j - 1;
          break;
        }
      }
      if (packageEnd === -1) packageEnd = firstHeader.length - 1;
      break;
    }
  }

  return currentIndex >= packageStart && currentIndex <= packageEnd;
};

// 检查当前列是否在Function selection范围内
const isColumnInFunctionSelectionRange = (firstHeader: any[], currentIndex: number) => {
  let functionStart = -1;
  let functionEnd = -1;

  for (let i = 0; i < firstHeader.length; i++) {
    if (firstHeader[i] === "Function selection") {
      functionStart = i;
      // 找到Function selection的结束位置（下一个非空列之前）
      for (let j = i + 1; j < firstHeader.length; j++) {
        if (firstHeader[j] && firstHeader[j] !== "Function selection") {
          functionEnd = j - 1;
          break;
        }
      }
      if (functionEnd === -1) functionEnd = firstHeader.length - 1;
      break;
    }
  }

  const result = currentIndex >= functionStart && currentIndex <= functionEnd;
  return result;
};

// 检查当前列是否是Package或Function selection的子列
const isPackageOrFunctionSelectionSubColumn = (firstHeader: any[], currentIndex: number) => {
  return (
    isColumnInPackageRange(firstHeader, currentIndex) || isColumnInFunctionSelectionRange(firstHeader, currentIndex)
  );
};

// 解析单行数据
const parseDataRow = (row: any[], columnMapping: any, _rowIndex: number) => {
  const result: any = {};

  // 遍历映射关系，提取数据
  Object.keys(columnMapping).forEach((key) => {
    const columnIndex = columnMapping[key];
    let value = row[columnIndex];

    // 处理空值和特殊值
    if (value === undefined || value === null || value === "-") {
      value = "";
    }

    // 处理Digital和Analog列的多行数据
    if (key === "Digital" || key === "Analog") {
      // 如果值包含换行符，统一处理为\r\n格式
      if (typeof value === "string") {
        // 先清理多余的\r，然后统一替换\n为\r\n
        value = value.replace(/\r+/g, "").replace(/\n/g, "\r\n");
      }
    }

    result[key] = value;
  });

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

  target.value = "";
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
