<template>
  <div class="flex gap-2 items-center bg-primary-100">
    <button
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200 group relative focus:outline-none"
    >
      <HelpCircle :size="20" class="text-primary-400" />
      <div
        class="absolute left-1/2 bottom-full z-40 -translate-x-1/2 mb-2 px-4 py-3 rounded-md bg-slate-800 text-white text-sm shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-500"
      >
        <div class="text-left space-y-2">
          <template v-for="line in $t('tools.helpContent').split('\n')">
            <div>{{ line }}</div>
          </template>
        </div>
        <span
          class="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-[8px] border-t-slate-800"
        ></span>
      </div>
    </button>
    <button
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.setting')"
      :title="$t('tools.setting')"
      @click="onSettings"
    >
      <Settings :size="20" class="text-primary-400" />
    </button>
    <button
      v-if="!isFullscreen"
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.fullscreen')"
      :title="$t('tools.fullscreen')"
      @click="onFullscreen"
    >
      <Maximize :size="20" class="text-primary-400" />
    </button>
    <button
      v-else
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.exitfullscreen')"
      :title="$t('tools.exitfullscreen')"
      @click="onExitFullscreen"
    >
      <Minimize :size="20" class="text-primary-400" />
    </button>
    <button
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.download')"
      :title="$t('tools.download')"
      @click="onDownload"
    >
      <Download :size="20" class="text-primary-400" />
    </button>
    <button
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.recover')"
      :title="$t('tools.recover')"
      @click="onRestore"
    >
      <RotateCcw :size="20" class="text-primary-400" />
    </button>
    <button
      class="icon-btn p-1.5 rounded-md flex items-center transition-colors hover:bg-blue-100 active:bg-blue-200"
      :aria-label="$t('tools.information')"
      :title="$t('tools.information')"
      @click="onInformation"
    >
      <BarChart3 :size="20" class="text-primary-400" />
    </button>
    <!-- 设置的弹窗 -->
    <SettingModal ref="settingModalRef" />
    <!-- 下载的弹窗 -->
    <DownloadModal ref="downloadModalRef" :title="$t('tools.download')" />
    <!-- 信息面板（包含统计和冲突详情） -->
    <InformationPanel ref="informationPanelRef" />
  </div>
</template>

<script lang="ts" setup>
import { useFullscreen } from "@vueuse/core";
import { HelpCircle, Settings, Maximize, Minimize, Download, RotateCcw, BarChart3 } from "lucide-vue-next";
import { nextTick, ref, toRef } from "vue";
import SettingModal from "./settingModal.vue";
import DownloadModal from "./downloadModal.vue";
import InformationPanel from "./informationPanel.vue";
import { eventBus } from "@/hooks/eventBus";
import message from "@/utils/message";

//#region 全屏逻辑（VueUse）
const props = defineProps<{ mainEl: HTMLElement | null }>();
const mainElRef = toRef(props, "mainEl");
const { isFullscreen, enter, exit } = useFullscreen(mainElRef);
//#endregion

//#region onSettings
const settingModalRef = ref<InstanceType<typeof SettingModal> | null>(null);
const onSettings = () => {
  settingModalRef.value?.open();
};
//#endregion

//#region onFullscreen
const onFullscreen = () => {
  enter();
};
//#endregion

//#region onExitFullscreen
const onExitFullscreen = () => {
  exit();
};
//#endregion

//#region onDownload
const downloadModalRef = ref<InstanceType<typeof DownloadModal> | null>(null);
const onDownload = async () => {
  const selectDom = document.querySelector(".select-chip") as HTMLSelectElement;
  let conflict = false;
  if (selectDom.value) {
    eventBus.emit("check:conflict", (val) => {
      conflict = val.some((item) => item.conflict);
    });
  }
  if (conflict) {
    message.error("存在冲突的引脚");
  } else {
    onRestore();
    nextTick(() => {
      downloadModalRef.value?.open();
    });
  }
};
//#endregion

//#region onRestore
const onRestore = () => {
  eventBus.emit("restore:chip");
};
//#endregion

//#region onInformation
const informationPanelRef = ref<InstanceType<typeof InformationPanel> | null>(null);
const onInformation = () => {
  informationPanelRef.value?.open();
};
//#endregion
</script>
