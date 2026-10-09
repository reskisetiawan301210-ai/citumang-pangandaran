import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mpa-route-rewrites',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const [pathname, search] = rawUrl.split('?');
          const query = search ? `?${search}` : '';

          if (pathname === '/admin' || pathname === '/admin/') {
            req.url = `/admin/index.html${query}`;
            return next();
          }

          const cleanPath = pathname.replace(/\/$/, '');
          const mpaMap = {
            '/harga': '/harga/index.html',
            '/lokasi': '/lokasi/index.html',
            '/galeri': '/galeri/index.html',
            '/faq': '/faq/index.html',
            '/kebijakan-privasi': '/kebijakan-privasi/index.html',
            '/syarat-ketentuan': '/syarat-ketentuan/index.html',
          };

          if (mpaMap[cleanPath]) {
            req.url = `${mpaMap[cleanPath]}${query}`;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const [pathname, search] = rawUrl.split('?');
          const query = search ? `?${search}` : '';

          if (pathname === '/admin' || pathname === '/admin/') {
            req.url = `/admin/index.html${query}`;
            return next();
          }

          const cleanPath = pathname.replace(/\/$/, '');
          const mpaMap = {
            '/harga': '/harga/index.html',
            '/lokasi': '/lokasi/index.html',
            '/galeri': '/galeri/index.html',
            '/faq': '/faq/index.html',
            '/kebijakan-privasi': '/kebijakan-privasi/index.html',
            '/syarat-ketentuan': '/syarat-ketentuan/index.html',
          };

          if (mpaMap[cleanPath]) {
            req.url = `${mpaMap[cleanPath]}${query}`;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: false
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        harga: resolve(__dirname, 'harga/index.html'),
        lokasi: resolve(__dirname, 'lokasi/index.html'),
        galeri: resolve(__dirname, 'galeri/index.html'),
        faq: resolve(__dirname, 'faq/index.html'),
        kebijakanPrivasi: resolve(__dirname, 'kebijakan-privasi/index.html'),
        syaratKetentuan: resolve(__dirname, 'syarat-ketentuan/index.html'),
        notFound: resolve(__dirname, '404.html'),
        admin: resolve(__dirname, 'admin/index.html')
      }
    }
  }
})
