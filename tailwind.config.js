/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070b',
          900: '#0c0c12',
          800: '#13131d',
          700: '#1b1b29',
          600: '#262638',
          500: '#3a3a55',
          400: '#5b5b7e',
        },
        volt: { 300: '#cfa6ff', 400: '#b57bff', 500: '#9d4dff', 600: '#7a2ee6', 700: '#5a1fb3' },
        acid: { 300: '#d4ff7a', 400: '#c4ff4d', 500: '#b9ff3b', 600: '#8fd116' },
        ember: { 400: '#ffa24d', 500: '#ff8a1f', 600: '#e06a00' },
        blood: { 400: '#ff6b82', 500: '#ff3d5a' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'DM Sans', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        pixel: ['Silkscreen', '"Space Grotesk"', 'monospace'],
      },
      boxShadow: {
        volt: '0 0 0 1px rgba(157,77,255,.5), 0 0 24px rgba(157,77,255,.35)',
        acid: '0 0 0 1px rgba(185,255,59,.5), 0 0 24px rgba(185,255,59,.3)',
        ember: '0 0 0 1px rgba(255,138,31,.5), 0 0 24px rgba(255,138,31,.3)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.15)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        glow: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
        flicker: { '0%,100%': { opacity: '1' }, '45%': { opacity: '.85' }, '55%': { opacity: '.95' } },
        rise: { '0%': { transform: 'translateY(14px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        hitflash: { '0%': { opacity: '.55' }, '100%': { opacity: '0' } },
      },
      animation: {
        floaty: 'floaty 3.2s ease-in-out infinite',
        pop: 'pop .35s cubic-bezier(.2,.9,.3,1.3) both',
        glow: 'glow 2.4s ease-in-out infinite',
        flicker: 'flicker 3s linear infinite',
        rise: 'rise .45s cubic-bezier(.2,.8,.2,1) both',
        hitflash: 'hitflash .45s ease-out both',
      },
    },
  },
  plugins: [],
}
