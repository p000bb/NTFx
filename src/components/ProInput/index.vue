<template>
  <div class="relative w-full">
    <div
      class="relative flex items-center bg-white border border-gray-300 rounded-md shadow-sm hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-colors"
    >
      <!-- 搜索图标 -->
      <div class="absolute left-3 pointer-events-none">
        <Search :size="16" class="text-gray-400" />
      </div>

      <!-- 输入框 -->
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="placeholder"
        class="w-full pl-10 pr-32 py-2 text-sm bg-transparent border-0 focus:outline-none placeholder:text-gray-400"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <!-- 搜索选项按钮组 -->
      <div class="absolute right-2 flex items-center gap-1 px-1">
        <!-- 区分大小写按钮 -->
        <button
          :class="[
            'flex items-center justify-center w-7 h-7 rounded transition-colors',
            caseSensitive
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          ]"
          :title="caseSensitive ? '区分大小写（已启用）' : '区分大小写'"
          @click="toggleCaseSensitive"
        >
          <CaseSensitiveIcon :size="14" />
        </button>

        <!-- 全字匹配按钮 -->
        <button
          :class="[
            'flex items-center justify-center w-7 h-7 rounded transition-colors',
            wholeWord
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          ]"
          :title="wholeWord ? '全字匹配（已启用）' : '全字匹配'"
          @click="toggleWholeWord"
        >
          <WholeWordIcon :size="14" />
        </button>

        <!-- 正则表达式按钮 -->
        <button
          :class="[
            'flex items-center justify-center w-7 h-7 rounded transition-colors',
            useRegex
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          ]"
          :title="useRegex ? '使用正则表达式（已启用）' : '使用正则表达式'"
          @click="toggleRegex"
        >
          <RegexIcon :size="14" />
        </button>
      </div>
    </div>

    <!-- 状态提示（可选） -->
    <div
      v-if="showStatusHint && (caseSensitive || wholeWord || useRegex)"
      class="mt-1 flex items-center gap-2 text-xs text-gray-500"
    >
      <span v-if="caseSensitive" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">区分大小写</span>
      <span v-if="wholeWord" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">全字匹配</span>
      <span v-if="useRegex" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">正则表达式</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from "vue";
import { Search } from "lucide-vue-next";
import { useDebounceFn } from "@vueuse/core";

// #region Props
interface Props {
  modelValue?: string;
  placeholder?: string;
  showStatusHint?: boolean;
  debounceMs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "搜索...",
  showStatusHint: false,
  debounceMs: 300
});
// #endregion

// #region Emits
const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string, options: SearchOptions];
  input: [value: string];
}>();

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}
// #endregion

// #region 自定义图标组件
interface IconProps {
  size?: number;
}

// 区分大小写图标 (Aa)
const CaseSensitiveIcon = (iconProps: IconProps) => {
  const size = iconProps.size || 14;
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 14 14",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      class: "currentColor"
    },
    [
      h(
        "text",
        {
          x: "2",
          y: "5",
          "font-size": "8",
          "font-weight": "bold",
          fill: "currentColor"
        },
        "A"
      ),
      h(
        "text",
        {
          x: "6.5",
          y: "11",
          "font-size": "8",
          fill: "currentColor"
        },
        "a"
      )
    ]
  );
};

// 全字匹配图标 (ab with underline and bracket)
const WholeWordIcon = (iconProps: IconProps) => {
  const size = iconProps.size || 14;
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 14 14",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      class: "currentColor"
    },
    [
      // "ab" 文本
      h(
        "text",
        {
          x: "3.5",
          y: "8",
          "font-size": "6",
          fill: "currentColor",
          "font-family": "sans-serif"
        },
        "ab"
      ),
      // 下划线
      h("line", {
        x1: "2.5",
        y1: "9.5",
        x2: "7",
        y2: "9.5",
        stroke: "currentColor",
        "stroke-width": "0.7",
        "stroke-linecap": "round"
      }),
      // 左方括号 [
      h("path", {
        d: "M 1 4.5 L 1 10.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      }),
      h("path", {
        d: "M 1 4.5 L 2.5 4.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      }),
      h("path", {
        d: "M 1 10.5 L 2.5 10.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      }),
      // 右方括号 ]
      h("path", {
        d: "M 13 4.5 L 13 10.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      }),
      h("path", {
        d: "M 11.5 4.5 L 13 4.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      }),
      h("path", {
        d: "M 11.5 10.5 L 13 10.5",
        stroke: "currentColor",
        "stroke-width": "1",
        fill: "none",
        "stroke-linecap": "round"
      })
    ]
  );
};

// 正则表达式图标 (*)
const RegexIcon = (iconProps: IconProps) => {
  const size = iconProps.size || 14;
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 14 14",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      class: "currentColor"
    },
    [
      h(
        "text",
        {
          x: "50%",
          y: "50%",
          "font-size": "12",
          "font-weight": "bold",
          fill: "currentColor",
          "text-anchor": "middle",
          "dominant-baseline": "middle"
        },
        "*"
      )
    ]
  );
};
// #endregion

// #region Refs
const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref(props.modelValue);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const useRegex = ref(false);
// #endregion

// #region Computed
const searchOptions = computed<SearchOptions>(() => ({
  caseSensitive: caseSensitive.value,
  wholeWord: wholeWord.value,
  useRegex: useRegex.value
}));
// #endregion

// #region Methods - 使用 lodash-es 和 vueuse
const toggleCaseSensitive = () => {
  caseSensitive.value = !caseSensitive.value;
  handleChange();
};

const toggleWholeWord = () => {
  wholeWord.value = !wholeWord.value;
  handleChange();
};

const toggleRegex = () => {
  useRegex.value = !useRegex.value;
  handleChange();
};

// 防抖处理输入事件
const debouncedEmit = useDebounceFn((value: string) => {
  emit("change", value, searchOptions.value);
}, props.debounceMs);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  emit("update:modelValue", inputValue.value);
  emit("input", inputValue.value);
  debouncedEmit(inputValue.value);
};

const handleChange = () => {
  emit("change", inputValue.value, searchOptions.value);
};

const handleFocus = () => {
  // 聚焦时的处理逻辑（如果需要）
};

const handleBlur = () => {
  // 失焦时的处理逻辑（如果需要）
};
// #endregion

// #region Watch
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue;
    }
  }
);
// #endregion

// #region Expose
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  setCaseSensitive: (value: boolean) => {
    caseSensitive.value = value;
  },
  setWholeWord: (value: boolean) => {
    wholeWord.value = value;
  },
  setUseRegex: (value: boolean) => {
    useRegex.value = value;
  },
  getOptions: () => searchOptions.value
});
// #endregion
</script>

<style scoped>
/* 可以添加自定义样式，如果需要的话 */
</style>
