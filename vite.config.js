import { defineConfig } from 'vite';

export default defineConfig({
  // Netlify and local development serve from the root. GitHub Pages
  // supplies its repository subpath with the build CLI's --base flag.
  base: '/',
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
});
