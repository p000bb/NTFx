import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

// 检测浏览器语言并返回支持的语言
function getBrowserLanguage(): string {
  // 支持的语言列表
  const supportedLanguages = ["zh-CN", "en"];

  // 从浏览器获取语言
  const browserLang = navigator.language || (navigator as any).userLanguage;

  // 精确匹配
  if (supportedLanguages.includes(browserLang)) {
    return browserLang;
  }

  // 截取语言代码前缀（如 zh-CN -> zh，en-US -> en）
  const langPrefix = browserLang.split("-")[0];

  // 匹配前缀
  for (const supported of supportedLanguages) {
    if (supported.startsWith(langPrefix)) {
      return supported;
    }
  }

  // 默认返回中文
  return "zh-CN";
}

// setup
export const useLanguageStore = defineStore("language", () => {
  // 设置语言，检测浏览器语言作为默认值
  const language = useStorage("language", getBrowserLanguage());
  /**
   * 切换语言
   *
   * @param val
   */
  function changeLanguage(val: string) {
    language.value = val;
  }

  return {
    language,
    changeLanguage
  };
});
