import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

// setup
export const useChipConfigStore = defineStore("chipConfig", () => {
  // 芯片比例
  const chipScale = useStorage("chipScale", 1);
  // 字体大小比例
  const fontScale = useStorage("fontScale", 1);
  // 芯片开始方向
  const beginSide = useStorage("beginSide", "left");

  const setValue = (key: string, value: any) => {
    useStorage(key, value);
  };

  const getValue = (key: string) => {
    return useStorage<any>(key, undefined);
  };

  const getValues = () => {
    return {
      chipScale: chipScale.value,
      fontScale: fontScale.value,
      beginSide: beginSide.value
    };
  };

  const setValues = (values: any) => {
    chipScale.value = values.chipScale;
    fontScale.value = values.fontScale;
    beginSide.value = values.beginSide;
  };

  const resetDefault = () => {
    chipScale.value = 1;
    fontScale.value = 1;
    beginSide.value = "left";
  };

  return {
    chipScale,
    fontScale,
    beginSide,
    resetDefault,
    setValues,
    getValues,
    setValue,
    getValue
  };
});
