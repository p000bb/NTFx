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
        <template v-for="(pin, idx) in pins" :key="pin.sortValue">
          <Pin
            :pin="pin"
            :chip-size="chipSize"
            :selected="selectedPins[idx]"
            :hover="hoverPin === idx"
            @mouseenter="hoverPin = idx"
            @mouseleave="hoverPin = null"
            @click="showDropdown(pin)"
            :font-scale="pinFontScale"
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
import { ref, reactive, onMounted, onUnmounted, watch, computed, watchEffect, provide, onBeforeUnmount } from "vue";
import PinSelect from "./pinSelect.vue";
import Main from "./main.vue";
import Pin from "./pin.vue";
import { eventBus } from "@/hooks/eventBus";
import type { Chip, Dropdown, ChipInfo, PinType } from "@/types/chip";
import { getDotContent } from "@/utils";
import { useChipConfigStore } from "@/store/modules/chipConfig";
import { storeToRefs } from "pinia";
import { useMagicKeys, useThrottleFn } from "@vueuse/core";
import { useManualRefHistory } from "@vueuse/core";
import { cloneDeep } from "lodash-es";

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

const pins = ref<PinType[]>([]);

// 创建pins的函数 - 性能优化版本
function createPins() {
  if (!chipInfo.value?.pins) {
    pins.value = [];
    return;
  }

  const pinsArray = chipInfo.value.pins;
  const result: PinType[] = [];

  // 使用Map进行分组，性能更好
  const groupedPins = new Map<string, typeof pinsArray>();

  // 按 sortValue 分组
  for (const pin of pinsArray) {
    const sortValue = pin.sortValue.toString();
    if (!groupedPins.has(sortValue)) {
      groupedPins.set(sortValue, []);
    }
    groupedPins.get(sortValue)!.push(pin);
  }

  // 处理每个分组
  for (const pinGroup of groupedPins.values()) {
    if (pinGroup.length === 1) {
      // 单个引脚，直接添加
      result.push(pinGroup[0]);
      continue;
    }

    // 多个引脚合并 - 优化版本
    const firstPin = pinGroup[0];

    // 找到第一个有selectLabel值的引脚
    let selectedPin = firstPin;
    for (const pin of pinGroup) {
      if (pin.selectLabel && pin.selectLabel.trim() !== "") {
        selectedPin = pin;
        break;
      }
    }

    // 预分配数组大小，避免动态扩容
    const digitalArray: string[] = [];
    const analogArray: string[] = [];
    const nameArray: string[] = [];

    // 一次性遍历完成所有合并操作
    for (const pin of pinGroup) {
      nameArray.push(pin.name);

      if (pin.Digital) {
        digitalArray.push(...pin.Digital);
      }

      if (pin.Analog) {
        analogArray.push(...pin.Analog);
      }
    }

    const mergedPin: PinType = {
      ...firstPin,
      name: nameArray.join("/"),
      selectLabel: selectedPin.selectLabel,
      Digital: digitalArray,
      Analog: analogArray,
      group: true
    };

    result.push(mergedPin);
  }

  pins.value = cloneDeep(result);
}
// #endregion

// #region 核心props、响应式数据
const props = defineProps<{ modelValue: Chip | null }>();
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

// 创建节流函数，500ms间隔，只执行最后一次
const throttledEmit = useThrottleFn((val: ChipInfo) => {
  const data = {
    ...val,
    pins: val.pins.map((pin) => ({
      Name: pin.name,
      Digital: pin.Digital,
      Analog: pin.Analog,
      Io: pin.Io,
      Fail: pin.Fail,
      Type: pin.Type,
      selectLabel: pin.selectLabel,
      sortValue: pin.sortValue
    }))
  };

  emit("update:modelValue", data);
}, 500);

watch(
  () => chipInfo.value,
  (val) => {
    if (val) {
      throttledEmit(val);
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
      ...pin,
      name: pin.Name,
      conflict: false,
      group: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      side: ""
    }))
  };

  // 创建pins
  createPins();
};

