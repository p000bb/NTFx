import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

// setup
export const usePinConfigStore = defineStore("pinConfig", () => {
  // 引脚冲突弹窗提醒
  const showConflictAlert = useStorage("showConflictAlert", true);
  // 引脚激活颜色
  const activeColor = useStorage("activeColor", "#90EE90");
  // 引脚冲突颜色
  const conflictColor = useStorage("conflictColor", "#ff0000");
  // 引脚悬浮颜色
  const hoverColor = useStorage("hoverColor", "#BEE6FD");
  // 引脚禁用颜色
  const disabledColor = useStorage("disabledColor", "#87CEFA");
  // 引脚搜索高亮颜色
  const highlightColor = useStorage("highlightColor", "#4d7c0f");
  // 引脚文本颜色
  const textColor = useStorage("textColor", "#334155");

  const setValue = (key: string, value: any) => {
    useStorage(key, value);
  };

  const getValue = (key: string) => {
    return useStorage<any>(key, undefined);
  };

  const getValues = () => {
    return {
      showConflictAlert: showConflictAlert.value,
      activeColor: activeColor.value,
      conflictColor: conflictColor.value,
      hoverColor: hoverColor.value,
      disabledColor: disabledColor.value,
      highlightColor: highlightColor.value,
      textColor: textColor.value
    };
  };

  const setValues = (values: any) => {
    showConflictAlert.value = values.showConflictAlert;
    activeColor.value = values.activeColor;
    conflictColor.value = values.conflictColor;
    hoverColor.value = values.hoverColor;
    disabledColor.value = values.disabledColor;
    highlightColor.value = values.highlightColor;
    textColor.value = values.textColor;
  };

  const resetDefault = () => {
    showConflictAlert.value = true;
    activeColor.value = "#90EE90";
    conflictColor.value = "#ff0000";
    hoverColor.value = "#BEE6FD";
    disabledColor.value = "#87CEFA";
    highlightColor.value = "#4d7c0f";
    textColor.value = "#222";
  };

  return {
    showConflictAlert,
    activeColor,
    conflictColor,
    hoverColor,
    disabledColor,
    highlightColor,
    textColor,
    setValues,
    getValues,
    setValue,
    getValue,
    resetDefault
  };
});
