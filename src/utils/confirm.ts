import { createApp, type App } from "vue";
import Confirm from "@/components/Confirm/index.vue";

interface ConfirmOptions {
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
}

export function confirm(options: ConfirmOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const app: App = createApp(Confirm, {
      visible: true,
      ...options,
      onOk: () => {
        cleanup();
        resolve();
      },
      onCancel: () => {
        cleanup();
        reject();
      }
    });

    function cleanup() {
      app.unmount();
      if (container.parentNode) container.parentNode.removeChild(container);
    }

    app.mount(container);
  });
}
