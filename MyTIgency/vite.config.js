import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Preview do app desktop passa a porta livre via PORT (5173 pode estar ocupada).
  server: { port: Number(process.env.PORT) || undefined },
  optimizeDeps: {
    include: ['three'],
  },
})
