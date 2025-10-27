import { type App } from "vue";
import i18n from "@/locales";

export default function loadI18n(app: App) {
  app.use(i18n());
}
