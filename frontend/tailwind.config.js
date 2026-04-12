/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:  '#6366f1',
        secondary:'#8b5cf6',
        cyan:     '#06b6d4',
        surface:  '#020817',
        card:     '#0f172a',
        card2:    '#1e293b',
        border:   '#1e293b',
        border2:  '#334155',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
    }
  },
  plugins: []
}
