<template>
  <div
    ref="rootRef"
    class="w-full h-full flex justify-center items-center overflow-auto select-none"
    @wheel.passive="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    :style="{ cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default' }"
  >
    <svg
      v-if="width > 0 && height > 0 && chipInfo"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="block"
      preserveAspectRatio="xMidYMid meet"
      ref="svgRef"
      style="overflow: visible"
    >
      <g :transform="gTransform">
        <defs>
          <filter id="chip-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="6" dy="6" stdDeviation="5" flood-color="#bbb" flood-opacity="0.21" />
          </filter>
          <filter id="pin-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#888" flood-opacity="0.18" />
          </filter>
        </defs>
        <!-- 芯片主体用main组件渲染，用chipInfo对象参数传递 -->
        <Main
          :chip-x="chipX"
          :chip-y="chipY"
          :chip-size="chipSize"
          :pin-long="pinLong"
          :width="width"
          :height="height"
          :chip-name="chipInfo?.name || ''"
          :chip-package="chipInfo?.package || ''"
        />
        <!-- 引脚循环用pin组件渲染，动态数量和全部参数 -->
        <template v-for="(pin, idx) in pins" :key="pin.index">
          <Pin
            :pin="pin"
            :chip-size="chipSize"
            :selected="selectedPins[idx]"
            :hover="hoverPin === idx"
            @mouseenter="hoverPin = idx"
            @mouseleave="hoverPin = null"
            @click="showDropdown(idx)"
            :font-scale="pinFontScale"
            :select-font-scale="pinFontScale * 1.1"
          />
        </template>
        <Transition>
          <PinSelect
            v-if="
              dropdown.visible &&
              Array.isArray(pins) &&
              dropdown.index >= 0 &&
              dropdown.index < pins.length &&
              dropdownOptions.length > 0
            "
            v-model:visible="dropdown.visible"
            :options="dropdownOptions"
            :size="dropdownOptions.length"
            :x="dropdown.x"
            :y="dropdown.y"
            :model-value="pins[dropdown.index]?.selectLabel || ''"
            @update:modelValue="onPinSelectChange"
            @blur="hideDropdown"
            :optionHeight="dropdown.optionHeight"
            :optionWidth="dropdown.optionWidth"
            :fontSize="dropdown.fontSize"
            :fontScale="dropdown.fontScale"
            :chipInfo="chipInfo"
          />
        </Transition>
      </g>
    </svg>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, watchEffect, provide } from "vue";
import PinSelect from "./pinSelect.vue";
import Main from "./main.vue";
import Pin from "./pin.vue";
import { eventBus } from "@/hooks/eventBus";
import type { Chip, Dropdown, ChipInfo } from "@/types/chip";
import { formatPinLabel } from "@/utils";
import { useChipConfigStore } from "@/store/modules/chipConfig";
import { storeToRefs } from "pinia";
import { useMagicKeys } from "@vueuse/core";
import { useManualRefHistory } from "@vueuse/core";

// #region 状态/引用定义
const mainRatio = computed(() => getMainRatio(pinCount.value));
const pinFontScale = computed(() => getPinFontScale(pinCount.value));
const rootRef = ref<HTMLElement | null>(null);
const width = ref(0);
const height = ref(0);
let resizeObs: ResizeObserver | null = null;
let chipSize = 0,
  chipX = 0,
  chipY = 0,
  pinLong = 0;
const pins = computed(() => chipInfo.value?.pins || []);
// #endregion

// #region 核心props、响应式数据
const props = defineProps<{ modelValue: Chip | null; name: number | undefined }>();
const pinCount = computed(() => chipInfo.value?.pinNumber || 48);
const pinsPerSide = computed(() => pinCount.value / 4);
const emit = defineEmits<{
  (e: "update:modelValue", value: Chip | null): void;
}>();
// #endregion

// #region 缩放、拖拽逻辑
const scale = ref(1);
const translate = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const lastDragPos = ref({ x: 0, y: 0 });

// 缩放中心坐标
const centerX = computed(() => width.value / 2);
const centerY = computed(() => height.value / 2);

// 动态transform字符串
const gTransform = computed(() => {
  return `translate(${centerX.value + translate.x},${centerY.value + translate.y}) scale(${
    scale.value
  }) translate(${-centerX.value},${-centerY.value})`;
});

// 复位操作函数
const resetView = () => {
  scale.value = 1;
  translate.x = 0;
  translate.y = 0;
};

