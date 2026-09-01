import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            // Proxy API requests to the FastAPI backend during development
            '/api': {
                target: process.env.VITE_API_BASE_URL || 'http://backend:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                // Code splitting for better caching
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'editor': ['codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/lang-markdown'],
                    'd3': ['d3'],
                    'fabric': ['fabric'],
                    'query': ['@tanstack/react-query'],
                    'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
    },
});
