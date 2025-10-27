<template>
  <div class="overflow-auto pb-3 px-2 bg-primary-50 h-full rounded-b-lg shadow-inner">
    <div class="flex items-center gap-1 mb-3 pt-2">
      <button
        class="w-8 h-8 flex items-center justify-center transition border-primary-200 text-primary hover:bg-primary-100"
        @click="toggleMode"
        :title="mode === 'register' ? $t('common.switchToRegisterMode') : $t('common.switchToModuleMode')"
      >
        <Transition name="icon-fade-zoom" mode="out-in">
          <component :is="mode === 'register' ? Puzzle : List" :class="'w-5 h-5'" :key="mode" />
        </Transition>
      </button>
      <div class="relative flex-1 items-center">
        <input
          v-model="keyword"
          class="w-full pl-8 pr-3 py-1 border bg-primary-50 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-200 placeholder:text-gray-400"
          type="text"
          :placeholder="$t('common.search')"
        />
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
      </div>
    </div>
    <component :is="mode === 'register' ? renderRegisterModeList : renderModuleModeList" />
    <Modal v-model="showModal">
      <div v-if="descReg">
        <div class="mb-2 text-lg font-bold text-primary">{{ descReg.name }}</div>
        <div class="text-gray-700 text-sm text-left mt-2">{{ descReg.desc }}</div>
      </div>
      <div v-else-if="descMod">
        <div class="mb-2 text-lg font-bold text-primary">{{ descMod.name }}</div>
        <div class="text-gray-700 text-sm text-left mt-2">{{ descMod.desc }}</div>
      </div>
    </Modal>
  </div>
</template>

<script lang="tsx" setup>
// #region imports
import { ref, computed, watch } from "vue";
import { registerModules, RegisterItem, ModuleItem } from "@/mock/register";
import * as LucideIcons from "lucide-vue-next";
import { Info, Plus, Search, ChevronDown, Box, List, Puzzle } from "lucide-vue-next";
import Modal from "@/components/Modal/index.vue";
import { eventBus } from "@/hooks/eventBus";
import { h } from "vue";

// #endregion

// #region icon 处理
function resolveLucideIcon(name: string): any {
  return LucideIcons[name as keyof typeof LucideIcons] || Box;
}
// #endregion

// #region 寄存器卡片组件 (JSX)
const RegisterItemCard = (props: {
  reg: RegisterItem;
  onInfoClick: (reg: RegisterItem) => void;
  onPlusClick: (reg: RegisterItem) => void;
}) => (
  <div class="flex items-center gap-2 bg-white border border-primary-100 rounded-lg px-1 py-2 shadow group hover:shadow-md hover:bg-primary-50 transition">
    {h(resolveLucideIcon(props.reg.icon), { class: "w-5 h-5 text-primary-400 shrink-0" })}
    <span class="font-bold flex-1 text-primary-900 truncate text-sm max-w-[85px]">{props.reg.name}</span>
    <div class="flex items-center gap-1">
      <Info
        class="w-5 h-5 text-primary-400 hover:text-primary-700 cursor-pointer"
        onClick={() => props.onInfoClick(props.reg)}
      />
      <Plus
        class="w-5 h-5 text-primary-400 hover:text-primary-700 cursor-pointer"
        onClick={() => props.onPlusClick(props.reg)}
      />
    </div>
  </div>
);
// #endregion

// #region 切换模式
const mode = ref<"register" | "module">("register");
const toggleMode = () => {
  mode.value = mode.value === "register" ? "module" : "register";
};
// #endregion

// #region 搜索与过滤
const keyword = ref("");
const filteredModules = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return registerModules;
  return registerModules.filter(
    (mod) =>
      mod.name.toLowerCase().includes(kw) ||
      mod.desc.toLowerCase().includes(kw) ||
      mod.registers.some((reg) => reg.name.toLowerCase().includes(kw))
  );
});
// #endregion

// #region 寄存器展开/收起
const expanded = ref<Record<string, boolean>>({});
const toggleExpand = (id: string) => {
  expanded.value[id] = !expanded.value[id];
};
// #endregion

// #region 弹窗控制
const descReg = ref<RegisterItem | null>(null);
const descMod = ref<ModuleItem | null>(null);
const showModal = ref(false);
const showDescReg = (reg: RegisterItem) => {
  descReg.value = reg;
  descMod.value = null;
  showModal.value = true;
};
watch(showModal, (v) => {
  if (!v) {
    descReg.value = null;
    descMod.value = null;
  }
});
// #endregion

// #region 渲染函数（逻辑）
const renderRegisterModeList = () => (
  <>
    {filteredModules.value.map((module) => (
      <div class="mb-3" key={"modg-" + module.id}>
        <div
          class={[
            "flex items-center gap-2 cursor-pointer select-none px-1 py-2 rounded group hover:bg-primary-100 transition border border-transparent hover:border-primary-200 shadow-sm",
            expanded.value[module.id] ? "bg-white border-primary-200" : ""
          ]}
          onClick={() => toggleExpand(module.id)}
        >
          <ChevronDown
            class={[
              "w-5 h-5 text-primary",
              expanded.value[module.id] ? "rotate-0" : "-rotate-90",
              "transition-transform"
            ]}
          />
          <span class="font-bold text-primary-900 text-base truncate max-w-[100px]">{module.name}</span>
        </div>
        {expanded.value[module.id] && (
          <div>
            {module.registers.map((reg) => (
              <div class="mt-1" key={"card-" + reg.id}>
                <RegisterItemCard reg={reg} onInfoClick={showDescReg} onPlusClick={onPlusClick} />
              </div>
            ))}
          </div>
        )}
      </div>
    ))}
  </>
);
const renderModuleModeList = () => (
  <>
    {filteredModules.value.map((module) =>
      module.registers.map((reg) => (
        <div class="mb-1" key={"card-" + reg.id}>
          <RegisterItemCard reg={reg} onInfoClick={showDescReg} onPlusClick={onPlusClick} />
        </div>
      ))
    )}
  </>
);
// #endregion

// #region 用于寄存器卡片 add
const onPlusClick = (reg: RegisterItem) => {
  eventBus.emit("register:add", { id: reg.id, name: reg.name, icon: reg.icon });
};
// #endregion
</script>

<style scoped>
.icon-fade-zoom-enter-active,
.icon-fade-zoom-leave-active {
  transition: opacity 0.22s, transform 0.22s;
}
.icon-fade-zoom-enter-from,
.icon-fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.7) rotate(-30deg);
}
.icon-fade-zoom-enter-to,
.icon-fade-zoom-leave-from {
  opacity: 1;
  transform: scale(1) rotate(0);
}
</style>
