<template>
  <svg ref="svgRef" :x="x" :y="y" :width="optionWidth + 6" :height="options.length * optionHeight + 6">
    <g
      v-for="(option, i) in options"
      :key="option.label"
      @mouseenter="hoverIdx = i"
      @mouseleave="hoverIdx = -1"
      @mousedown.stop.prevent="select(i)"
      class="cursor-pointer"
    >
      <rect
        :x="3"
        :y="3 + i * optionHeight"
        :width="optionWidth"
        :height="optionHeight"
        :fill="rectFill(i)"
        :stroke="getOptionStroke(option.type)"
        stroke-width="1.1"
        rx="0"
      />
      <text
        :x="3 + optionWidth / 2"
        :y="3 + i * optionHeight + optionHeight / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="fontSize"
        fill="#222"
        style="font-family: &quot;Consolas&quot;, monospace; pointer-events: none"
      >
        {{ option.label }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { ChipInfo } from "@/types/chip";
import { confirm } from "@/utils/confirm";
import { usePinConfigStore } from "@/store/modules/pinConfig";

const props = defineProps<{
  visible: boolean;
  options: { label: string; type: string }[];
  size?: number;
  x: number;
  y: number;
  modelValue: string;
  optionHeight?: number; // 单项高度
  optionWidth?: number; // rect宽度
  fontSize?: number;
  fontScale?: number;
  chipInfo?: ChipInfo;
}>();
const emit = defineEmits(["update:modelValue", "blur", "update:visible", "update:selected"]);
const hoverIdx = ref(-1);
const svgRef = ref<SVGSVGElement | null>(null);

// #region UI参数相关计算
const optionHeight = computed(() => props.optionHeight || 28);
const optionWidth = computed(() => props.optionWidth || 62);
const fontSize = computed(() => props.fontSize || 16);
// #endregion

// #region 选项高亮与选择逻辑
const activeFill = (idx: number) => {
  return props.options[idx].label === props.modelValue;
};

const hoverFill = (idx: number) => {
  return hoverIdx.value === idx;
};

// #region 冲突判定核心函数
function isPinOptionConflict(labelA: string, labelB: string): boolean {
  const getExti = (str: string) => {
    const idx = str.indexOf("EXTI");
    return idx >= 0 ? str.slice(idx) : "";
  };
  const extiA = getExti(labelA);
  const extiB = getExti(labelB);
  if (extiA && extiB) {
    // 都是EXTI类型，只要EXTI及其后子串完全一样视为冲突
    return extiA === extiB;
  }
  if (extiA || extiB) {
    // 只有一边EXTI，不算冲突
    return false;
  }
  // 都不是EXTI，label全等
  return labelA === labelB;
}
// #endregion

// #region 计算当前下拉所属pin下标
const curPinIndex = computed(() => {
  // pin.selectLabel与当前modelValue相等的那个pin即为自己
  return props.chipInfo?.pins.findIndex((pin) => pin.selectLabel === props.modelValue && pin.selectLabel !== "");
});
// #endregion

const conflictFill = (idx: number) => {
  const label = props.options[idx].label;
  return props.chipInfo?.pins.some((pin, pinIdx) => {
    if (pinIdx === curPinIndex.value) return false;
    return isPinOptionConflict(label, pin.selectLabel);
  });
};

const conflictData = (idx: number) => {
  const currLabel = props.options[idx].label;
  const conflicts = props.chipInfo?.pins.filter(
    (pin, pinIdx) => pinIdx !== curPinIndex.value && isPinOptionConflict(currLabel, pin.selectLabel)
  );
  return conflicts;
};

function select(idx: number) {
  if (conflictFill(idx)) {
    const conflicts = conflictData(idx);
    const conflictContent = conflicts?.map((item) => item.name).join(", ");
    const { showConflictAlert } = usePinConfigStore();
    if (showConflictAlert) {
      confirm({
        title: "提示",
        content: `该引脚与已选引脚冲突，冲突引脚：<span class="text-red-500">${conflictContent}</span>，确定要选择该引脚吗？`,
        okText: "确定",
        cancelText: "取消"
      }).then(() => {
        emit("update:modelValue", props.options[idx].label);
        emit("blur");
      });
    } else {
      emit("update:modelValue", props.options[idx].label);
      emit("blur");
    }
  } else {
    if (props.options[idx].label.includes("Reset")) {
      emit("update:modelValue", "");
    } else {
      emit("update:modelValue", props.options[idx].label);
    }
    emit("blur");
  }
}
// #endregion

// #region 边框颜色逻辑
const typeStrokeMap: Record<string, string> = {
  common: "#0284c7", // 蓝色
  digital: "#22c55e", // 绿色
  analog: "#ef4444" // 红色
};

function getOptionStroke(type: string): string {
  return typeStrokeMap[type] || "#aaa";
}
// #endregion

// #region 显示/隐藏逻辑
const svgVisible = computed({
  get() {
    return props.visible && props.options.length > 0;
  },
  set(v) {
    emit("update:visible", v);
  }
});
// #endregion

// #region watch 逻辑（hoverIdx 控制）
watch(
  () => props.visible,
  (v) => {
    if (!v) hoverIdx.value = -1;
  }
);
// #endregion

// #region 外部点击处理
onClickOutside(svgRef, () => {
  const confirmDom = document.querySelector(".confirm");
  // 如果有确认框则不隐藏pinSelect
  if (!confirmDom) {
    svgVisible.value = false;
    emit("blur");
  }
});
// #endregion

// #region 引脚冲突判断
const rectFill = (i: number) => {
  // 悬浮
  if (hoverFill(i)) {
    return "#BEE6FD";
  }

  // 冲突
  if (conflictFill(i)) {
    return "#FFFF00";
  }
  // 激活
  if (activeFill(i)) {
    return "#90EE90";
  }
  // 默认
  return "#fff";
};
// #endregion
</script>
