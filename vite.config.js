import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import glsl from "vite-plugin-glslify-inject";
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
  base: "/",
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
          dest: './'
        },
        {
          src: 'public/silero_vad.onnx',
          dest: './'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.*',
          dest: './'
        },
        {
        src: "node_modules/@ricky0123/vad-web/dist/*.onnx",
        dest: "./[name][ext]",
        }
      ]
    })
  ],
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", 'onnxruntime-web'],
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