// 缩放事件
const onWheel = (e: WheelEvent) => {
  // e.preventDefault();
  // 滚轮缩放以 1.1因子缩放
  const minScale = 0.5,
    maxScale = 3,
    factor = 0.95;
  let next = scale.value * (e.deltaY > 0 ? factor : 1 / factor);
  if (next < minScale) next = minScale;
  if (next > maxScale) next = maxScale;
  scale.value = Number(next.toFixed(4));
};

const { space } = useMagicKeys();
const canDrag = computed(() => space.value);

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return;
  if (!canDrag.value) return;
  isDragging.value = true;
  lastDragPos.value = { x: e.clientX, y: e.clientY };
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const dx = e.clientX - lastDragPos.value.x;
  const dy = e.clientY - lastDragPos.value.y;
  translate.x += dx;
  translate.y += dy;
  lastDragPos.value = { x: e.clientX, y: e.clientY };
};

const onMouseUp = () => {
  isDragging.value = false;
};
// #endregion

// #region 监听chipInfo变化
const chipInfo = ref<ChipInfo>();

watch(
  () => chipInfo.value,
  (val) => {
    if (val) {
      const data = {
        ...val,
        pins: val.pins.map((pin) => ({
          Name: pin.name,
          Digital: pin.Digital,
          Analog: pin.Analog,
          Io: pin.Io,
          Fail: pin.Fail,
          Type: pin.Type,
          selectLabel: pin.selectLabel
        }))
      };

      emit("update:modelValue", data);
    }
  },
  { deep: true }
);

const restoreChip = () => {
  if (!props.modelValue) return;

  chipInfo.value = {
    id: props.modelValue.id,
    name: props.modelValue.name,
    package: props.modelValue.package,
    pinNumber: props.modelValue.pinNumber,
    pins: props.modelValue.pins.map((pin) => ({
      index: 0,
      name: pin.Name,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      side: "",
      selectLabel: pin.selectLabel,
      Digital: pin.Digital,
      Analog: pin.Analog,
      Io: pin.Io,
      Type: pin.Type,
      Fail: pin.Fail,
      conflict: false
    }))
  };
};

watch(
  () => props.name,
  (val) => {
    if (val) {
      restoreChip();
      checkConflict();
    }
  },
  { immediate: true }
);
// #endregion

// #region 芯片参数配置
const chipConfigStore = useChipConfigStore();

const { chipScale, fontScale, beginSide } = storeToRefs(chipConfigStore);
// #endregion

// #region 自适应参数函数
function getMainRatio(pinCount: number) {
  return 0.35 * Math.cbrt(pinCount / 24) * chipScale.value;
}
function getPinFontScale(pinCount: number) {
  return 2 * Math.pow(24 / pinCount, 0.7) * chipScale.value * fontScale.value;
}
// #endregion

// #region updateLayout（布局）& pins计算

function updateLayout(): void {
  if (!width.value || !height.value) return;
  const vmin = Math.min(width.value, height.value);
  chipSize = vmin * mainRatio.value;
  chipX = (width.value - chipSize) / 2;
  chipY = (height.value - chipSize) / 2;
  const N = pinsPerSide.value;
  pinLong = chipSize / N;
  const pinShort = pinLong * 4;
  const pinsArr = chipInfo.value?.pins || [];
  const sides = ["bottom", "right", "top", "left"];
  const startIdx = sides.indexOf(beginSide.value || "bottom");
  const sidesOrdered: ("bottom" | "right" | "top" | "left")[] = [];
  for (let i = 0; i < 4; i++) {
    sidesOrdered.push(sides[(startIdx + i) % 4] as "bottom" | "right" | "top" | "left");
  }
  let pinCounter = 0;
  for (let sideIdx = 0; sideIdx < 4; sideIdx++) {
    const side = sidesOrdered[sideIdx];
    for (let i = 0; i < N; i++, pinCounter++) {
      if (!pinsArr[pinCounter]) continue;
      pinsArr[pinCounter].index = pinCounter;
      pinsArr[pinCounter].name = formatPinLabel(pinsArr[pinCounter].name);
      pinsArr[pinCounter].side = side;
      if (side === "bottom") {
        pinsArr[pinCounter].x = chipX + i * pinLong;
        pinsArr[pinCounter].y = chipY + chipSize;
        pinsArr[pinCounter].width = pinLong;
        pinsArr[pinCounter].height = pinShort;
      } else if (side === "right") {
        pinsArr[pinCounter].x = chipX + chipSize;
        pinsArr[pinCounter].y = chipY + chipSize - (i + 1) * pinLong;
        pinsArr[pinCounter].width = pinShort;
        pinsArr[pinCounter].height = pinLong;
      } else if (side === "top") {
        pinsArr[pinCounter].x = chipX + chipSize - (i + 1) * pinLong;
        pinsArr[pinCounter].y = chipY - pinShort;
        pinsArr[pinCounter].width = pinLong;
        pinsArr[pinCounter].height = pinShort;
      } else if (side === "left") {
        pinsArr[pinCounter].x = chipX - pinShort;
        pinsArr[pinCounter].y = chipY + i * pinLong;
        pinsArr[pinCounter].width = pinShort;
        pinsArr[pinCounter].height = pinLong;
      }
    }
  }
}
// #endregion

