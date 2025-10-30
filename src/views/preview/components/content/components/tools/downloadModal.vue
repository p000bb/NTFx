<template>
  <Modal v-model="visible">
    <div class="p-4">
      <!-- 预览 -->
      <div class="w-full h-full aspect-square p-4">
        <div class="border border-border rounded-lg w-full h-full" v-html="pureSvgCode"></div>
      </div>

      <!-- 下载按钮列表 -->
      <div class="flex justify-between px-4">
        <button
          v-for="button in buttonList"
          :key="button.key"
          @click="button.onClick"
          class="btn rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 font-medium transition-colors text-sm"
        >
          {{ button.label }}
        </button>
      </div>
      <canvas ref="canvasRef" class="hidden" />
    </div>
  </Modal>
</template>

<script lang="tsx" setup>
import Modal from "@/components/Modal/index.vue";
import { computed, ref, watch } from "vue";
import { eventBus } from "@/hooks/eventBus";
import { useClipboard } from "@vueuse/core";
import { isNil } from "lodash-es";
import message from "@/utils/message";
import jsPDF from "jspdf";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import ChipService from "@/services/chipService";
import ExcelJS from "exceljs";
import ProjectService from "@/services/projectService";

const { locale, t } = useI18n();
const visible = ref<boolean>(false);
const svgCode = ref<string>("");

const pureSvgCode = computed(() =>
  svgCode.value
    .replace(/^<\?xml.*?\?>\s*/i, "")
    .replace(
      /<svg /,
      '<svg style="width:150%;height:150%;display:block;margin:auto;transform: translate(-132.5px, -132.5px);pointer-events:none;" '
    )
);

const chipName = computed(() => {
  // @ts-ignore
  return document.querySelector(".select-chip")?.value;
});

const svgRef = ref<SVGSVGElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const buttonList = ref<any[]>([]);
const getButtonList = () => {
  buttonList.value = [
    {
      key: "excel-download",
      label: `${t("tools.excel")} ${t("tools.download")}`,
      onClick: async () => {
        getExcel();
      }
    },
    {
      key: "svg-download",
      label: `${t("tools.svg")} ${t("tools.download")}`,
      onClick: async () => {
        svgDownload();
      }
    },
    // {
    //   key: "svg-copy",
    //   label: `${t("tools.copy")} ${t("tools.svg")} ${t("tools.code")}`,
    //   onClick: async () => {
    //     svgCopy();
    //   }
    // },
    {
      key: "png-download",
      label: `${t("tools.png")} ${t("tools.download")}`,
      onClick: () => {
        pngDownload();
      }
    },
    {
      key: "pdf-download",
      label: `${t("tools.pdf")} ${t("tools.download")}`,
      onClick: () => {
        pdfDownload();
      }
    }
  ];
};

watch(
  locale,
  () => {
    getButtonList();
  },
  {
    immediate: true
  }
);

const open = () => {
  visible.value = true;
  getSvg();
  getSvgCode();
};

const getSvg = () => {
  eventBus.emit("svg:get", (svg) => {
    // @ts-ignore
    svgRef.value = svg;
  });
};

const route = useRoute();
const projectId = computed(() => {
  return Number(route.params.id);
});

