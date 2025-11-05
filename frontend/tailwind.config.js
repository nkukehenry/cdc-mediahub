/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Brand Colors
        'au-green': '#348F41',
        'au-corporate-green': '#1A5632',
        'au-red': '#9F2241',
        'au-gold': '#B4A269',
        'au-white': '#FFFFFF',
        'au-grey-text': '#58595B',
        // Aliases for easier usage
        brand: {
          green: '#348F41',
          'corporate-green': '#1A5632',
          red: '#9F2241',
          gold: '#B4A269',
          white: '#FFFFFF',
          grey: '#58595B',
        },
      },
    },
  },
  plugins: [],
}
