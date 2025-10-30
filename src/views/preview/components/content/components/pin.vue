<template>
  <g>
    <rect
      :x="pin.x"
      :y="pin.y"
      :width="pin.width"
      :height="pin.height"
      :fill="pinFill"
      stroke="#aaa"
      stroke-width="1.1"
      :filter="'url(#pin-shadow)'"
      rx="0"
      :class="pinRectClass"
      :style="rectStyle"
      @mouseenter="$emit('mouseenter')"
      @mouseleave="$emit('mouseleave')"
      @click="pinClick()"
    >
      <title>{{ pinTooltipText }}</title>
    </rect>
    <!-- 引脚文本 -->
    <text
      :x="getPinLabelParams(pin, 'x')"
      :y="getPinLabelParams(pin, 'y')"
      :text-anchor="getPinLabelParams(pin, 'textAnchor')"
      :dominant-baseline="getPinLabelParams(pin, 'dominantBaseline')"
      :font-size="getPinLabelParams(pin, 'fontSize')"
      :fill="textColor"
      class="pointer-events-none font-mono"
      :transform="getPinLabelParams(pin, 'transform')"
    >
      {{ pinLabel }}
    </text>
    <!-- 选项内容 -->
    <template v-if="pin.selectLabel">
      <text
        :x="getSelectLabelParams(pin, 'x')"
        :y="getSelectLabelParams(pin, 'y')"
        :text-anchor="getSelectLabelParams(pin, 'textAnchor')"
        :dominant-baseline="getSelectLabelParams(pin, 'dominantBaseline')"
        :font-size="getSelectLabelParams(pin, 'fontSize')"
        :fill="selectedFill"
        class="pointer-events-none font-mono"
        :transform="getSelectLabelParams(pin, 'transform')"
      >
        {{ formatPinLabel(pin.selectLabel) }}
      </text>
    </template>
  </g>
</template>

<script lang="ts" setup>
import { eventBus } from "@/hooks/eventBus";
import { onMounted, onUnmounted, ref, computed, inject, Ref } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import type { PinType } from "@/types/chip";
import { usePinConfigStore } from "@/store/modules/pinConfig";
import { storeToRefs } from "pinia";
import { formatPinLabel } from "@/utils";

const {
  pin,
  chipSize,
  selected,
  hover,
  fontScale = 1
} = defineProps<{
  pin: PinType;
  chipSize: number;
  selected?: boolean;
  hover?: boolean;
  fontScale?: number;
}>();

const emit = defineEmits(["click", "mouseenter", "mouseleave"]);

// #region 引脚配置
const configStore = usePinConfigStore();

const { activeColor, conflictColor, hoverColor, disabledColor, highlightColor, textColor } = storeToRefs(configStore);
// #endregion

// #region 监听搜索框
const highLight = ref<boolean>(false);
let clearHighlightTimer: (() => void) | null = null;
const listenSearch = (val: string) => {
  if (clearHighlightTimer) clearHighlightTimer();
  highLight.value = checkHighlight(val, pin);
  if (highLight.value) {
    const { stop } = useTimeoutFn(() => {
      highLight.value = false;
      clearHighlightTimer = null;
    }, 5000);
    clearHighlightTimer = stop;
  }
};

const checkHighlight = (val: string, { name, Analog, Digital }: PinType) => {
  if (!val) return false;
  if (name.includes(val)) return true;
  if (Analog.some((item) => item.includes(val))) return true;
  if (Digital.some((item) => item.includes(val))) return true;
  return false;
};
// #endregion

// #region 引脚冲突检测 -- 动画同步
const conflictAnimStart = inject<Ref<number | undefined>>("conflictAnimStart");
const conflictAnimElapsed = computed(() => {
  if (!conflictAnimStart?.value) return 0;
  return ((Date.now() - conflictAnimStart.value) / 1000).toFixed(2); // 秒，保留两位
});
// #endregion

// #region 引脚逻辑
const disabledPin = computed(() => {
  return pin.Type === "S" || pin.Io === "RST" || pin.Io === "NC";
});

const pinLabel = computed(() => {
  if (pin.name === "RESET") {
    return "NRST";
  } else {
    return formatPinLabel(pin.name);
  }
});

const pinTooltipText = computed(() => {
  const parts: string[] = [];

  // 编号
  parts.push(`编号: ${pin.sortValue}`);

  // 类型
  if (pin.Type) {
    parts.push(`类型: ${pin.Type}`);
  }

  // I/O结构
  if (pin.Io) {
    parts.push(`I/O结构: ${pin.Io}`);
  }

  return parts.join("\n");
});
// #endregion