// #region excel下载
const getExcel = async () => {
  try {
    // 获取当前项目下所有芯片的引脚信息
    const chips = await ChipService.getAllChips(projectId.value);
    if (!chips || chips.length === 0) {
      message.error("没有找到芯片数据");
      return;
    }

    // 收集所有芯片中的所有唯一引脚名称
    const allPinNames = new Set<string>();
    for (const chip of chips) {
      for (const pin of chip.pins) {
        allPinNames.add(pin.Name);
      }
    }
    // 将Set转换为排序后的数组
    const sortedPinNames = Array.from(allPinNames).sort();

    // 创建新的工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    // 定义基础样式
    const baseStyle = {
      font: { name: "Times New Roman", size: 10 },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      }
    };

    // 定义表头样式
    const headerStyle = {
      font: { name: "Times New Roman", size: 10 },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      }
    };

    let colIndex = 1;

    // Package 列 - 合并从第1列到第chips.length列（第一行）
    worksheet.getCell(1, colIndex).value = "Package";
    const packageStartCol = colIndex;
    for (let i = 0; i < chips.length; i++) {
      worksheet.getCell(2, colIndex).value = chips[i].name;
      worksheet.getColumn(colIndex).width = 12;
      colIndex++;
    }
    const packageEndCol = colIndex - 1;
    worksheet.mergeCells(1, packageStartCol, 1, packageEndCol);

    // Pin name, Type, IO, Fail-safe - 每列从第1行合并到第2行
    const pinColumns = ["Pin name", "Type", "IO", "Fail-safe"];
    for (const colName of pinColumns) {
      worksheet.getCell(1, colIndex).value = colName;
      worksheet.mergeCells(1, colIndex, 2, colIndex);
      worksheet.getColumn(colIndex).width = colName === "Pin name" ? 12 : 8;
      colIndex++;
    }

    // Alternate functions - 合并2列（第一行）
    const alternateFuncStartCol = colIndex;
    worksheet.getCell(1, colIndex).value = "Alternate functions";
    worksheet.getCell(2, colIndex).value = "Digital";
    worksheet.getColumn(colIndex).width = 20;
    colIndex++;
    worksheet.getCell(2, colIndex).value = "Analog";
    worksheet.getColumn(colIndex).width = 20;
    const alternateFuncEndCol = colIndex;
    worksheet.mergeCells(1, alternateFuncStartCol, 1, alternateFuncEndCol);

    // Function selection - 合并chips.length列（第一行）
    colIndex++;
    const funcSelectionStartCol = colIndex;
    worksheet.getCell(1, colIndex).value = "Function selection";
    for (let i = 0; i < chips.length; i++) {
      worksheet.getCell(2, colIndex).value = chips[i].name;
      worksheet.getColumn(colIndex).width = 15;
      colIndex++;
    }
    const funcSelectionEndCol = colIndex - 1;
    worksheet.mergeCells(1, funcSelectionStartCol, 1, funcSelectionEndCol);

    // 应用表头样式（第一行和第二行）
    for (let row = 1; row <= 2; row++) {
      for (let col = 1; col < colIndex; col++) {
        worksheet.getCell(row, col).style = headerStyle as any;
      }
    }

    // 构建数据行 - 遍历所有唯一的引脚名称
    let dataRowIndex = 3;
    for (const pinName of sortedPinNames) {
      let currentCol = 1;

      // 找到第一个包含此引脚的芯片数据（用于填充固定列）
      let referencePin = null;
      for (const chip of chips) {
        const pin = chip.pins.find((p) => p.Name === pinName);
        if (pin) {
          referencePin = pin;
          break;
        }
      }

      // Package 列的数据 - 使用sortValue而不是索引
      for (const chip of chips) {
        const pin = chip.pins.find((p) => p.Name === pinName);
        worksheet.getCell(dataRowIndex, currentCol).value = pin && pin.sortValue ? pin.sortValue : "-";
        worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
        currentCol++;
      }

      // 固定列的数据（Pin name, Type, IO, Fail-safe）
      worksheet.getCell(dataRowIndex, currentCol).value = pinName;
      worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
      currentCol++;

      worksheet.getCell(dataRowIndex, currentCol).value = referencePin?.Type || "";
      worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
      currentCol++;

      worksheet.getCell(dataRowIndex, currentCol).value = referencePin?.Io || "";
      worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
      currentCol++;

      worksheet.getCell(dataRowIndex, currentCol).value = referencePin?.Fail || "";
      worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
      currentCol++;

      // Alternate functions
      const digitalText = (referencePin?.Digital || [])
        .filter((item) => item && !["一", "-"].includes(item))
        .join("\r\n");
      const analogText = (referencePin?.Analog || [])
        .filter((item) => item && !["一", "-"].includes(item))
        .join("\r\n");

      // Digital 列 - 支持换行
      const digitalCell = worksheet.getCell(dataRowIndex, currentCol);
      digitalCell.value = digitalText;
      digitalCell.style = { ...baseStyle, alignment: { ...baseStyle.alignment, wrapText: true } } as any;
      currentCol++;

      // Analog 列 - 支持换行
      const analogCell = worksheet.getCell(dataRowIndex, currentCol);
      analogCell.value = analogText;
      analogCell.style = { ...baseStyle, alignment: { ...baseStyle.alignment, wrapText: true } } as any;
      currentCol++;

      // Function selection
      for (const chip of chips) {
        const pin = chip.pins.find((p) => p.Name === pinName);
        let value = "";
        if (pin && pin.selectLabel) {
          value = pin.selectLabel;
          // 如果selectLabel包含当前Pin name，去除当前Pin name
          if (value.includes(pinName)) {
            // 去掉 Pin name 前缀（包括点号）
            const regex = new RegExp(`^${pinName}\\.?`, "i");
            value = value.replace(regex, "");
          } else {
            // 如果不包含缩写，将"."替换成"_"
            value = value.replace(/\./g, "_");
          }
        }
        worksheet.getCell(dataRowIndex, currentCol).value = value;
        worksheet.getCell(dataRowIndex, currentCol).style = baseStyle as any;
        currentCol++;
      }

      dataRowIndex++;
    }

    // 下载文件
    const { name: projectName } = await ProjectService.getProjectById(projectId.value);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    message.success(t("tools.excelDownloadSuccess"));
  } catch (error: any) {
    console.error("生成 Excel 失败:", error);
    message.error(error.message);
  }
};
// #endregion

