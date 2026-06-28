import { defineConfig } from 'vite';

export default defineConfig({
  // base relativa => funciona tanto em servidor quanto aberto em subpasta (GitHub Pages etc.)
  base: './',
  server: {
    host: true, // expõe na rede local pra testar no celular pelo Wi-Fi
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