// #region svg样式
const pinFill = computed(() => {
  if (disabledPin.value) {
    return disabledColor.value;
  } else if (pin.selectLabel) {
    return activeColor.value;
  } else if (selected || hover) {
    return hoverColor.value;
  } else {
    return "#fff";
  }
});

const pinRectClass = computed(() => [
  { "cursor-pointer": !disabledPin.value },
  {
    conflict: pin.conflict
  },
  { highlight: highLight.value }
]);

const selectedFill = computed(() => {
  if (pin.conflict) {
    return conflictColor.value;
  } else {
    return textColor.value;
  }
});
// #endregion

// #region 事件处理
const pinClick = () => {
  if (!disabledPin.value) {
    return emit("click");
  }
};
// #endregion

// #region pinLabel
const getPinLabelParams = (
  pin: PinType,
  key: "x" | "y" | "textAnchor" | "dominantBaseline" | "fontSize" | "transform"
) => {
  const { side } = pin;
  let data: Record<string, any> = {};
  switch (side) {
    case "top":
      data = {
        x: pin.x + pin.width / 2,
        y: pin.y + pin.height / 2 + chipSize * 0.047 * 0.08,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.047 * fontScale,
        transform: `rotate(-90 ${pin.x + pin.width / 2} ${pin.y + pin.height / 2})`
      };
      break;
    case "bottom":
      data = {
        x: pin.x + pin.width / 2,
        y: pin.y + pin.height / 2 + chipSize * 0.047 * 0.08,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.047 * fontScale,
        transform: `rotate(90 ${pin.x + pin.width / 2} ${pin.y + pin.height / 2})`
      };
      break;
    default:
      data = {
        x: pin.x + pin.width / 2,
        y: pin.y + pin.height / 2 + chipSize * 0.047 * 0.08,
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.047 * fontScale,
        transform: ""
      };
  }

  return data[key] ?? null;
};
// #endregion

// #region selectLabel
const getSelectLabelParams = (
  pin: PinType,
  key: "x" | "y" | "textAnchor" | "dominantBaseline" | "fontSize" | "transform"
) => {
  const { side } = pin;
  let data: Record<string, any> = {};
  switch (side) {
    case "left":
      data = {
        x: pin.x - 17,
        y: pin.y + pin.height / 2 + chipSize * 0.047 * 0.08,
        textAnchor: "end",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.04 * fontScale,
        transform: ""
      };
      break;
    case "right":
      data = {
        x: pin.x + pin.width + 17,
        y: pin.y + pin.height / 2 + chipSize * 0.047 * 0.08,
        textAnchor: "start",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.04 * fontScale,
        transform: ""
      };
      break;
    case "top":
      data = {
        x: pin.x + pin.width / 2,
        y: pin.y - 17,
        textAnchor: "start",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.04 * fontScale,
        transform: `rotate(-90 ${pin.x + pin.width / 2} ${pin.y - 17})`
      };
      break;
    case "bottom":
      data = {
        x: pin.x + pin.width / 2,
        y: pin.y + pin.height + 17,
        textAnchor: "start",
        dominantBaseline: "middle",
        fontSize: chipSize * 0.04 * fontScale,
        transform: `rotate(90 ${pin.x + pin.width / 2} ${pin.y + pin.height + 17})`
      };
      break;
    default:
      return null;
  }

  return data[key] ?? null;
};
// #endregion

// #region 生命周期
onMounted(() => {
  eventBus.on("chip:search", listenSearch);
});

onUnmounted(() => {
  eventBus.off("chip:search", listenSearch);
});
// #endregion

// animationDelay 和 --conflict-color 合并为一个响应式style对象
const rectStyle = computed(() => {
  const style: any = {
    "--conflict-color": conflictColor.value,
    "--highlight-color": highlightColor.value
  };
  if (pin.conflict) {
    style.animationDelay = `-${conflictAnimElapsed.value}s`;
  }
  return style;
});
</script>

<style lang="scss" scoped>
.highlight {
  animation: blink 0.5s linear 0s infinite alternate;
}

@keyframes blink {
  from {
    fill: #fff;
  }

  to {
    fill: var(--highlight-color, #4d7c0f);
  }
}

.conflict {
  animation: cblink 0.5s linear 0s infinite alternate;
}

@keyframes cblink {
  from {
    fill: #fff;
  }

  to {
    fill: var(--conflict-color, #ff0000);
  }
}
</style>
