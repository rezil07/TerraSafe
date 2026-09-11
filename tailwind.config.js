/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#02070B',
        'void-solid': '#000000',
        panel: '#06131A',
        cyan: {
          DEFAULT: '#00F5FF',
          dim: '#0A3A40',
        },
        paper: '#F5F7FA',
        fog: '#8FA3AD',
        risk: {
          low: '#00F5FF',
          medium: '#FFB020',
          high: '#FF6A3D',
          critical: '#FF3B30',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        panel: '12px',
      },
    },
  },
  plugins: [],
};