// #region 获取svg代码
const getSvgCode = () => {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgRef.value!);
  source = source.replace(/<!--[\s\S]*?-->/g, "");
  if (!/^<svg/.test(source)) {
    const svgHTML = svgRef.value!.outerHTML || "";
    source = svgHTML;
  }
  if (!/^<svg[^>]+xmlns=/.test(source)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  svgCode.value = source;
};
// #endregion

// #region svg下载
const svgDownload = () => {
  try {
    if (!isNil(svgRef.value)) {
      const blob = new Blob([svgCode.value], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chipName.value}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error: any) {
    message.error(error.message);
  }
};
// #endregion

// #region svg复制
const svgCopy = async () => {
  try {
    const { copy } = useClipboard();
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.value!);
    source = source.replace(/<!--[\s\S]*?-->/g, "");
    await copy(source);
    message.success(t("tools.copySuccess"));
  } catch (error) {
    message.error(t("tools.copyFailed"));
  }
};
// #endregion

// #region png下载
const pngDownload = async () => {
  try {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // 设置canvas尺寸为图片尺寸
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;

      // 绘制白色背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制SVG图片
      ctx.drawImage(img, 0, 0);

      // 转换为PNG并下载
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${chipName.value}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    };
    // 使用Blob URL加载SVG
    const blob = new Blob([svgCode.value], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.src = url;
  } catch (e: any) {
    message.error(e.message);
  }
};
// #endregion

// #region pdf下载
const pdfDownload = async () => {
  try {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 设置canvas尺寸为图片尺寸
      const width = img.width || 800;
      const height = img.height || 600;
      canvas.width = width;
      canvas.height = height;

      // 绘制白色背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制SVG图片
      ctx.drawImage(img, 0, 0);

      // 转换为图片数据
      const imgData = canvas.toDataURL("image/png");

      // 创建PDF
      // 使用A4纸张尺寸（210mm x 297mm）
      const pdfWidth = 210;
      const pdfHeight = 297;

      // 计算图片在PDF中的尺寸，保持宽高比
      let imgWidth = pdfWidth - 20; // 留10mm边距
      let imgHeight = (height * imgWidth) / width;

      // 如果高度超过页面，则按高度缩放
      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = (width * imgHeight) / height;
      }

      // 居中位置
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      // 创建简单的PDF（使用canvas生成）
      // 由于要使用原生JS，我们创建一个包含图片的PDF
      const pdfCanvas = document.createElement("canvas");
      const pdfCtx = pdfCanvas.getContext("2d");
      if (!pdfCtx) return;

      // 设置PDF画布尺寸（A4 at 72 DPI: 595 x 842 points）
      pdfCanvas.width = 595;
      pdfCanvas.height = 842;

      // 白色背景
      pdfCtx.fillStyle = "#ffffff";
      pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

      // 计算图片在PDF中的位置和尺寸（转换mm到points: 1mm = 2.83465 points）
      const pointsPerMm = 2.83465;
      const imgWidthPoints = imgWidth * pointsPerMm;
      const imgHeightPoints = imgHeight * pointsPerMm;
      const xPoints = x * pointsPerMm;
      const yPoints = y * pointsPerMm;

      // 绘制图片
      const tempImg = new Image();
      tempImg.onload = () => {
        pdfCtx.drawImage(tempImg, xPoints, yPoints, imgWidthPoints, imgHeightPoints);

        // 使用jsPDF库来生成真正的PDF
        // 由于要求使用原生JS，我们使用一个简化的方法
        // 创建一个包含图片的简单PDF结构
        createSimplePdf(imgData, width, height);
      };
      tempImg.src = imgData;
    };

    img.onerror = () => {
      alert("SVG转换失败，请检查SVG代码是否正确");
    };

    const blob = new Blob([svgCode.value], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.src = url;
  } catch (e: any) {}
};

const createSimplePdf = (imgData: string, width: number, height: number) => {
  // 计算PDF尺寸
  const orientation = width > height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: "a4"
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // 计算图片在PDF中的尺寸，保持宽高比
  let imgWidth = pdfWidth - 20;
  let imgHeight = (height * imgWidth) / width;

  if (imgHeight > pdfHeight - 20) {
    imgHeight = pdfHeight - 20;
    imgWidth = (width * imgHeight) / height;
  }

  const x = (pdfWidth - imgWidth) / 2;
  const y = (pdfHeight - imgHeight) / 2;

  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  pdf.save(`${chipName.value}.pdf`);
};
// #endregion

defineExpose({
  open
});
</script>

<style scoped lang="scss">
.btn {
  &:hover {
    background: center center #4a54ff;
    background-image: linear-gradient(315deg, #6772ff 0, #00f9e5 100%);
    background-size: 104% 104%;
    color: #fff;
    transition: all 0.3s ease;
  }
}
</style>
