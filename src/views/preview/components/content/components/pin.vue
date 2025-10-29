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
    <!-- 编号排版和选项内容与之前一致 -->
    <template v-if="pin.side === 'top'">
      <text
        :x="pin.x + pin.width / 2"
        :y="pin.y + pin.height / 2 + chipSize * 0.047 * 0.08"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="chipSize * 0.047 * fontScale"
        :fill="textColor"
        style="font-family: &quot;Consolas&quot;, monospace; pointer-events: none"
        :transform="`rotate(-90 ${pin.x + pin.width / 2} ${pin.y + pin.height / 2})`"
      >
        {{ pinLabel }}
      </text>
    </template>
    <template v-else-if="pin.side === 'bottom'">
      <text
        :x="pin.x + pin.width / 2"
        :y="pin.y + pin.height / 2 + chipSize * 0.047 * 0.08"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="chipSize * 0.047 * fontScale"
        :fill="textColor"
        style="font-family: &quot;Consolas&quot;, monospace; pointer-events: none"
        :transform="`rotate(90 ${pin.x + pin.width / 2} ${pin.y + pin.height / 2})`"
      >
        {{ pinLabel }}
      </text>
    </template>
    <template v-else>
      <text
        :x="pin.x + pin.width / 2"
        :y="pin.y + pin.height / 2 + chipSize * 0.047 * 0.08"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="chipSize * 0.047 * fontScale"
        :fill="textColor"
        style="font-family: &quot;Consolas&quot;, monospace; pointer-events: none"
      >
        {{ pinLabel }}
      </text>
    </template>
    <!-- 选项内容 -->
    <template v-if="pin.selectLabel">
      <!-- 左边 selected -->
      <text
        v-if="pin.side === 'left'"
        :x="pin.x - 17"
        :y="pin.y + pin.height / 2 + chipSize * 0.047 * 0.08"
        text-anchor="end"
        dominant-baseline="middle"
        :font-size="chipSize * 0.035 * selectFontScale"
        :fill="selectedFill"
        style="pointer-events: none"
      >
        {{ pin.selectLabel }}
      </text>
      <!-- 右边 selected -->
      <text
        v-else-if="pin.side === 'right'"
        :x="pin.x + pin.width + 17"
        :y="pin.y + pin.height / 2 + chipSize * 0.047 * 0.08"
        text-anchor="start"
        dominant-baseline="middle"
        :font-size="chipSize * 0.035 * selectFontScale"
        :fill="selectedFill"
        style="pointer-events: none"
      >
        {{ pin.selectLabel }}
      </text>
      <!-- 上边 selected（等价于右边逆时针旋转 -90°） -->
      <text
        v-else-if="pin.side === 'top'"
        :x="pin.x + pin.width / 2"
        :y="pin.y - 17"
        text-anchor="start"
        dominant-baseline="middle"
        :font-size="chipSize * 0.035 * selectFontScale"
        :fill="selectedFill"
        style="pointer-events: none"
        :transform="`rotate(-90 ${pin.x + pin.width / 2} ${pin.y - 17})`"
      >
        {{ pin.selectLabel }}
      </text>
      <!-- 下边 selected（等价于右边顺时针旋转 +90°） -->
      <text
        v-else-if="pin.side === 'bottom'"
        :x="pin.x + pin.width / 2"
        :y="pin.y + pin.height + 17"
        text-anchor="start"
        dominant-baseline="middle"
        :font-size="chipSize * 0.035 * selectFontScale"
        :fill="selectedFill"
        style="pointer-events: none"
        :transform="`rotate(90 ${pin.x + pin.width / 2} ${pin.y + pin.height + 17})`"
      >
        {{ pin.selectLabel }}
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

const {
  pin,
  chipSize,
  selected,
  hover,
  fontScale = 1,
  selectFontScale = 1
} = defineProps<{
  pin: PinType;
  chipSize: number;
  selected?: boolean;
  hover?: boolean;
  fontScale?: number;
  selectFontScale?: number;
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
    return pin.name;
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
