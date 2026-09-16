import { defineConfig } from '@vegasjs/vegas'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  appsScript: {
    scriptId: '',
    manifest: {},
  },
  plugins: [svelte()],
})
