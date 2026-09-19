import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {
  // Determine base path depending on deployment environment:
  // - Vercel: VERCEL=1 -> '/'
  // - GitHub Pages / GitHub Actions: GITHUB_ACTIONS=true or VITE_BASE_PATH -> '/Attendance/'
  // - Local development / default: '/'
  const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL);
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

  let base = '/';
  if (isVercel) {
    base = '/';
  } else if (process.env.VITE_BASE_PATH) {
    base = process.env.VITE_BASE_PATH.trim();
  } else if (isGitHubPages) {
    base = '/Attendance/';
  } else if (process.env.BASE_PATH) {
    base = process.env.BASE_PATH.trim();
  }

  return {
    base,
    plugins: [
      react(),
      {
        name: 'copy-404-html',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const indexPath = path.join(distDir, 'index.html');
          const notFoundPath = path.join(distDir, '404.html');
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, notFoundPath);
          }
        }
      }
    ],
    server: {
      port: 3000,
      host: true, // Listen on all network addresses (LAN / Wi-Fi)
      open: false,
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || process.env.API_TARGET || 'http://127.0.0.1:5000',
          changeOrigin: true
        }
      }
    }
  };
});