// #region resize逻辑
const resizeFn = () => {
  resizeObs = new window.ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === rootRef.value) {
        width.value = entry.contentRect.width;
        height.value = entry.contentRect.height;
      }
    }
  });
  if (rootRef.value) {
    resizeObs.observe(rootRef.value);
  }
};

watchEffect(() => {
  if (chipInfo.value?.name && width.value > 0 && height.value > 0) {
    updateLayout();
  }
});
// #endregion

// #region 其它响应式/下拉/交互变量区
const selectedPins = ref<boolean[]>([]);
watch(
  pinCount,
  (val) => {
    selectedPins.value = Array(val).fill(false);
  },
  { immediate: true }
);
const hoverPin = ref<number | null>(null);
const dropdown = reactive<Dropdown>({
  visible: false,
  index: -1,
  x: 0,
  y: 0,
  optionHeight: 0,
  optionWidth: 0,
  fontSize: 0,
  fontScale: 0
});

const dropdownOptions = computed(() => {
  const idx = dropdown.index;
  const chipData = chipInfo.value?.pins || [];
  const pin = chipData[idx];
  if (!pin) return [];
  const type = (pin.Type || "").toUpperCase();
  const options: any[] = [];

  // 固定顺序及显隐规则
  const COMMON_OPTIONS = [
    {
      key: "Reset",
      show: (type: string) => ["I/O", "I", "O"].includes(type),
      label: (name: string) => `${name}.Reset`
    },
    {
      key: "Input",
      show: (type: string) => ["I/O", "I"].includes(type),
      label: (name: string) => `${name}.Input`
    },
    {
      key: "Output",
      show: (type: string) => ["I/O", "O"].includes(type),
      label: (name: string) => `${name}.Output`
    },
    {
      key: "EXTI",
      show: (type: string) => ["I/O", "I", "O"].includes(type),
      label: (name: string) => `${name}.EXTI${pin.name.replace(/\D/g, "")}`
    }
  ];
  for (const opt of COMMON_OPTIONS) {
    if (opt.show(type)) options.push({ label: opt.label(pin.name), type: "common" });
  }

  const digital = Array.isArray(pin.Digital) ? pin.Digital : [];
  const analog = Array.isArray(pin.Analog) ? pin.Analog : [];
  options.push(
    ...digital
      .filter((item: string) => item && !["一", "-"].includes(item))
      .map((item: string) => ({ label: item.replace(/_/g, "."), type: "digital" })),
    ...analog
      .filter((item: string) => item && !["一", "-"].includes(item))
      .map((item: string) => ({ label: item.replace(/_/g, "."), type: "analog" }))
  );
  return options;
});
// #endregion

// #region showDropdown、下拉弹窗定位逻辑
function showDropdown(idx: number): void {
  if (!pins.value[idx]) {
    hideDropdown();
    return;
  }
  dropdown.visible = true;
  dropdown.index = idx;
  const pin = pins.value[idx];
  let optionWidth = pin.width * 1.5;
  let optionHeight = pin.height;
  if (pin.side === "top" || pin.side === "bottom") {
    optionWidth = pin.height * 1.5;
    optionHeight = pin.width;
  }
  const selectHeight = dropdownOptions.value.length * optionHeight;
  const fontSize = chipSize * 0.047 * pinFontScale.value;
  const fontScale = pinFontScale.value;
  let x = pin.x;
  let y = pin.y;
  const borderOffset = 3;
  if (pin.side === "top") {
    x = pin.x - borderOffset;
    y = pin.y + pin.height - borderOffset;
    if (y + selectHeight > height.value) y = height.value - selectHeight - borderOffset;
  } else if (pin.side === "bottom") {
    x = pin.x - borderOffset;
    y = pin.y - selectHeight - borderOffset;
    if (y < 0) y = 0;
  } else if (pin.side === "left") {
    x = pin.x + pin.width - borderOffset;
    y = pin.y - borderOffset;
    if (y + selectHeight > height.value) y = pin.y + pin.height - selectHeight - borderOffset;
  } else if (pin.side === "right") {
    x = pin.x - optionWidth - borderOffset;
    y = pin.y - borderOffset;
    if (y + selectHeight > height.value) y = pin.y + pin.height - selectHeight - borderOffset;
  }
  dropdown.x = x;
  dropdown.y = y;
  dropdown.optionHeight = optionHeight;
  dropdown.optionWidth = optionWidth;
  dropdown.fontSize = fontSize;
  dropdown.fontScale = fontScale;
  selectedPins.value = selectedPins.value.map((_, i) => i === idx);
}

