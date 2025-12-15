// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // 1. ADD YOUR DOMAIN HERE
  site: 'https://tim-dscrtdv.com', 
  
  // 2. Base should be '/' since you are at the root of the domain
  base: '/',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },
  devToolbar: {
    enabled: false
  }
});