watch(
  () => props.modelValue?.name,
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

  // 遍历所有引脚，根据 sortValue 计算位置
  for (const pin of pinsArr) {
    const sortValueNum = Number(pin.sortValue) || 0;
    if (sortValueNum === 0) continue;

    // 物理位置（从 0 开始）
    const pos = sortValueNum - 1;
    // 边索引
    const sideIdx = Math.floor(pos / N);
    // 边上的位置
    const posInSide = pos % N;

    pin.side = sidesOrdered[sideIdx];

    const side = pin.side;
    if (side === "bottom") {
      pin.x = chipX + posInSide * pinLong;
      pin.y = chipY + chipSize;
      pin.width = pinLong;
      pin.height = pinShort;
    } else if (side === "right") {
      pin.x = chipX + chipSize;
      pin.y = chipY + chipSize - (posInSide + 1) * pinLong;
      pin.width = pinShort;
      pin.height = pinLong;
    } else if (side === "top") {
      pin.x = chipX + chipSize - (posInSide + 1) * pinLong;
      pin.y = chipY - pinShort;
      pin.width = pinLong;
      pin.height = pinShort;
    } else if (side === "left") {
      pin.x = chipX - pinShort;
      pin.y = chipY + posInSide * pinLong;
      pin.width = pinShort;
      pin.height = pinLong;
    }
  }

  // 同步更新pins中组合引脚的位置信息 - 使用Map优化性能
  const sortValueMap = new Map();
  pinsArr.forEach((pin) => sortValueMap.set(pin.sortValue.toString(), pin));

  pins.value.forEach((pin) => {
    const originalPin = sortValueMap.get(pin.sortValue.toString());
    if (originalPin) {
      pin.x = originalPin.x;
      pin.y = originalPin.y;
      pin.width = originalPin.width;
      pin.height = originalPin.height;
      pin.side = originalPin.side;
    }
  });
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
  const pin = pins.value[dropdown.index];

  if (!pin) return [];
  const type = (pin.Type || "").toUpperCase();
  const options: any[] = [];

  // 获取原始引脚组（用于生成带前缀的选项）
  const originalPins = chipInfo.value?.pins.filter((p) => p.sortValue === pin.sortValue) || [];

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
      label: (name: string) => `${name}.EXTI${name.replace(/\D/g, "")}`
    }
  ];

  // 为每个原始引脚生成Common选项
  for (const originalPin of originalPins) {
    for (const opt of COMMON_OPTIONS) {
      if (opt.show(type)) {
        options.push({
          label: opt.label(originalPin.name),
          type: "common"
        });
      }
    }
  }

  // 为每个原始引脚生成Digital选项
  for (const originalPin of originalPins) {
    const digital = Array.isArray(originalPin.Digital) ? originalPin.Digital : [];
    digital
      .filter((item: string) => item && item.length > 1)
      .forEach((item: string) => {
        // 只显示功能名，不显示前缀
        const label = item.replace(/_/g, ".");
        options.push({
          label,
          type: "digital"
        });
      });
  }

  // 为每个原始引脚生成Analog选项
  for (const originalPin of originalPins) {
    const analog = Array.isArray(originalPin.Analog) ? originalPin.Analog : [];
    analog
      .filter((item: string) => item && item.length > 1)
      .forEach((item: string) => {
        // 只显示功能名，不显示前缀
        const label = item.replace(/_/g, ".");
        options.push({
          label,
          type: "analog"
        });
      });
  }

  return options;
});
// #endregion

// #region showDropdown、下拉弹窗定位逻辑
function showDropdown(data: any): void {
  if (!data) {
    hideDropdown();
    return;
  }
  dropdown.visible = true;
  dropdown.index = data.sortValue - 1;
  const pin = data;
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
  selectedPins.value = selectedPins.value.map((_, i) => i === data.sortValue - 1);
}

