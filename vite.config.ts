import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function serveCockpitIndex(): Plugin {
  return {
    name: 'serve-cockpit-360-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/cockpit-360/' || req.url === '/cockpit-360') {
          const file = path.resolve(server.config.root, 'public/cockpit-360/index.html')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'text/html')
            res.end(fs.readFileSync(file))
            return
          }
        }
        next()
      })
    },
  }
}

function pagesSpaFallback(): Plugin {
  return {
    name: 'pages-spa-fallback',
    closeBundle() {
      const dist = path.resolve(process.cwd(), 'dist')
      const index = path.join(dist, 'index.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(dist, '404.html'))
        fs.writeFileSync(path.join(dist, '.nojekyll'), '')
      }
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), serveCockpitIndex(), pagesSpaFallback()],
})
