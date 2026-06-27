export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#080b0f',
        panel: '#10151d',
        line: '#253040',
        steel: '#8da0b8',
        acid: '#b6f24a',
        amber: '#f4b24c',
        verdict: '#35c5c8',
        danger: '#f05f5f'
      },
      boxShadow: {
        edge: '0 18px 60px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