function onPinSelectChange(val: string): void {
  if (pins.value[dropdown.index]) {
    pins.value[dropdown.index].selectLabel = val;
    commit();
  }

  checkConflict();
}

function hideDropdown(): void {
  dropdown.visible = false;
  selectedPins.value = Array(pinCount.value).fill(false);
}
// #endregion

// #region 引脚冲突检测
function getDotContent(str: string) {
  const match = str.match(/[^.]+$/);
  return match ? match[0] : "";
}

function checkConflict(): void {
  const items = pins.value.map((pin) => {
    if (pin.selectLabel.includes("EXTI")) {
      return getDotContent(pin.selectLabel);
    } else {
      return pin.selectLabel;
    }
  });

  // 重置所有conflict
  pins.value.forEach((pin) => {
    pin.conflict = false;
  });

  for (let i = 0; i < pins.value.length; i++) {
    if (!items[i]) continue;
    for (let j = i + 1; j < pins.value.length; j++) {
      if (!items[j]) continue;
      if (items[i] === items[j]) {
        pins.value[i].conflict = true;
        pins.value[j].conflict = true;
      }
    }
  }
}
// #endregion

// #region svg元素获取
const svgRef = ref<SVGSVGElement | null>(null);
// #endregion

// #region 生命周期
onMounted(() => {
  resizeFn();
  eventBus.on("svg:get", (cb: any) => {
    cb(svgRef.value);
  });
  eventBus.on("chip:get", (cb: any) => {
    cb(chipInfo.value);
  });
  eventBus.on("restore:chip", async () => {
    resetView();
  });
  eventBus.on("check:conflict", (val) => {
    val(pins.value);
  });
  // 处理引脚更新
  eventBus.on("pin:update", (data: { pinName: string; newLabel: string }) => {
    const pin = pins.value.find((p) => p.name === data.pinName);
    if (pin) {
      pin.selectLabel = data.newLabel;
      checkConflict();
      commit();
    }
  });
  // 清除所有冲突
  eventBus.on("clear:all:conflicts", () => {
    pins.value.forEach((pin) => {
      if (pin.conflict) {
        pin.selectLabel = "";
      }
    });
    checkConflict();
    commit();
  });
});

onUnmounted(() => {
  eventBus.off("svg:get");
  eventBus.off("chip:get");
  eventBus.off("restore:chip");
  eventBus.off("check:conflict");
  eventBus.off("pin:update");
  eventBus.off("clear:all:conflicts");
  resizeObs && resizeObs.disconnect();
});
// #endregion

// #region 引脚冲突检测 -- 动画同步
const conflictAnimStart = ref(Date.now());
provide("conflictAnimStart", conflictAnimStart);

// 若希望在所有pin第一次产生冲突时“同步刷新”动画：
watch(
  pins,
  (val) => {
    if (val.some((pin) => pin.conflict)) {
      if (!conflictAnimStart.value || val.every((pin) => !pin.conflict)) {
        conflictAnimStart.value = Date.now();
      }
    }
  },
  { deep: true, immediate: true }
);
// #endregion

// #region 历史记录功能实现
const { undo, redo, commit, canUndo, canRedo, clear } = useManualRefHistory(chipInfo, {
  clone: (v) => JSON.parse(JSON.stringify(v))
});

const keys = useMagicKeys();

// 清空历史记录 watch
watch(
  () => chipInfo.value?.name,
  () => {
    clear();
  }
);

watch(keys["ctrl_z"], (v) => {
  if (v && canUndo.value) {
    undo();
    checkConflict();
  }
});

watch(keys["ctrl_y"], (v) => {
  if (v && canRedo.value) {
    redo();
    checkConflict();
  }
});
// #endregion
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
