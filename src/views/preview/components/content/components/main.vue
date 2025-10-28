<template>
  <g>
    <!-- 芯片主体 -->
    <rect
      :x="chipX"
      :y="chipY"
      :width="chipSize"
      :height="chipSize"
      fill="#ececec"
      filter="url(#chip-shadow)"
      stroke="#fff"
      stroke-width="2"
    />
    <!-- logo图片放大为芯片尺寸90%并居中，切换语言时强制刷新 -->
    <image
      :key="logoBase64"
      :x="chipX + chipSize / 2 - logoSize / 2"
      :y="chipY + chipSize / 2 - logoSize / 2"
      :width="logoSize"
      :height="logoSize"
      :href="logoBase64"
      style="pointer-events: none"
    />
    <!-- logo小圆点 -->
    <circle :cx="dotPos.cx" :cy="dotPos.cy" :r="dotRadius" fill="#fafbfc" stroke="#ccc" stroke-width="2" />
    <!-- 芯片文字：型号 -->
    <text
      :x="width / 2"
      :y="height / 2 - chipSize * 0.02"
      text-anchor="middle"
      :font-size="modelFontSize"
      fill="#262626"
    >
      {{ chipName }}
    </text>
    <text
      font-weight="bold"
      :x="width / 2"
      :y="height / 2 + chipSize * 0.1"
      text-anchor="middle"
      :font-size="modelFontSize"
      fill="#444"
    >
      {{ chipPackage }}
    </text>
  </g>
</template>

<script lang="ts" setup>
import { useChipConfigStore } from "@/store/modules/chipConfig";
import { useLanguageStore } from "@/store/modules/language";
import { storeToRefs } from "pinia";
import { computed, ref, onMounted, watch } from "vue";

const languageStore = useLanguageStore();

// #region 图片加载函数
function getImageBase64(url: string): Promise<string> {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

const logoBase64 = ref<string>("");

async function updateLogoBase64() {
  const path =
    languageStore.language === "zh-CN"
      ? new URL("@/assets/logo_ZH.png", import.meta.url).href
      : new URL("@/assets/logo_EN.png", import.meta.url).href;
  logoBase64.value = await getImageBase64(path);
}

// #endregion

onMounted(() => {
  updateLogoBase64();
});

watch(() => languageStore.language, updateLogoBase64);

interface MainProps {
  chipX: number;
  chipY: number;
  chipSize: number;
  pinLong: number;
  width: number;
  height: number;
  chipName?: string;
  chipPackage?: string;
}

const { chipX, chipY, chipSize, pinLong, width, height, chipName, chipPackage } = defineProps<
  MainProps & { fontScale?: number; pinCount?: number }
>();
const logoSize = computed(() => chipSize * 0.8);

// 型号字号、封装字号均自适应，根据chipSize变大则字号递减，24脚最大
const modelFontSize = computed(() => Math.pow(chipSize / 5, 0.8));

// #region 芯片参数配置
const chipConfigStore = useChipConfigStore();

const { beginSide } = storeToRefs(chipConfigStore);
// #endregion

// #region 小圆点
const dotRadius = computed(() => Math.max(pinLong, 10) / 2);
const dotOffset = computed(() => 2.5 * dotRadius.value);
const dotPos = computed(() => {
  switch (beginSide.value) {
    case "left":
      return { cx: chipX + dotOffset.value, cy: chipY + dotOffset.value };
    case "bottom":
      return {
        cx: chipX + dotOffset.value,
        cy: chipY + chipSize - dotOffset.value
      };
    case "right":
      return {
        cx: chipX + chipSize - dotOffset.value,
        cy: chipY + chipSize - dotOffset.value
      };
    case "top":
      return {
        cx: chipX + chipSize - dotOffset.value,
        cy: chipY + dotOffset.value
      };
    default:
      return { cx: chipX + dotOffset.value, cy: chipY + dotOffset.value };
  }
});
// #endregion
</script>

<style scoped></style>
