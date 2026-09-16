import { defineConfig } from '@vegasjs/vegas/client'
import react from '@vitejs/plugin-react'

export default defineConfig({
  appsScript: {
    scriptId: '',
    manifest: {},
  },
  plugins: [react()],
})
