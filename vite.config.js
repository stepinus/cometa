import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import glsl from "vite-plugin-glslify-inject";
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
  base: "/",
  publicDir: "public",
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    react(),
    glsl({
      include: "./src/**/*.(vert|frag|glsl)",
      exclude: "node_modules/**",
    }),
    viteStaticCopy({
      targets: [
          {
            src: 'node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js',
            dest: 'public'
          },
          {
            src: 'node_modules/@ricky0123/vad-web/dist/silero_vad.onnx',
            dest: 'public'
          },
          {
            src: 'node_modules/onnxruntime-web/dist/*.wasm',
            dest: 'public'
          }
      ]
    })
  ],
  optimizeDeps: {
    exclude: ["@ricky0123/vad-react", "@ricky0123/vad-web", 'onnxruntime-web'],
  },
  server: {
    proxy: {
      '/salute': {
        target: 'https://ngw.devices.sberbank.ru:9443',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/salute/, '/api/v2/oauth')
      },
      '/speech': {
        target: 'https://smartspeech.sber.ru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/speech/, '/rest/v1/speech:recognize')
      },
      '/synthesize': {
        target: 'https://smartspeech.sber.ru',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/synthesize/, '/rest/v1/text:synthesize')
      }
    }
  }
});
