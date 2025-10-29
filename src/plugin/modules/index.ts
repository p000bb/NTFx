import { type App } from "vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

export default function loadModules(app: App) {
  // 扩展 dayjs 插件
  dayjs.extend(relativeTime);
}
