import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    cssInjectedByJsPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react-dom') || id.includes('react/')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('react-router')) {
            return 'vendor-router';
          }
          // Charting library (heavy)
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          // Map libraries (heavy, rarely used on initial load)
          if (id.includes('@vis.gl') || id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'vendor-maps';
          }
          // Supabase SDK
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          // Other UI utilities
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // TanStack Query
          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }
        },
      },
    },
  },
}));
