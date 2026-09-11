import { defineConfig } from '@vegasjs/vegas/client'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
})
