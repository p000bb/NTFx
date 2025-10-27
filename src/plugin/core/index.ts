import { type App } from "vue";
import store from "@/store";
import router from "@/router";

export default function loadI18n(app: App) {
  app.use(store);
  app.use(router);
}
