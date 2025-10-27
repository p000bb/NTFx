import { type App } from "vue";

const modules = import.meta.glob("./**/*.ts", { eager: true });

export default function loadPlugins(app: App) {
  Object.values(modules).forEach((value: any) => {
    value.default && value.default(app);
  });
}
