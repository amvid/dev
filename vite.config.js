import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs, so the build works on an apex domain or a subpath alike.
  base: "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 0, // keep stars.bin/sky.json as real files, never base64
  },
});
