import "./scss/styles.scss";

import App from "./App.vue";
import { createApp } from "vue";
/** 加载插件 */
import loadPlugins from "@/plugin";

const app = createApp(App);

loadPlugins(app);

app.mount("#app");
