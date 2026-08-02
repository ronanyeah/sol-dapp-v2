import { defineConfig } from "vite";
import elmPlugin from "@ronanyeah/vite-plugin-elm-2";
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [elmPlugin(), checker({ typescript: true })],
  server: {
    port: 8000,
  },
});
