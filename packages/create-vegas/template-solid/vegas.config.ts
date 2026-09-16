import { defineConfig } from '@vegasjs/vegas'
import solid from 'vite-plugin-solid'

export default defineConfig({
  appsScript: {
    scriptId: '',
    manifest: {},
  },
  plugins: [solid()],
})
