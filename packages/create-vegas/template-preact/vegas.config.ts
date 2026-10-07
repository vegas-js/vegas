import { defineConfig } from '@vegasjs/vegas'
import preact from '@preact/preset-vite'

export default defineConfig({
  appsScript: {
    scriptId: '',
    manifest: {},
  },
  plugins: [preact()],
})
