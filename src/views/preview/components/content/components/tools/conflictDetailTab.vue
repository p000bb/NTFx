<template>
  <div class="space-y-4">
    <!-- 没有冲突时 -->
    <div v-if="conflictGroups.length === 0" class="flex flex-col items-center justify-center py-12">
      <div class="text-6xl mb-4">✅</div>
      <p class="text-gray-500 text-lg">{{ $t("tools.noConflicts") }}</p>
    </div>

    <!-- 有冲突时显示详情 -->
    <div v-else class="space-y-4">
      <!-- 冲突统计卡片 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <span class="text-gray-700 font-medium">{{ $t("tools.totalConflicts") }}</span>
          <span class="text-2xl font-bold text-red-600">{{ conflictGroups.length }}</span>
        </div>
      </div>

      <!-- 冲突详情列表 -->
      <TransitionGroup name="list" tag="div" class="space-y-4">
        <div
          v-for="(group, index) in conflictGroups"
          :key="group.reason"
          class="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden"
        >
          <div class="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
            <h3 class="text-white font-semibold flex items-center gap-2">
              <AlertCircle :size="18" />
              {{ $t("tools.conflictGroup") }} #{{ index + 1 }}
            </h3>
          </div>
          <div class="p-4 space-y-3">
            <!-- 显示冲突的引脚 -->
            <div
              v-for="pin in group.pins"
              :key="pin.name"
              class="border-b border-gray-100 last:border-0 pb-2 last:pb-0"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <span class="font-semibold text-gray-900">{{ formatPinLabel(pin.name) }}</span>
                </div>
                <span class="text-sm text-gray-600">{{ formatPinLabel(pin.selectLabel) }}</span>
              </div>
              <!-- 建议的替代方案 -->
              <div v-if="pin.alternatives && pin.alternatives.length > 0" class="mt-2 ml-5">
                <p class="text-xs text-gray-500 mb-1">{{ $t("tools.alternatives") }}:</p>
                <div class="flex flex-wrap gap-2 items-center">
                  <button
                    v-for="alt in pin.showMore ? pin.allAlternatives : pin.alternatives"
                    :key="alt"
                    :class="getButtonClass(alt, pin)"
                    @click="applyAlternative(pin, alt)"
                  >
                    {{ formatPinLabel(alt) }}
                  </button>
                  <button
                    v-if="pin.allAlternatives && pin.allAlternatives.length > 3"
                    class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-1"
                    @click="toggleShowMore(pin)"
                  >
                    {{ pin.showMore ? $t("tools.showLess") : $t("tools.showMore") }}
                    <svg v-if="!pin.showMore" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 冲突原因 -->
            <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
              <p class="text-sm text-amber-800">
                <Info :size="14" class="inline-block mr-1" />
                {{ $t("tools.conflictReason") }}: {{ group.reason }}
              </p>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- 操作按钮 -->
      <div class="flex gap-3 pt-4">
        <button
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
          @click="clearAllConflicts"
        >
          <Trash2 :size="16" class="inline-block mr-2" />
          {{ $t("tools.clearAllConflicts") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AlertCircle, Info, Trash2 } from "lucide-vue-next";
import { eventBus } from "@/hooks/eventBus";
import type { PinType } from "@/types/chip";
import message from "@/utils/message";
import { confirm } from "@/utils/confirm";
import { getExtiSuffix } from "@/utils";
import { useMagicKeys } from "@vueuse/core";
import { formatPinLabel } from "@/utils";

// #region 初始化
const { t, locale } = useI18n();

const pins = ref<PinType[]>([]);
const expandStates = ref<Record<string, boolean>>({});
// #endregion

// #region 数据获取
const getConflictData = async () => {
  eventBus.emit("check:conflict", (data: PinType[]) => {
    pins.value = data;
  });
};
// #endregion

// #region 冲突分析
const conflictGroups = computed(() => {
  expandStates.value; // 依赖触发器

  const conflictPins = pins.value.filter((pin) => pin.conflict);

  if (conflictPins.length === 0) return [];

  // 按冲突原因分组
  const groups: Map<string, { reason: string; pins: any[] }> = new Map();

  conflictPins.forEach((pin) => {
    // 找到与这个引脚冲突的其他引脚
    const conflicts = pins.value.filter((p) => {
      if (p.name === pin.name) return false;
      if (!p.selectLabel) return false;

      const pinSuffix = getExtiSuffix(pin.selectLabel);
      const pSuffix = getExtiSuffix(p.selectLabel);

      if (pinSuffix && pSuffix) {
        return pinSuffix === pSuffix;
      }

      return pin.selectLabel === p.selectLabel;
    });

    // 确定冲突原因
    let reason = "";
    const suffix = getExtiSuffix(pin.selectLabel);
    if (suffix) {
      reason = locale.value === "zh-CN" ? `多个引脚选择了相同的${suffix}` : `Multiple pins selected the same ${suffix}`;
    } else {
      reason =
        locale.value === "zh-CN"
          ? `多个引脚选择了相同的功能：${pin.selectLabel}`
          : `Multiple pins selected the same function: ${pin.selectLabel}`;
    }

    // 添加到组中
    if (!groups.has(reason)) {
      groups.set(reason, { reason, pins: [] });
    }

    // 收集替代方案
    const allAlternatives = getAlternatives(pin);
    const pinKey = `${pin.name}_${reason}`; // 唯一标识
    groups.get(reason)!.pins.push({
      ...pin,
      conflicts,
      alternatives: allAlternatives.slice(0, 3), // 默认只显示3个
      allAlternatives: allAlternatives, // 保留所有替代方案
      showMore: expandStates.value[pinKey] || false, // 控制是否展开显示更多
      pinKey // 保存唯一key用于切换状态
    });
  });

  return Array.from(groups.values());
});
// #endregion

// #region 替代方案获取
const getAlternatives = (pin: PinType): string[] => {
  const alternatives: string[] = [];
  let commonPins: string[] = [];
  if (pin.group) {
    const groupArray = pin.name.split("/");
    groupArray.forEach((item) => {
      commonPins.push(`${item}.Input`, `${item}.Output`, `${item}.EXTI${item.replace(/\D/g, "")}`);
    });
  } else {
    commonPins = [`${pin.name}.Input`, `${pin.name}.Output`, `${pin.name}.EXTI${pin.name.replace(/\D/g, "")}`];
  }
  // 获取该引脚的其他可选项（数字+模拟功能）
  const allOptions = [...commonPins, ...(pin.Digital || []), ...(pin.Analog || [])];

  // 找出与当前选择不同且不与已选冲突的选项
  allOptions.forEach((option) => {
    // 排除当前选择
    if (option === pin.selectLabel) return;

    // 排除Reset选项
    if (option.toLowerCase().includes("reset")) return;

    // 检查这个选项是否会被其他引脚占用（与冲突引脚或其他引脚冲突）
    const isOccupied = pins.value.some((p) => {
      // 跳过自己
      if (p.name === pin.name) return false;
      // 跳过没有选择的引脚
      if (!p.selectLabel) return false;

      const optSuffix = getExtiSuffix(option);
      const pSuffix = getExtiSuffix(p.selectLabel);

      // EXTI类型冲突判断
      if (optSuffix && pSuffix) {
        return optSuffix === pSuffix;
      }

      // 普通功能冲突判断
      return option === p.selectLabel;
    });

    if (!isOccupied) {
      alternatives.push(option);
    }
  });

  return alternatives; // 返回所有符合条件的替代方案
};
// #endregion

// #region UI
const toggleShowMore = (pin: any) => {
  if (!pin.pinKey) return;
  expandStates.value[pin.pinKey] = !expandStates.value[pin.pinKey];
};

const getOptionType = (option: string, pin: PinType): string => {
  // 检查是否为 common 类型（Reset, Input, Output, EXTI）
  if (option.includes(`${pin.name}.`)) {
    return "common";
  }

  // 检查是否为 analog 类型
  if (pin.Analog && pin.Analog.includes(option)) {
    return "analog";
  }

  // 检查是否为 digital 类型
  if (pin.Digital && pin.Digital.includes(option)) {
    return "digital";
  }

  // 默认为 common
  return "common";
};

const baseButtonClass = "px-2 py-1 rounded text-xs border transition-colors bg-white ";

const getButtonClass = (option: string, pin: PinType): string => {
  const type = getOptionType(option, pin);
  // 根据类型返回对应的颜色样式
  const colorStyles: Record<string, string> = {
    common: "text-blue-700 border-blue-200 hover:bg-blue-100",
    digital: "text-green-700 border-green-200 hover:bg-green-100",
    analog: "text-red-700 border-red-200 hover:bg-red-100"
  };

  return `${baseButtonClass} ${colorStyles[type] || "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"}`;
};
// #endregion

// #region 用户操作
const applyAlternative = async (pin: PinType, alternative: string) => {
  try {
    // 构建HTML格式的确认内容
    const content =
      locale.value === "zh-CN"
        ? `确定要将引脚 <span class="text-red-600 font-bold">${formatPinLabel(pin.name)}</span> 的功能从 <span class="text-red-600 font-bold">${formatPinLabel(pin.selectLabel)}</span> 替换为 <span class="text-green-600 font-bold">${formatPinLabel(alternative)}</span> 吗？`
        : `Are you sure you want to replace pin <span class="text-red-600 font-bold">${formatPinLabel(pin.name)}</span> function from <span class="text-red-600 font-bold">${formatPinLabel(pin.selectLabel)}</span> to <span class="text-green-600 font-bold">${formatPinLabel(alternative)}</span>?`;

    await confirm({
      title: t("tools.confirmReplace"),
      content: content,
      okText: t("tools.confirm"),
      cancelText: t("tools.cancel")
    });

    // 通过 eventBus 发送更新指令
    eventBus.emit("pin:update", {
      pinName: pin.name,
      newLabel: alternative
    });

    message.success(t("tools.replaceSuccess", { pinName: pin.name, label: alternative }));

    // 重新获取数据
    setTimeout(() => {
      getConflictData();
    }, 100);
  } catch {
    // 用户取消了操作
  }
};

const clearAllConflicts = async () => {
  try {
    // 构建HTML格式的确认内容
    const content =
      locale.value === "zh-CN"
        ? `确定要清除所有冲突引脚的配置吗？这将清空 <span class="text-red-600 font-bold">${conflictGroups.value.length}</span> 个冲突组中所有引脚的配置。`
        : `Are you sure you want to clear all conflict pin configurations? This will clear <span class="text-red-600 font-bold">${conflictGroups.value.length}</span> conflict groups.`;

    await confirm({
      title: t("tools.confirmClear"),
      content: content,
      okText: t("tools.clearAll"),
      cancelText: t("tools.cancel")
    });

    eventBus.emit("clear:all:conflicts");
    message.success(t("tools.clearSuccess"));

    setTimeout(() => {
      getConflictData();
    }, 100);
  } catch {
    // 用户取消了操作
  }
};
// #endregion

// #region 生命周期
onMounted(() => {
  getConflictData();
});
// #endregion

// #region 快捷键
const keys = useMagicKeys();

watch(keys["ctrl_z"], (v) => {
  if (v) {
    getConflictData();
  }
});

watch(keys["ctrl_y"], (v) => {
  if (v) {
    getConflictData();
  }
});
// #endregion
</script>

<style scoped></style>
