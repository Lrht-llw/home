/* eslint-disable no-undef */
import { defineConfig } from "vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default () =>
  defineConfig({
    plugins: [
      vue(),
      AutoImport({
        imports: ["vue"],
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
      viteCompression(),
    ],
    server: {
      port: "3000",
      open: true,
      proxy: {
        "/netease": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/netease/, ""),
        },
      },
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: resolve(__dirname, "src"),
        },
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          charset: false,
          additionalData: `@import "./src/style/global.scss";`,
          silenceDeprecations: ["legacy-js-api", "import"],
        },
      },
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          pure_funcs: ["console.log"],
        },
      },
    },
  });
