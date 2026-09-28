import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react(),{
    name:'github-pages-static-output',
    generateBundle(){this.emitFile({type:'asset',fileName:'.nojekyll',source:''});},
  }],
  base:'./',
  build:{outDir:'docs',emptyOutDir:true},
});
