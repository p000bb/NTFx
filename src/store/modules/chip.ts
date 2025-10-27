import type { ChipInfo } from "@/types/chip";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

// setup
export const useChipStore = defineStore("chip", () => {
  // 设置芯片数据
  const setChip = (name: string, chip: ChipInfo) => {
    useStorage(name, chip);
  };

  // 获取芯片数据
  const getChip = (name: string) => {
    const chip = useStorage<ChipInfo | undefined>(name, undefined);
    return chip.value || null;
  };

  return {
    setChip,
    getChip
  };
});
