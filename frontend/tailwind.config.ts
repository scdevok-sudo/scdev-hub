import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 se configura desde CSS (`@theme` en src/index.css).
 * Este archivo queda solo para el content scan y para que herramientas
 * externas (editores, plugins) encuentren la config.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config
