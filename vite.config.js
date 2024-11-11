import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import glsl from "vite-plugin-glslify-inject"; // https://vitejs.dev/config/
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
          src: 'node_modules/@ricky0123/vad-web/dist/silero_vad.onnx',
          dest: './'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.*',
          dest: './'
        }
        
      ]
    })
  ],
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util",'onnxruntime-web'],
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000/api',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      "@shaders": "/src/shaders/",
    },
  },
});
