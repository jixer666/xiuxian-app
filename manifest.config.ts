import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'

export default defineManifestConfig({
  name: '封天神魔',
  appid: '__UNI__XIUXIAN_MOCK',
  description: '水墨文字修仙',
  versionName: '1.0.0',
  versionCode: '100',
  transformPx: false,
  h5: { title: '封天神魔', router: { mode: 'hash', base: '/' } },
  uniStatistics: { enable: false },
  vueVersion: '3',
})
