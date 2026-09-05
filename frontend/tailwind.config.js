/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#FDFBF7',
        cream: {
          50: '#FFFEFA',
          100: '#FDFBF7',
          200: '#F5EFEB',
          300: '#EDE4DC',
          400: '#D6C7B8'
        },
        brutal: {
          yellow: '#FFE600',
          cyan: '#00F0FF',
          pink: '#FF6B8B',
          hotpink: '#FF2A6D',
          lime: '#4EEDA4',
          mint: '#05FFA1',
          purple: '#B537F2',
          lilac: '#D8B4FE',
          orange: '#FF8800',
          tangerine: '#FF9E64',
          blue: '#38BDF8',
          dark: '#000000',
          card: '#FFFFFF',
          border: '#000000'
        }
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px 0px #000000, 0 2px 6px rgba(0, 0, 0, 0.04)',
        'brutal': '3px 3px 0px 0px #000000, 0 6px 16px rgba(0, 0, 0, 0.06)',
        'brutal-lg': '4px 4px 0px 0px #000000, 0 10px 24px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
