<template>
  <div class="overflow-auto pb-3 px-2 bg-primary-50 h-full rounded-b-lg shadow-inner">
    <div class="flex items-center gap-1 mb-3 pt-2">
      <div class="relative flex-1 items-center">
        <input
          v-model="searchKey"
          class="w-full pl-8 pr-3 py-1 border bg-primary-50 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-200 placeholder:text-gray-400"
          type="text"
          :placeholder="$t('common.search')"
        />
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
      </div>
    </div>
    <TransitionGroup name="list" tag="div" class="flex flex-col gap-2 relative">
      <div v-for="item in filteredList" :key="item.id">
        <OutputItemCard :item="item" />
      </div>
    </TransitionGroup>
  </div>
</template>
<script lang="tsx" setup>
// #region imports
import { ref, computed, onMounted, onUnmounted, h } from "vue";
import * as LucideIcons from "lucide-vue-next";
import { Box, Lock, Trash2, Search } from "lucide-vue-next";
import { eventBus } from "@/hooks/eventBus";
import { registerModules } from "@/mock/register";
import { outputRegisterList } from "@/mock/register";
// #endregion

// #region icon 处理
function resolveLucideIcon(name: string): any {
  return LucideIcons[name as keyof typeof LucideIcons] || Box;
}
// #endregion

// #region outputList及事件操作
interface OutputItem {
  id: string;
  name: string;
  icon: string;
  fixed?: boolean;
}
const outputList = ref<OutputItem[]>([...outputRegisterList]);
// 高亮中的寄存器id集合
const highlightedIds = ref<Set<string>>(new Set());
function add(item: OutputItem) {
  // 无论是否存在，都高亮
  highlightedIds.value.add(item.id);
  setTimeout(() => {
    // 能高光多个，3秒后自动移除高亮
    highlightedIds.value.delete(item.id);
  }, 3000);
  if (!outputList.value.find((o) => o.id === item.id)) {
    outputList.value.push({ ...item });
  }
}
function remove(id: string) {
  const idx = outputList.value.findIndex((o) => o.id === id);
  if (idx >= 0 && !outputList.value[idx].fixed) outputList.value.splice(idx, 1);
}

onMounted(() => {
  eventBus.on("register:add", add);
  eventBus.on("register:remove", remove);
});
onUnmounted(() => {
  eventBus.off("register:add", add);
  eventBus.off("register:remove", remove);
});
// #endregion

// #region 搜索与排序过滤
const searchKey = ref("");
const filteredList = computed(() => {
  const kw = searchKey.value.trim().toLowerCase();
  const fixedItems = outputList.value.filter((item) => item.fixed);
  const unorderedNonFixed = outputList.value.filter((item) => !item.fixed);
  // 构建 id => (moduleIdx, regIdx) 排序映射
  const idMap: Record<string, { moduleIdx: number; regIdx: number }> = {};
  registerModules.forEach((mod, moduleIdx) => {
    mod.registers.forEach((reg, regIdx) => {
      idMap[reg.id] = { moduleIdx, regIdx };
    });
  });
  let nonFixed = unorderedNonFixed.map((item) => ({
    ...item,
    meta: idMap[item.id] || { moduleIdx: 9999, regIdx: 9999 }
  }));
  if (kw) {
    // 搜索时两组都过滤
    nonFixed = nonFixed.filter((i) => i.name.toLowerCase().includes(kw) || i.icon.toLowerCase().includes(kw));
    // fixed也过滤
    return [
      ...fixedItems.filter((i) => i.name.toLowerCase().includes(kw) || i.icon.toLowerCase().includes(kw)),
      ...nonFixed.sort((a, b) => a.meta.moduleIdx - b.meta.moduleIdx || a.meta.regIdx - b.meta.regIdx)
    ];
  } else {
    return [
      ...fixedItems,
      ...nonFixed.sort((a, b) => a.meta.moduleIdx - b.meta.moduleIdx || a.meta.regIdx - b.meta.regIdx)
    ];
  }
});
// #endregion

// #region 卡片渲染
const OutputItemCard = (props: { item: OutputItem }) => (
  <div
    class={[
      "flex items-center gap-2 bg-white border border-primary-100 rounded-lg px-1 py-2 shadow hover:shadow-md hover:bg-primary-50",
      highlightedIds.value.has(props.item.id) ? "highlight" : ""
    ]}
  >
    {h(resolveLucideIcon(props.item.icon), { class: "w-5 h-5 text-primary-400 shrink-0" })}
    <span class="font-bold flex-1 text-primary-900 truncate text-sm max-w-[85px]">{props.item.name}</span>
    <div class="flex items-center gap-1">
      {props.item.fixed
        ? h(Lock, { class: "w-5 h-5 text-gray-300 cursor-not-allowed" })
        : h(Trash2, {
            class: "w-5 h-5 text-primary-400 hover:text-red-600 cursor-pointer",
            onClick: () => eventBus.emit("register:remove", props.item.id)
          })}
    </div>
  </div>
);
// #endregion
</script>
<style scoped lang="scss"></style>
