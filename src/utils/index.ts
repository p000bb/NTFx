import ChipService from "@/services/chipService";
import { PinsType } from "@/types/chip";

/**
 * 格式化引脚名称
 * @param name 引脚名称
 * @returns 格式化后的引脚名称
 */
export const formatPinLabel = (name: string = ""): string => {
  let result = name;
  const dashIdx = name.indexOf("-");
  // dashIdx 存在且不是最后一位才做裁剪，否则直接返回原名
  if (dashIdx !== -1 && dashIdx < name.length - 1) {
    result = name.slice(dashIdx + 1);
  }
  result = result.replace(/_/g, ".");
  return result;
};

/**
 * 提取 EXTI 后缀
 * @param label 引脚名称
 * @returns EXTI 后缀
 */
export const getExtiSuffix = (label: string = ""): string => {
  const idx = label.indexOf("EXTI");
  return idx >= 0 ? label.slice(idx) : "";
};

/**
 * 获取选中的芯片引脚
 * @returns 选中的芯片引脚
 */
export const getSelectedChipPins = async (): Promise<PinsType[]> => {
  const selectDom = document.querySelector(".select-chip") as HTMLSelectElement;
  const id = Number(selectDom.value);
  const chip = await ChipService.getChipById(id);
  return chip?.pins || [];
};

/**
 * 获取引脚名称中的点内容
 * @param str 引脚名称
 * @returns 点内容
 */
export const getDotContent = (str: string): string => {
  const match = str.match(/[^.]+$/);
  return match ? match[0] : "";
};
