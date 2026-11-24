import path from 'node:path'
import process from 'node:process'
import Uni from '@uni-helper/plugin-uni'
import UniLayouts from '@uni-helper/vite-plugin-uni-layouts'
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv } from 'vite'

// unibest 4.4.1: retain generated routes, layouts, manifest and UnoCSS pipeline.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), 'env'))
  return {
    envDir: './env',
    base: env.VITE_APP_PUBLIC_BASE || '/',
    plugins: [
      UniLayouts(),
      UniManifest(),
      UniPages({ exclude: ['**/components/**'], dts: 'src/types/uni-pages.d.ts' }),
      Uni(),
      UnoCSS(),
      AutoImport({
        imports: ['vue', 'uni-app'],
        dts: 'src/types/auto-import.d.ts',
        vueTemplate: true,
      }),
    ],
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { host: '0.0.0.0', port: Number(env.VITE_APP_PORT || 5180), strictPort: true },
    build: { target: 'es2020', sourcemap: false },
  }
})