function onPinSelectChange(val: string): void {
  const currentPin = pins.value[dropdown.index];
  if (!currentPin) return;

  // 更新pins中的selectLabel（展示数据）
  currentPin.selectLabel = val;
  // 同步更新chipInfo中对应的原始引脚
  updateChipInfoFromPins(currentPin, val);
  commit();
  checkConflict();
}

// 新增函数：根据pins的变化更新chipInfo
function updateChipInfoFromPins(currentPin: any, val: string): void {
  if (!chipInfo.value) return;

  // 获取原始引脚组
  const originalPins = chipInfo.value.pins.filter((p) => p.sortValue === currentPin.sortValue);

  if (originalPins.length === 1) {
    // 单个引脚，直接更新
    originalPins[0].selectLabel = val;
  } else {
    // 组合引脚，需要找到对应的逻辑引脚
    // 检查是否为Common功能（Reset, Input, Output, EXTI）
    const isCommonFunction =
      val.includes("Reset") || val.includes("Input") || val.includes("Output") || val.includes("EXTI");

    // 先清除该物理引脚下所有逻辑引脚的selectLabel
    originalPins.forEach((pin) => {
      pin.selectLabel = "";
    });

    if (isCommonFunction) {
      // Common功能，提取引脚名前缀
      const pinNameMatch = val.match(/^([^.]+)\./);
      if (pinNameMatch) {
        const targetPinName = pinNameMatch[1];
        const targetPin = originalPins.find((p) => p.name === targetPinName);
        if (targetPin) {
          targetPin.selectLabel = val;
        }
      }
    } else {
      // Digital/Analog功能，遍历所有原始引脚找到包含此功能的引脚
      let foundPin = null;
      for (const pin of originalPins) {
        const digital = Array.isArray(pin.Digital) ? pin.Digital : [];
        const analog = Array.isArray(pin.Analog) ? pin.Analog : [];

        // 检查Digital功能 - 完全相等匹配
        const digitalMatch = digital.some((d) => d.replace(/_/g, ".") === val);
        // 检查Analog功能 - 完全相等匹配
        const analogMatch = analog.some((a) => a.replace(/_/g, ".") === val);

        if (digitalMatch || analogMatch) {
          foundPin = pin;
          break;
        }
      }

      if (foundPin) {
        foundPin.selectLabel = val;
      } else {
        // 如果还是找不到，更新第一个引脚（fallback）
        originalPins[0].selectLabel = val;
      }
    }
  }
}

function hideDropdown(): void {
  dropdown.visible = false;
  selectedPins.value = Array(pinCount.value).fill(false);
}
// #endregion

// #region 引脚冲突检测
function checkConflict(): void {
  // 重置所有conflict
  pins.value.forEach((pin) => {
    pin.conflict = false;
  });

  // 使用Map统计冲突 - O(n)复杂度优化
  const conflictMap = new Map<string, number[]>();

  pins.value.forEach((pin, index) => {
    if (!pin.selectLabel) return;

    const key = pin.selectLabel.includes("EXTI") ? getDotContent(pin.selectLabel) : pin.selectLabel;

    if (!conflictMap.has(key)) {
      conflictMap.set(key, []);
    }
    conflictMap.get(key)!.push(index);
  });

  // 只处理有冲突的组
  conflictMap.forEach((indices) => {
    if (indices.length > 1) {
      indices.forEach((index) => (pins.value[index].conflict = true));
    }
  });
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
      // 同步更新chipInfo
      updateChipInfoFromPins(pin, data.newLabel);
      commit();
      checkConflict();
    }
  });
  // 清除所有冲突
  eventBus.on("clear:all:conflicts", () => {
    pins.value.forEach((pin) => {
      if (pin.conflict) {
        pin.selectLabel = "";
        // 同步更新chipInfo
        updateChipInfoFromPins(pin, "");
      }
    });
    commit();
    checkConflict();
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
const { undo, redo, commit, canUndo, canRedo, clear } = useManualRefHistory(pins, {
  clone: (v) => cloneDeep(v)
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

<style scoped></style>
