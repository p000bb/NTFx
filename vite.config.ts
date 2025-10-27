import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "tailwindcss";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueSetupExtend from "vite-plugin-vue-setup-extend";
// https://vite.dev/config/
export default defineConfig({
  base: "/", // Vercel 部署使用根路径
  plugins: [vue(), tailwindcss(), vueSetupExtend(), vueJsx()],
  optimizeDeps: {
    include: ["vue", "vue-router", "pinia", "@vueuse/core", "vue-i18n", "lodash-es", "xlsx"]
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer]
    }
  },
  // server: {
  //   hmr: true, // 开启热更新
  //   /** 设置 host: true 才可以使用 Network 的形式，以 IP 访问项目 */
  //   host: true, // host: "0.0.0.0"
  //   /** 端口号 */
  //   port: 3333,
  //   /** 是否自动打开浏览器 */
  //   open: false,
  //   /** 跨域设置允许 */
  //   cors: true,
  //   /** 端口被占用时，是否直接退出 */
  //   strictPort: false
  // },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".vue"]
  }
});
